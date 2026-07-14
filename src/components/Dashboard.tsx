import React from 'react';
import { useStock } from '../context/StockContext';
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Trash2,
  Percent,
  TrendingDown,
  ChevronRight,
  Package,
  ShoppingBag,
  CalendarClock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { insumos, vendas, movimentacoes, user, getFichaCusto, fichas } = useStock();

  // 1. Valor Total do Estoque Ativo
  const valorTotalEstoque = insumos.reduce((acc, ins) => acc + (ins.estoqueAtual * ins.custoMedio), 0);

  // 2. Alertas de Estoque Mínimo
  const itensAbaixoDoMinimo = insumos.filter(ins => ins.estoqueAtual < ins.estoqueMinimo);
  const quantidadeAlertas = itensAbaixoDoMinimo.length;

  const getExpiryInfo = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const today = new Date();
    const startOfToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const [year, month, day] = expiryDate.split('-').map(Number);
    const days = Math.round((Date.UTC(year, month - 1, day) - startOfToday) / 86400000);
    if (days < 0) return { days, label: `Vencido há ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`, status: 'vencido' };
    if (days === 0) return { days, label: 'Vence hoje', status: 'vencendo' };
    if (days <= 30) return { days, label: `Vence em ${days} dia${days === 1 ? '' : 's'}`, status: 'proximo' };
    return null;
  };
  const alertasValidade = insumos
    .map(insumo => ({ insumo, info: getExpiryInfo(insumo.validade) }))
    .filter((item): item is { insumo: typeof insumos[number]; info: NonNullable<ReturnType<typeof getExpiryInfo>> } => item.info !== null)
    .sort((a, b) => a.info.days - b.info.days);

  // 3. Faturamento Acumulado e CMV das Vendas
  const faturamentoTotal = vendas.reduce((acc, v) => acc + v.receitaTotal, 0);
  const custoInsumosVendas = vendas.reduce((acc, v) => acc + v.custoInsumosTotal, 0);

  // 4. Desperdício Financeiro Registrado
  const desperdicioTotal = movimentacoes
    .filter(m => m.tipo === 'desperdicio')
    .reduce((acc, m) => acc + m.custoTotal, 0);

  // 5. CMV Real / Operacional (Custo das vendas + Desperdícios + Diferenças negativas de inventário)
  // Nota: Movimentações do tipo 'ajuste' com valor negativo também contam como quebra/perda
  const quebrasAjuste = movimentacoes
    .filter(m => m.tipo === 'ajuste' && m.quantidade < 0)
    .reduce((acc, m) => acc + Math.abs(m.custoTotal), 0);

  const cmvOperacionalReal = custoInsumosVendas + desperdicioTotal + quebrasAjuste;
  const cmvTeoricoPorcentagem = faturamentoTotal > 0 ? (custoInsumosVendas / faturamentoTotal) * 100 : 0;
  const cmvRealPorcentagem = faturamentoTotal > 0 ? (cmvOperacionalReal / faturamentoTotal) * 100 : 0;

  // Lucro Bruto Operacional
  const lucroBruto = faturamentoTotal - cmvOperacionalReal;
  const margemLucroBruto = faturamentoTotal > 0 ? (lucroBruto / faturamentoTotal) * 100 : 0;

  // Dados para Gráfico de Pizza: Valor do Estoque por Categoria
  const estoquePorCategoria = insumos.reduce((acc: { [key: string]: number }, ins) => {
    const val = ins.estoqueAtual * ins.custoMedio;
    acc[ins.categoria] = (acc[ins.categoria] || 0) + val;
    return acc;
  }, {});

  const dataGraficoEstoque = Object.keys(estoquePorCategoria).map(cat => ({
    name: cat,
    value: Number(estoquePorCategoria[cat].toFixed(2))
  })).sort((a, b) => b.value - a.value);

  // Cores quentes e sofisticadas para o gráfico de pizza (Variações de brand-navy e brand-gold)
  const CORES_ESTOQUE = ['#162E5B', '#C2A45C', '#1E3E7A', '#D9C180', '#2B5094', '#E8DCB8', '#64748b'];

  // Dados para o Gráfico de Desempenho (Visão Financeira Semanal/Diária Simples)
  // Agrupar vendas por dia para simular histórico
  const vendasAgrupadas = vendas.reduce((acc: { [key: string]: { receita: number; custo: number } }, v) => {
    const dataFormatada = new Date(v.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!acc[dataFormatada]) {
      acc[dataFormatada] = { receita: 0, custo: 0 };
    }
    acc[dataFormatada].receita += v.receitaTotal;
    acc[dataFormatada].custo += v.custoInsumosTotal;
    return acc;
  }, {});

  // Agrupar desperdícios por dia para incluir no gráfico
  const desperdiciosAgrupados = movimentacoes
    .filter(m => m.tipo === 'desperdicio')
    .reduce((acc: { [key: string]: number }, m) => {
      const dataFormatada = new Date(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      acc[dataFormatada] = (acc[dataFormatada] || 0) + m.custoTotal;
      return acc;
    }, {});

  // Mesclar dados diários para o gráfico
  const todasDatas = Array.from(new Set([...Object.keys(vendasAgrupadas), ...Object.keys(desperdiciosAgrupados)])).sort();
  const dataGraficoFinanceiro = todasDatas.map(dt => {
    const v = vendasAgrupadas[dt] || { receita: 0, custo: 0 };
    const d = desperdiciosAgrupados[dt] || 0;
    return {
      data: dt,
      Faturamento: Number(v.receita.toFixed(2)),
      CustoMateriaPrima: Number(v.custo.toFixed(2)),
      Desperdicio: Number(d.toFixed(2)),
      LucroEstoque: Number((v.receita - v.custo - d).toFixed(2))
    };
  });

  // Top Insumos com maior desperdício
  const desperdicioPorInsumo: Record<string, { nome: string; valor: number; qtd: number; un: string }> = movimentacoes
    .filter(m => m.tipo === 'desperdicio')
    .reduce((acc, m) => {
      if (!acc[m.insumoId]) {
        const ins = insumos.find(i => i.id === m.insumoId);
        acc[m.insumoId] = {
          nome: m.insumoNome,
          valor: 0,
          qtd: 0,
          un: ins?.unidadeMedida || ''
        };
      }
      acc[m.insumoId].valor += m.custoTotal;
      acc[m.insumoId].qtd += m.quantidade;
      return acc;
    }, {} as Record<string, { nome: string; valor: number; qtd: number; un: string }>);

  const topDesperdicios = Object.values(desperdicioPorInsumo)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 4);

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Cabeçalho de Boas-vindas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-brand-navy uppercase tracking-widest">Painel Gerencial</span>
          <h2 className="text-2xl font-black text-slate-800 mt-1">{user.estabelecimento}</h2>
          <p className="text-sm text-slate-500 mt-1">
            Olá, <strong className="text-slate-700">{user.nome}</strong>. Acompanhe a eficiência operacional e margens do seu estoque.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200/60">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-slate-600 font-mono">
            Sincronizado: {new Date().toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Grid de KPIs Financeiros e Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-grid">
        {/* Card 1: Valor em Estoque */}
        <div 
          onClick={() => onNavigate('inventario')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-brand-navy transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500">Ativo em Estoque</span>
            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-brand-navy/5 transition-colors">
              <Package className="w-5 h-5 text-brand-navy" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800 font-sans">
              R$ {valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              Soma total de insumos no estoque físico
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </div>

        {/* Card 2: Alertas de Estoque Mínimo */}
        <div 
          onClick={() => onNavigate('insumos')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-brand-navy transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500">Alertas de Estoque</span>
            <div className={`p-2 bg-slate-50 rounded-lg ${quantidadeAlertas > 0 ? 'group-hover:bg-rose-50/70' : ''} transition-colors`}>
              <AlertTriangle className={`w-5 h-5 ${quantidadeAlertas > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800 font-sans">
              {quantidadeAlertas} <span className="text-sm font-normal text-slate-500">itens</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              {quantidadeAlertas > 0 ? 'Existem produtos abaixo do nível mínimo' : 'Todos os níveis de estoque estão normais'}
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </div>

        {/* Card 3: CMV Real / Operacional */}
        <div 
          onClick={() => onNavigate('relatorios')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-brand-navy transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500">CMV Real Operacional</span>
            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-brand-navy/5 transition-colors">
              <Percent className="w-5 h-5 text-brand-navy" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800 font-sans">
              {cmvRealPorcentagem.toFixed(1)}%
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              Meta: {user.metaFCP}% | Teórico (Vendas): {cmvTeoricoPorcentagem.toFixed(1)}%
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </div>

        {/* Card 4: Desperdício Acumulado */}
        <div 
          onClick={() => onNavigate('movimentacoes')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-brand-navy transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500">Total Desperdiçado</span>
            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-rose-50 transition-colors">
              <Trash2 className="w-5 h-5 text-rose-500" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-rose-600 font-sans">
              R$ {desperdicioTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
              Prejuízo direto por perdas e descarte
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </div>
      </div>

      {alertasValidade.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm" id="expiry-alerts">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-600" />
                Alertas de Validade
              </h3>
              <p className="text-xs text-slate-500">Produtos vencidos, que vencem hoje ou nos próximos 30 dias.</p>
            </div>
            <button onClick={() => onNavigate('insumos')} className="text-xs text-brand-navy font-bold cursor-pointer flex items-center gap-1">
              Ver insumos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {alertasValidade.slice(0, 6).map(({ insumo, info }) => (
              <div key={insumo.id} className={`p-3 rounded-lg border ${info.status === 'vencido' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                <span className="font-bold text-sm text-slate-800 block truncate">{insumo.nome}</span>
                <span className={`text-xs font-bold ${info.status === 'vencido' ? 'text-rose-700' : 'text-amber-700'}`}>{info.label}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Validade: {new Date(`${insumo.validade}T00:00:00`).toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta de Desperdício Impactando a Margem */}
      {desperdicioTotal > 0 && cmvRealPorcentagem > user.metaFCP && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3 text-amber-800 text-sm animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-amber-900">Atenção ao Vazamento de Margem!</span>
            Seu CMV Real ({cmvRealPorcentagem.toFixed(1)}%) está acima da meta ({user.metaFCP}%).
            O desperdício acumulado de <strong className="text-slate-900">R$ {desperdicioTotal.toFixed(2)}</strong> e quebras representam {(cmvRealPorcentagem - cmvTeoricoPorcentagem).toFixed(1)}% adicionais de custo operacional. Reduzir as perdas trará sua margem de volta à meta.
          </div>
        </div>
      )}

      {/* Seção de Gráficos de Engenharia de Custo e CMV */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal: Faturamento vs Custos */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Fluxo de Custo & Margem Operacional</h3>
              <p className="text-xs text-slate-500">Comparação diária entre receitas de vendas, CMV Teórico e Desperdícios</p>
            </div>
          </div>

          <div className="h-72 w-full mt-2" id="finance-chart">
            {dataGraficoFinanceiro.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <ShoppingBag className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
                Nenhuma venda registrada para exibir gráficos.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataGraficoFinanceiro} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="data" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                    labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Faturamento" name="Vendas (R$)" fill="#162E5B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="CustoMateriaPrima" name="CMV Teórico (R$)" fill="#C2A45C" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Desperdicio" name="Desperdício (R$)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico de Pizza: Categorias com Mais Capital Imobilizado */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-800">Capital Imobilizado</h3>
            <p className="text-xs text-slate-500">Distribuição do valor de estoque por categoria de insumo</p>
          </div>

          <div className="h-56 w-full relative mt-4">
            {dataGraficoEstoque.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Sem insumos cadastrados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataGraficoEstoque}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dataGraficoEstoque.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_ESTOQUE[index % CORES_ESTOQUE.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {/* Indicador no Centro */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Estoque Total</span>
              <span className="text-lg font-black text-slate-800 font-mono">
                R$ {valorTotalEstoque.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Legendas Simplificadas */}
          <div className="space-y-1.5 mt-2 max-h-24 overflow-y-auto pr-1">
            {dataGraficoEstoque.slice(0, 4).map((item, idx) => (
              <div key={item.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CORES_ESTOQUE[idx % CORES_ESTOQUE.length] }} />
                  <span className="truncate max-w-[140px] font-medium">{item.name}</span>
                </div>
                <span className="font-mono text-slate-500">
                  R$ {item.value.toFixed(0)} ({((item.value / (valorTotalEstoque || 1)) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Inferior: Alertas Críticos de Estoque e Top Desperdícios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lado Esquerdo: Itens Críticos abaixo do Estoque Mínimo */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Necessidade de Compra
              </h3>
              <p className="text-xs text-slate-500">Insumos abaixo do nível de segurança (estoque mínimo)</p>
            </div>
            <button 
              onClick={() => onNavigate('inventario')}
              className="text-xs text-brand-navy hover:text-brand-navy/80 font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              Ver Inventário Completo
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {itensAbaixoDoMinimo.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-bold">✓</div>
                Todos os insumos possuem estoque seguro acima do mínimo.
              </div>
            ) : (
              itensAbaixoDoMinimo.map(ins => {
                const percent = Math.min(100, (ins.estoqueAtual / ins.estoqueMinimo) * 100);
                return (
                  <div key={ins.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <div className="space-y-1">
                      <span className="font-bold text-sm text-slate-800 block">{ins.nome}</span>
                      <span className="text-xs text-slate-500">
                        Estoque Atual: <strong className="text-rose-600 font-mono">{ins.estoqueAtual} {ins.unidadeMedida}</strong> / Mínimo: {ins.estoqueMinimo} {ins.unidadeMedida}
                      </span>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-bold">
                        Déficit
                      </span>
                      {/* Pequena barra de progresso visual */}
                      <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-rose-500 h-1.5 rounded-full" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lado Direito: Top Desperdícios Recentes (Foco do Vazamento) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                Vazamentos de Lucro (Desperdício)
              </h3>
              <p className="text-xs text-slate-500">Insumos que mais causaram perdas financeiras brutas</p>
            </div>
            <button 
              onClick={() => onNavigate('movimentacoes')}
              className="text-xs text-brand-navy hover:text-brand-navy/80 font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              Ver Movimentações
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {topDesperdicios.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-bold">✓</div>
                Nenhum desperdício registrado no período!
              </div>
            ) : (
              topDesperdicios.map((item, idx) => {
                return (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <div className="space-y-1">
                      <span className="font-bold text-sm text-slate-800 block">{item.nome}</span>
                      <span className="text-xs text-slate-500">
                        Total Perdido: <strong className="text-slate-700">{item.qtd.toFixed(1)} {item.un}</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-rose-600 block font-mono">
                        - R$ {item.valor.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Impacto direto no CMV
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
