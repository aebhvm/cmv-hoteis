import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BarChart3, CheckCircle2, Search, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useStock } from '../context/StockContext';
import type { Insumo } from '../types';
import { formatMoney } from '../utils/formatMoney';

const REPORT_TIME_ZONE = 'America/Sao_Paulo';
const TOLERANCE = 1e-8;

type PeriodPreset = 'todos' | 'mes' | '30dias' | 'personalizado';
type StatusFilter = 'todos' | 'com-entrada' | 'sem-entrada' | 'consumo-maior' | 'saldo-positivo' | 'equilibrado';

type ReconciliationRow = {
  insumoId: string;
  nome: string;
  unidadeMedida: Insumo['unidadeMedida'];
  entradaQuantidade: number;
  entradaValor: number;
  consumoQuantidade: number;
  consumoValor: number;
  estoqueAtual: number;
};

const normalizeSearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const dateParts = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  return {
    year: parts.find(part => part.type === 'year')?.value || '',
    month: parts.find(part => part.type === 'month')?.value || '',
    day: parts.find(part => part.type === 'day')?.value || '',
  };
};

const toDateKey = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = dateParts(date);
  return parts.year && parts.month && parts.day ? `${parts.year}-${parts.month}-${parts.day}` : '';
};

const getTodayKey = () => {
  const parts = dateParts(new Date());
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getDaysAgoKey = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getMonthStartKey = () => {
  const parts = dateParts(new Date());
  return `${parts.year}-${parts.month}-01`;
};

const formatQuantity = (value: number) => Number(value || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const getUnitCost = (insumo: Insumo) => {
  if (insumo.valorEmbalagem !== undefined && insumo.conteudoEmbalagem && insumo.conteudoEmbalagem > 0) {
    return insumo.valorEmbalagem / insumo.conteudoEmbalagem;
  }
  return insumo.custoMedio;
};

const getQuantityCost = (insumo: Insumo, quantity: number) => getUnitCost(insumo) * quantity;

const isInRange = (date: string, start: string, end: string) => {
  const key = toDateKey(date);
  if (!key) return false;
  return (!start || key >= start) && (!end || key <= end);
};

const getRowStatus = (row: ReconciliationRow) => {
  if (row.entradaQuantidade <= TOLERANCE && row.consumoQuantidade > TOLERANCE) return 'sem-entrada';
  if (row.entradaQuantidade > TOLERANCE && row.consumoQuantidade > row.entradaQuantidade + TOLERANCE) return 'consumo-maior';
  if (row.entradaQuantidade > row.consumoQuantidade + TOLERANCE) return 'saldo-positivo';
  return 'equilibrado';
};

const getStatusLabel = (row: ReconciliationRow) => {
  switch (getRowStatus(row)) {
    case 'sem-entrada': return 'Vendido sem entrada';
    case 'consumo-maior': return 'Consumo maior';
    case 'saldo-positivo': return 'Entrada maior';
    default: return 'Equilibrado';
  }
};

const getStatusClass = (row: ReconciliationRow) => {
  switch (getRowStatus(row)) {
    case 'sem-entrada':
    case 'consumo-maior':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'saldo-positivo':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const addRow = (rows: Map<string, ReconciliationRow>, insumo: Insumo) => {
  const existing = rows.get(insumo.id);
  if (existing) return existing;
  const row: ReconciliationRow = {
    insumoId: insumo.id,
    nome: insumo.nome,
    unidadeMedida: insumo.unidadeMedida,
    entradaQuantidade: 0,
    entradaValor: 0,
    consumoQuantidade: 0,
    consumoValor: 0,
    estoqueAtual: insumo.estoqueAtual,
  };
  rows.set(insumo.id, row);
  return row;
};

export const EntradasVsVendas: React.FC = () => {
  const { insumos, movimentacoes, vendas, fichas } = useStock();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const period = useMemo(() => {
    if (periodPreset === 'mes') return { start: getMonthStartKey(), end: getTodayKey() };
    if (periodPreset === '30dias') return { start: getDaysAgoKey(29), end: getTodayKey() };
    if (periodPreset === 'personalizado') return { start: startDate, end: endDate };
    return { start: '', end: '' };
  }, [endDate, periodPreset, startDate]);

  const insumosById = useMemo(() => new Map(insumos.map(insumo => [insumo.id, insumo])), [insumos]);
  const fichasById = useMemo(() => new Map(fichas.map(ficha => [ficha.id, ficha])), [fichas]);

  const analysis = useMemo(() => {
    const rows = new Map<string, ReconciliationRow>();
    let entradasCount = 0;
    let vendasCount = 0;
    let receitaTotal = 0;
    let vendasSemFicha = 0;
    let ingredientesSemCadastro = 0;

    movimentacoes.forEach(movimentacao => {
      if (movimentacao.tipo !== 'entrada' || !isInRange(movimentacao.data, period.start, period.end)) return;
      const insumo = insumosById.get(movimentacao.insumoId);
      if (!insumo) return;
      const row = addRow(rows, insumo);
      const quantidade = Math.max(0, Number(movimentacao.quantidade) || 0);
      const valor = Number(movimentacao.custoTotal) || quantidade * (Number(movimentacao.custoUnitario) || getUnitCost(insumo));
      row.entradaQuantidade += quantidade;
      row.entradaValor += valor;
      entradasCount += 1;
    });

    vendas.forEach(venda => {
      if (!isInRange(venda.data, period.start, period.end)) return;
      vendasCount += 1;
      receitaTotal += Number(venda.receitaTotal) || 0;
      const ficha = fichasById.get(venda.fichaId);
      if (!ficha) {
        vendasSemFicha += 1;
        return;
      }

      ficha.ingredientes.forEach(ingrediente => {
        const insumo = insumosById.get(ingrediente.insumoId);
        if (!insumo) {
          ingredientesSemCadastro += 1;
          return;
        }
        const quantidade = (Number(ingrediente.quantidade) || 0) / (ficha.rendimentoPorcoes || 1) * (Number(venda.quantidade) || 0);
        const row = addRow(rows, insumo);
        row.consumoQuantidade += quantidade;
        row.consumoValor += getQuantityCost(insumo, quantidade);
      });
    });

    const allRows = Array.from(rows.values()).map(row => ({
      ...row,
      entradaQuantidade: Number(row.entradaQuantidade.toFixed(6)),
      entradaValor: Number(row.entradaValor.toFixed(2)),
      consumoQuantidade: Number(row.consumoQuantidade.toFixed(6)),
      consumoValor: Number(row.consumoValor.toFixed(2)),
    }));
    const totalEntradaValor = allRows.reduce((total, row) => total + row.entradaValor, 0);
    const totalConsumoValor = allRows.reduce((total, row) => total + row.consumoValor, 0);
    const rowsWithConsumption = allRows.filter(row => row.consumoQuantidade > TOLERANCE).length;
    const rowsWithEntry = allRows.filter(row => row.entradaQuantidade > TOLERANCE).length;

    return {
      rows: allRows,
      entradasCount,
      vendasCount,
      receitaTotal,
      vendasSemFicha,
      ingredientesSemCadastro,
      totalEntradaValor,
      totalConsumoValor,
      rowsWithConsumption,
      rowsWithEntry,
    };
  }, [fichasById, insumosById, movimentacoes, period.end, period.start, vendas]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchTerm);
    return analysis.rows
      .filter(row => {
        if (normalizedSearch && !normalizeSearch(row.nome).includes(normalizedSearch)) return false;
        if (statusFilter !== 'todos' && getRowStatus(row) !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => Math.abs(b.entradaValor - b.consumoValor) - Math.abs(a.entradaValor - a.consumoValor));
  }, [analysis.rows, searchTerm, statusFilter]);

  const saldoValor = analysis.totalEntradaValor - analysis.totalConsumoValor;
  const hasWarnings = analysis.vendasSemFicha > 0 || analysis.ingredientesSemCadastro > 0;

  return (
    <div className="space-y-6" id="entradas-vendas-view">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-navy">
            <BarChart3 className="h-5 w-5" />
            <h2 className="text-xl font-bold text-slate-800">Entradas x Vendas</h2>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
            Cruza as entradas de mercadorias com o consumo teórico das vendas pelas fichas técnicas. Este painel é somente leitura e não altera estoque.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Unidade ativa
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400"><span>Entradas registradas</span><ArrowDownToLine className="h-4 w-4 text-emerald-600" /></div>
          <strong className="mt-2 block font-mono text-xl text-slate-800">R$ {formatMoney(analysis.totalEntradaValor)}</strong>
          <span className="mt-1 block text-[11px] text-slate-500">{analysis.entradasCount} movimentos · {analysis.rowsWithEntry} insumos</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400"><span>Consumo das vendas</span><ArrowUpFromLine className="h-4 w-4 text-brand-navy" /></div>
          <strong className="mt-2 block font-mono text-xl text-slate-800">R$ {formatMoney(analysis.totalConsumoValor)}</strong>
          <span className="mt-1 block text-[11px] text-slate-500">Estimado pelo custo atual · {analysis.rowsWithConsumption} insumos</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400"><span>Saldo financeiro</span>{saldoValor >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-rose-600" />}</div>
          <strong className={`mt-2 block font-mono text-xl ${saldoValor >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>R$ {formatMoney(saldoValor)}</strong>
          <span className="mt-1 block text-[11px] text-slate-500">Entradas menos consumo teórico</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400"><span>Vendas analisadas</span><BarChart3 className="h-4 w-4 text-brand-gold" /></div>
          <strong className="mt-2 block font-mono text-xl text-slate-800">{analysis.vendasCount}</strong>
          <span className="mt-1 block text-[11px] text-slate-500">Receita: R$ {formatMoney(analysis.receitaTotal)}</span>
        </div>
      </div>

      {hasWarnings && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            <strong>Atenção na leitura:</strong> {analysis.vendasSemFicha > 0 && `${analysis.vendasSemFicha} venda(s) estão sem ficha técnica vinculada.`}{analysis.vendasSemFicha > 0 && analysis.ingredientesSemCadastro > 0 ? ' ' : ''}{analysis.ingredientesSemCadastro > 0 && `${analysis.ingredientesSemCadastro} ingrediente(s) não estão cadastrados.`} Esses itens não entram no consumo teórico.
          </p>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Filtros da análise">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><ArrowDownToLine className="h-4 w-4 text-brand-navy" /> Filtros da comparação</div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr_1.5fr]">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Período
            <select value={periodPreset} onChange={event => setPeriodPreset(event.target.value as PeriodPreset)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-brand-navy/10">
              <option value="todos">Todo o histórico</option>
              <option value="mes">Este mês</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="personalizado">Período personalizado</option>
            </select>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Situação
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-brand-navy/10">
              <option value="todos">Todos os insumos</option>
              <option value="saldo-positivo">Entrada maior que consumo</option>
              <option value="consumo-maior">Consumo maior que entrada</option>
              <option value="sem-entrada">Vendido sem entrada</option>
              <option value="equilibrado">Equilibrado</option>
            </select>
          </label>
          <label className="relative text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Buscar insumo
            <Search className="pointer-events-none absolute left-3 top-8 h-4 w-4 text-slate-400" />
            <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Nome do insumo" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-brand-navy/10" />
            {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="absolute right-2 top-7 rounded p-1 text-slate-400 hover:text-slate-700" aria-label="Limpar busca"><X className="h-4 w-4" /></button>}
          </label>
          {periodPreset === 'personalizado' ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">De<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-brand-navy/10" /></label>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Até<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-brand-navy/10" /></label>
            </div>
          ) : <div className="flex items-end text-[11px] text-slate-500">{period.start || period.end ? `${period.start} até ${period.end}` : 'Entradas e vendas de todo o histórico'}</div>}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Tabela de entradas versus vendas">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 p-4">
          <div><h3 className="text-sm font-bold text-slate-800">Conferência por insumo</h3><p className="mt-1 text-[11px] text-slate-500">Quantidade de entrada comparada ao consumo teórico das vendas.</p></div>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">{filteredRows.length} itens exibidos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead><tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Insumo</th><th className="px-4 py-3">Un.</th><th className="px-4 py-3 text-right">Entrada</th><th className="px-4 py-3 text-right">Consumo vendido</th><th className="px-4 py-3 text-right">Diferença</th><th className="px-4 py-3 text-right">Entrada (R$)</th><th className="px-4 py-3 text-right">Consumo est. (R$)</th><th className="px-4 py-3 text-center">Situação</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {filteredRows.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Nenhum insumo encontrado para os filtros selecionados.</td></tr> : filteredRows.map(row => {
                const difference = row.entradaQuantidade - row.consumoQuantidade;
                return <tr key={row.insumoId} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{row.nome}</td><td className="px-4 py-3 font-mono text-slate-400">{row.unidadeMedida}</td><td className="px-4 py-3 text-right font-mono text-emerald-700">{formatQuantity(row.entradaQuantidade)}</td><td className="px-4 py-3 text-right font-mono text-brand-navy">{formatQuantity(row.consumoQuantidade)}</td><td className={`px-4 py-3 text-right font-mono font-bold ${difference >= -TOLERANCE ? 'text-emerald-700' : 'text-rose-700'}`}>{difference >= 0 ? '+' : ''}{formatQuantity(difference)}</td><td className="px-4 py-3 text-right font-mono">R$ {formatMoney(row.entradaValor)}</td><td className="px-4 py-3 text-right font-mono">R$ {formatMoney(row.consumoValor)}</td><td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${getStatusClass(row)}`}>{getStatusLabel(row)}</span></td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
          <strong className="text-slate-700">Como interpretar:</strong> “Consumo vendido” é calculado pelas quantidades das fichas técnicas. O valor do consumo usa o custo atual do insumo; entradas usam o custo registrado em cada movimentação. Saídas manuais, desperdícios e ajustes não entram como venda.
        </div>
      </section>
    </div>
  );
};

