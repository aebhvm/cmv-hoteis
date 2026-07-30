import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Edit3,
  Package,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Utensilio } from '../types';
import writeExcelFile from 'write-excel-file/browser';

const categories = ['Copos', 'Talheres', 'Pratos', 'Travessas', 'Outros'];

const formatNumber = (value: number) => value.toLocaleString('pt-BR', {
  maximumFractionDigits: 2
});

const formatDate = (value?: string) => value
  ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  : 'Ainda não contado';

type FormState = {
  nome: string;
  categoria: string;
  unidadeMedida: 'un' | 'conjunto';
  quantidadeAtual: string;
  estoqueMinimo: string;
};

const emptyForm: FormState = {
  nome: '',
  categoria: 'Copos',
  unidadeMedida: 'un',
  quantidadeAtual: '0',
  estoqueMinimo: '0'
};
type SpreadsheetRow = Record<string, unknown>;
type SpreadsheetCell = string | number | boolean | Date | null;

const toCellValue = (value: unknown): SpreadsheetCell => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) return value;
  return String(value);
};

const createSheet = (name: string, rows: SpreadsheetRow[], headers: string[]) => ({
  sheet: name,
  columns: headers.map(header => ({ width: Math.min(Math.max(header.length + 3, 14), 28) })),
  data: [
    headers.map(value => ({ value, fontWeight: 'bold' as const, backgroundColor: '#EAF0F8' })),
    ...rows.map(row => headers.map(header => ({ value: toCellValue(row[header]) })))
  ]
});
export const Utensilios: React.FC = () => {
  const {
    user,
    currentUnit,
    utensilios,
    movimentacoesUtensilios,
    addUtensilio,
    updateUtensilio,
    deleteUtensilio,
    registrarContagemUtensilio,
    registrarPerdaUtensilio
  } = useStock();
  const isGestor = user.cargo !== 'Colaborador';
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editando, setEditando] = useState<Utensilio | null>(null);
  const [contagemId, setContagemId] = useState('');
  const [contagem, setContagem] = useState('');
  const [contagemObservacao, setContagemObservacao] = useState('');
  const [perdaId, setPerdaId] = useState('');
  const [perda, setPerda] = useState('');
  const [perdaObservacao, setPerdaObservacao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const filteredUtensilios = useMemo(() => utensilios.filter(item => {
    const matchesSearch = item.nome.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase());
    const matchesCategory = categoriaFiltro === 'Todas' || item.categoria === categoriaFiltro;
    return matchesSearch && matchesCategory;
  }), [utensilios, searchTerm, categoriaFiltro]);

  const totalAtual = utensilios.reduce((total, item) => total + item.quantidadeAtual, 0);
  const periodoValido = !dataInicio || !dataFim || dataInicio <= dataFim;
  const historicoFiltrado = useMemo(() => {
    if (!periodoValido) return [];
    return movimentacoesUtensilios.filter(mov => {
      const dia = mov.data.slice(0, 10);
      return (!dataInicio || dia >= dataInicio) && (!dataFim || dia <= dataFim);
    });
  }, [movimentacoesUtensilios, dataInicio, dataFim]);
  const totalContado = historicoFiltrado.filter(mov => mov.tipo === 'contagem').reduce((total, mov) => total + mov.quantidade, 0);
  const totalPerdas = historicoFiltrado.filter(mov => mov.tipo === 'perda').reduce((total, mov) => total + mov.quantidade, 0);
  const itensContados = new Set(historicoFiltrado.filter(mov => mov.tipo === 'contagem').map(mov => mov.utensilioId)).size;

  const notify = (text: string) => {
    setMensagem(text);
    window.setTimeout(() => setMensagem(''), 3000);
  };
  const handleExportExcel = async () => {
    if (!periodoValido) {
      notify('Corrija o periodo antes de exportar.');
      return;
    }
    const periodo = dataInicio || dataFim ? `${dataInicio || 'inicio'}-a-${dataFim || 'fim'}` : 'todos-periodos';
    const date = new Date().toISOString().slice(0, 10);
    const resumoRows = [{
      unidade: currentUnit,
      periodoInicio: dataInicio || 'Todos',
      periodoFim: dataFim || 'Todos',
      utensiliosCadastrados: utensilios.length,
      quantidadeAtual: totalAtual,
      quantidadeContada: totalContado,
      perdasNoPeriodo: totalPerdas,
      movimentacoesNoPeriodo: historicoFiltrado.length
    }];
    const cadastroRows = utensilios.map(item => ({
      id: item.id,
      nome: item.nome,
      categoria: item.categoria,
      unidadeMedida: item.unidadeMedida,
      quantidadeAtual: item.quantidadeAtual,
      quantidadeContada: item.quantidadeContada ?? null,
      perdasAcumuladas: item.perdasAcumuladas,
      estoqueMinimo: item.estoqueMinimo,
      dataUltimaContagem: item.dataUltimaContagem || null
    }));
    const historicoRows = historicoFiltrado.map(mov => ({
      data: mov.data,
      utensilioNome: mov.utensilioNome,
      tipo: mov.tipo === 'perda' ? 'Perda' : 'Contagem',
      quantidade: mov.quantidade,
      observacao: mov.observacao || '',
      unidade: currentUnit
    }));
    try {
      await writeExcelFile([
        createSheet('Resumo', resumoRows, ['unidade', 'periodoInicio', 'periodoFim', 'utensiliosCadastrados', 'quantidadeAtual', 'quantidadeContada', 'perdasNoPeriodo', 'movimentacoesNoPeriodo']),
        createSheet('Cadastro', cadastroRows, ['id', 'nome', 'categoria', 'unidadeMedida', 'quantidadeAtual', 'quantidadeContada', 'perdasAcumuladas', 'estoqueMinimo', 'dataUltimaContagem']),
        createSheet('Historico', historicoRows, ['data', 'utensilioNome', 'tipo', 'quantidade', 'observacao', 'unidade'])
      ]).toFile(`utensilios-${periodo}-${date}.xlsx`);
      notify('Relatorio Excel gerado.');
    } catch {
      notify('Nao foi possivel gerar o relatorio Excel.');
    }
  };

  const submitCadastro = (event: React.FormEvent) => {
    event.preventDefault();
    const nome = form.nome.trim();
    const quantidadeAtual = Number(form.quantidadeAtual);
    const estoqueMinimo = Number(form.estoqueMinimo);
    if (!nome || !Number.isFinite(quantidadeAtual) || quantidadeAtual < 0 || !Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) {
      notify('Preencha nome e quantidades válidas.');
      return;
    }
    addUtensilio({
      nome,
      categoria: form.categoria,
      unidadeMedida: form.unidadeMedida,
      quantidadeAtual,
      estoqueMinimo
    });
    setForm(emptyForm);
    notify('Utensílio cadastrado.');
  };

  const submitEdicao = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editando || !editando.nome.trim()) return;
    updateUtensilio(editando.id, {
      nome: editando.nome.trim(),
      categoria: editando.categoria,
      unidadeMedida: editando.unidadeMedida,
      estoqueMinimo: Math.max(0, Number(editando.estoqueMinimo))
    });
    setEditando(null);
    notify('Utensílio atualizado.');
  };

  const submitContagem = (event: React.FormEvent) => {
    event.preventDefault();
    const result = registrarContagemUtensilio(contagemId, Number(contagem), contagemObservacao.trim());
    if (!result.success) {
      notify(result.error || 'Não foi possível salvar a contagem.');
      return;
    }
    setContagem('');
    setContagemObservacao('');
    notify('Contagem registrada.');
  };

  const submitPerda = (event: React.FormEvent) => {
    event.preventDefault();
    const result = registrarPerdaUtensilio(perdaId, Number(perda), perdaObservacao.trim());
    if (!result.success) {
      notify(result.error || 'Não foi possível registrar a perda.');
      return;
    }
    setPerda('');
    setPerdaObservacao('');
    notify('Perda registrada e quantidade atualizada.');
  };

  const remove = (item: Utensilio) => {
    if (!window.confirm(`Excluir o utensílio "${item.nome}" e seu histórico nesta unidade?`)) return;
    deleteUtensilio(item.id);
    notify('Utensílio excluído.');
  };

  return (
    <div className="space-y-6" id="utensilios-view">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-slate-800">Utensílios</h2>
          <span className="rounded-full border border-brand-navy/10 bg-brand-navy/5 px-2.5 py-0.5 text-[10px] font-bold text-brand-navy">
            {currentUnit}
          </span>
        </div>
        <p className="text-xs text-slate-500">Controle separado do inventário de alimentos.</p>
      </div>

      {mensagem && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800" role="status">
          <Check className="h-4 w-4" />
          {mensagem}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Resumo de utensílios">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Produtos cadastrados</span>
          <strong className="mt-2 block text-2xl font-black text-brand-navy">{utensilios.length}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantidade atual</span>
          <strong className="mt-2 block text-2xl font-black text-slate-800">{formatNumber(totalAtual)}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantidade contada</span>
          <strong className="mt-2 block text-2xl font-black text-emerald-700">{formatNumber(totalContado)}</strong>
          <span className="text-[10px] text-slate-400">{itensContados} item(ns) com contagem</span>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Perdas acumuladas</span>
          <strong className="mt-2 block text-2xl font-black text-rose-700">{formatNumber(totalPerdas)}</strong>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        {isGestor && (
          <form onSubmit={submitCadastro} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-gold" />
              <h3 className="text-sm font-bold text-slate-800">Cadastrar utensílio</h3>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">Nome
                <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Taça de vinho" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-navy/10" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-600">Categoria
                  <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800">
                    {categories.map(category => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-600">Unidade
                  <select value={form.unidadeMedida} onChange={e => setForm({ ...form, unidadeMedida: e.target.value as 'un' | 'conjunto' })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800">
                    <option value="un">Unidade</option>
                    <option value="conjunto">Conjunto</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-600">Quantidade inicial
                  <input required min="0" step="any" type="number" value={form.quantidadeAtual} onChange={e => setForm({ ...form, quantidadeAtual: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800" />
                </label>
                <label className="block text-xs font-semibold text-slate-600">Estoque mínimo
                  <input required min="0" step="any" type="number" value={form.estoqueMinimo} onChange={e => setForm({ ...form, estoqueMinimo: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800" />
                </label>
              </div>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-navy px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-navy/90">
                <Plus className="h-4 w-4" /> Cadastrar
              </button>
            </div>
          </form>
        )}

        <div className={`grid gap-6 ${isGestor ? 'xl:col-span-2' : 'xl:col-span-3'} md:grid-cols-2`}>
          <form onSubmit={submitContagem} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Registrar contagem</h3>
            </div>
            <div className="space-y-3">
              <select required value={contagemId} onChange={e => setContagemId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800">
                <option value="">Selecione o utensílio</option>
                {utensilios.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
              <input required min="0" step="any" type="number" value={contagem} onChange={e => setContagem(e.target.value)} placeholder="Quantidade encontrada" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800" />
              <input value={contagemObservacao} onChange={e => setContagemObservacao(e.target.value)} placeholder="Observação (opcional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800" />
              <button type="submit" disabled={!utensilios.length} className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">Salvar contagem</button>
            </div>
          </form>

          <form onSubmit={submitPerda} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-800">Registrar perda</h3>
            </div>
            <div className="space-y-3">
              <select required value={perdaId} onChange={e => setPerdaId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800">
                <option value="">Selecione o utensílio</option>
                {utensilios.map(item => <option key={item.id} value={item.id}>{item.nome} ({formatNumber(item.quantidadeAtual)} disponíveis)</option>)}
              </select>
              <input required min="0.01" step="any" type="number" value={perda} onChange={e => setPerda(e.target.value)} placeholder="Quantidade perdida" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800" />
              <input value={perdaObservacao} onChange={e => setPerdaObservacao(e.target.value)} placeholder="Motivo (opcional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800" />
              <button type="submit" disabled={!utensilios.length} className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-800 disabled:cursor-not-allowed disabled:opacity-50">Salvar perda</button>
            </div>
          </form>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Inventário de utensílios</h3>
            <span className="text-[10px] text-slate-400">{filteredUtensilios.length} registro(s) nesta unidade</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar utensílio" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-9 text-xs text-slate-800 sm:w-52" />
              {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpar pesquisa" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
            </div>
            <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800">
              <option value="Todas">Todas as categorias</option>
              {categories.map(category => <option key={category}>{category}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Utensílio</th>
                <th className="px-4 py-3 text-right">Atual</th>
                <th className="px-4 py-3 text-right">Última contagem</th>
                <th className="px-4 py-3 text-right">Perdas</th>
                <th className="px-4 py-3 text-right">Mínimo</th>
                {isGestor && <th className="px-4 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUtensilios.map(item => {
                const lowStock = item.quantidadeAtual < item.estoqueMinimo;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <strong className="block text-sm text-slate-800">{item.nome}</strong>
                      <span className="text-[10px] text-slate-400">{item.categoria} · {item.unidadeMedida}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${lowStock ? 'text-rose-600' : 'text-slate-700'}`}>{formatNumber(item.quantidadeAtual)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{item.quantidadeContada === undefined ? '-' : formatNumber(item.quantidadeContada)}<span className="block text-[10px] text-slate-400">{formatDate(item.dataUltimaContagem)}</span></td>
                    <td className="px-4 py-3 text-right font-mono text-rose-700">{formatNumber(item.perdasAcumuladas)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">{formatNumber(item.estoqueMinimo)}</td>
                    {isGestor && <td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => setEditando(item)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-navy" title="Editar utensílio" aria-label={`Editar ${item.nome}`}><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => remove(item)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700" title="Excluir utensílio" aria-label={`Excluir ${item.nome}`}><Trash2 className="h-4 w-4" /></button></div></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredUtensilios.length && <div className="p-10 text-center text-xs text-slate-500">Nenhum utensílio cadastrado nesta unidade.</div>}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-xs font-semibold text-slate-600">Data inicial
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Data final
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800" />
          </label>
          {(dataInicio || dataFim) && <button type="button" onClick={() => { setDataInicio(''); setDataFim(''); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Limpar periodo" aria-label="Limpar periodo"><X className="h-4 w-4" /></button>}
          {!periodoValido && <span className="text-xs font-semibold text-rose-600">A data inicial deve ser anterior a data final.</span>}
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-800">Últimas contagens e perdas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Utensílio</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Quantidade</th><th className="px-4 py-3">Observação</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {historicoFiltrado.map(mov => <tr key={mov.id}><td className="px-4 py-3 text-slate-500">{formatDate(mov.data)}</td><td className="px-4 py-3 font-semibold text-slate-800">{mov.utensilioNome}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${mov.tipo === 'perda' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{mov.tipo === 'perda' ? 'Perda' : 'Contagem'}</span></td><td className="px-4 py-3 text-right font-mono">{formatNumber(mov.quantidade)}</td><td className="px-4 py-3 text-slate-500">{mov.observacao || '-'}</td></tr>)}
            </tbody>
          </table>
          {!historicoFiltrado.length && <div className="p-8 text-center text-xs text-slate-500">Nenhuma movimentação de utensílio registrada.</div>}
        </div>
      </section>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="editar-utensilio-title">
          <form onSubmit={submitEdicao} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="editar-utensilio-title" className="text-sm font-bold text-slate-800">Editar utensílio</h3>
              <button type="button" onClick={() => setEditando(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar edição"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">Nome
                <input required value={editando.nome} onChange={e => setEditando({ ...editando, nome: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-600">Categoria
                  <select value={editando.categoria} onChange={e => setEditando({ ...editando, categoria: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800">{categories.map(category => <option key={category}>{category}</option>)}</select>
                </label>
                <label className="block text-xs font-semibold text-slate-600">Estoque mínimo
                  <input min="0" step="any" type="number" value={editando.estoqueMinimo} onChange={e => setEditando({ ...editando, estoqueMinimo: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800" />
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-600">Unidade
                <select value={editando.unidadeMedida} onChange={e => setEditando({ ...editando, unidadeMedida: e.target.value as 'un' | 'conjunto' })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-800"><option value="un">Unidade</option><option value="conjunto">Conjunto</option></select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditando(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-xs font-bold text-white hover:bg-brand-navy/90">Salvar alterações</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
