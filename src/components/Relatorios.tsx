import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { 
  BarChart4, 
  Download, 
  Upload, 
  Trash2, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  PieChart, 
  RefreshCw,
  TrendingUp as ShockIcon,
  CheckCircle2,
  Lock
} from 'lucide-react';

export const Relatorios: React.FC = () => {
  const { insumos, vendas, movimentacoes, user, getFichaCusto, fichas, resetData, importarDados, exportarDados } = useStock();
  const isColaborador = user.cargo === 'Colaborador';

  // Estado para simulação de choque de preços de insumos
  const [shockedInsumoId, setShockedInsumoId] = useState('');
  const [shockPercentage, setShockPercentage] = useState('20'); // ex: +20% no custo do insumo

  // Estado do importador
  const [importText, setImportText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  // 1. Cálculos de CMV Geral
  const receitaAcumulada = vendas.reduce((acc, v) => acc + v.receitaTotal, 0);
  const custoTeoricoAcumulado = vendas.reduce((acc, v) => acc + v.custoInsumosTotal, 0);
  
  const totalDesperdicioAcumulado = movimentacoes
    .filter(m => m.tipo === 'desperdicio')
    .reduce((acc, m) => acc + m.custoTotal, 0);

  const totalQuebrasAjustes = movimentacoes
    .filter(m => m.tipo === 'ajuste' && m.quantidade < 0)
    .reduce((acc, m) => acc + Math.abs(m.custoTotal), 0);

  const cmvOperacionalReal = custoTeoricoAcumulado + totalDesperdicioAcumulado + totalQuebrasAjustes;

  // Porcentagens
  const cmvTeoricoPerc = receitaAcumulada > 0 ? (custoTeoricoAcumulado / receitaAcumulada) * 100 : 0;
  const cmvRealPerc = receitaAcumulada > 0 ? (cmvOperacionalReal / receitaAcumulada) * 100 : 0;
  const desperdicioFaturamentoPerc = receitaAcumulada > 0 ? (totalDesperdicioAcumulado / receitaAcumulada) * 100 : 0;

  // 2. Exportar banco de dados como arquivo JSON
  const handleExportData = () => {
    const backupJson = exportarDados();

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(backupJson);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `chefcost-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 3. Importar dados colados
  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isColaborador) return;
    if (!importText) return;

    const success = importarDados(importText);
    if (success) {
      setImportSuccess('Dados importados com sucesso! O sistema foi atualizado.');
      setImportText('');
      setImportError('');
      setShowImportArea(false);
      setTimeout(() => setImportSuccess(''), 4000);
    } else {
      setImportError('Erro na importação. Certifique-se de colar um JSON válido.');
      setImportSuccess('');
    }
  };

  const handleReset = () => {
    if (isColaborador) return;

    if (window.confirm('ATENÇÃO: Isso apagará todas as suas alterações e redefinirá o sistema para os dados de exemplo padrão. Deseja continuar?')) {
      resetData();
      alert('Sistema reinicializado para os valores originais.');
    }
  };

  // 4. Analítica de Simulação de Choque de Preços
  // Retorna receitas afetadas pelo insumo selecionado
  const getFichasAfetadasPeloInsumo = () => {
    if (!shockedInsumoId) return [];

    const ins = insumos.find(i => i.id === shockedInsumoId);
    if (!ins) return [];

    const percMultiplier = 1 + (Number(shockPercentage) / 100);
    const simulatedInsumoCost = ins.custoMedio * percMultiplier;

    return fichas
      .filter(f => f.ingredientes.some(ing => ing.insumoId === shockedInsumoId))
      .map(f => {
        // Calcular o custo normal do prato
        const custoOriginal = getFichaCusto(f);
        
        // Calcular o custo simulado
        let custoSimulado = 0;
        f.ingredientes.forEach(ing => {
          const ingredientInsumo = insumos.find(i => i.id === ing.insumoId);
          if (ingredientInsumo) {
            const costOfIng = ing.insumoId === shockedInsumoId 
              ? ing.quantidade * simulatedInsumoCost 
              : ing.quantidade * ingredientInsumo.custoMedio;
            custoSimulado += costOfIng;
          }
        });
        custoSimulado = Number((custoSimulado / (f.rendimentoPorcoes || 1)).toFixed(2));

        // Calcular FCPs
        const fcpOriginal = f.precoVenda > 0 ? (custoOriginal / f.precoVenda) * 100 : 0;
        const fcpSimulado = f.precoVenda > 0 ? (custoSimulado / f.precoVenda) * 100 : 0;

        return {
          id: f.id,
          nome: f.nome,
          custoOriginal,
          custoSimulado,
          precoVenda: f.precoVenda,
          fcpOriginal,
          fcpSimulado,
          diferencaCusto: custoSimulado - custoOriginal
        };
      });
  };

  const fichasAfetadasSimuladas = getFichasAfetadasPeloInsumo();

  return (
    <div className="space-y-6" id="relatorios-view">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Relatórios & Visão de Custos</h2>
          <p className="text-xs text-slate-500">Audite discrepâncias operacionais, faça simulações de flutuação de custos de mercadoria e administre backups de dados</p>
        </div>
      </div>

      {/* Feedbacks */}
      {importSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
          {importSuccess}
        </div>
      )}

      {importError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 shadow-sm animate-fadeIn">
          <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
          {importError}
        </div>
      )}

      {/* Visão de Auditoria de CMV (Teórico vs Real) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel do CMV Operacional */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <span className="text-[10px] font-bold text-brand-navy uppercase tracking-widest block">Análise Comparativa de Perdas</span>
            <h3 className="text-lg font-black text-slate-800 mt-1">Visão Geral do CMV (Custo de Mercadoria Vendida)</h3>
            <p className="text-xs text-slate-500">Entenda a diferença entre o CMV Teórico de Vendas e o CMV Real incluindo Desperdícios</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CMV Teórico */}
            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase">CMV Teórico de Venda (Limpo)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-800 font-mono">{cmvTeoricoPerc.toFixed(1)}%</span>
                <span className="text-xs text-slate-400 font-mono">de faturamento</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Representa o custo ideal de insumos se as receitas fossem executadas sem desperdícios, perdas ou erros na cozinha.
              </p>
              <div className="border-t border-slate-100 mt-3 pt-2 text-xs font-mono flex justify-between text-slate-600">
                <span>Custo Teórico Acumulado:</span>
                <strong className="text-slate-800 font-bold">R$ {custoTeoricoAcumulado.toFixed(2)}</strong>
              </div>
            </div>

            {/* CMV Real Operacional */}
            <div className="p-4 bg-slate-50/50 rounded-xl border border-rose-200">
              <span className="text-[10px] text-rose-600 font-bold uppercase">CMV Real / Operacional (Com Perdas)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-rose-600 font-mono">{cmvRealPerc.toFixed(1)}%</span>
                <span className="text-xs text-rose-500/80 font-mono">de faturamento</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Representa o custo total real gasto, somando as receitas vendidas com o desperdício físico e quebras apuradas em inventário.
              </p>
              <div className="border-t border-slate-100 mt-3 pt-2 text-xs font-mono flex justify-between text-slate-600">
                <span>Custo Real Acumulado:</span>
                <strong className="text-slate-800 font-bold">R$ {cmvOperacionalReal.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Gráfico Analítico Simples ou Caixa de Informações */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Info className="w-4 h-4 text-brand-navy" />
              Impacto do Desperdício Financeiro
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Do total faturado de <strong className="text-slate-800 font-bold">R$ {receitaAcumulada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, você gastou <strong className="text-slate-800 font-bold">R$ {totalDesperdicioAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> em desperdícios e descarte direto na cozinha. 
              Esse vazamento financeiro consome exatamente <strong className="text-rose-600 font-bold">{desperdicioFaturamentoPerc.toFixed(1)}%</strong> do seu faturamento bruto, reduzindo a sua margem líquida final.
            </p>
          </div>
        </div>

        {/* Simulador Inteligente de Flutuação de Custos (Choque de Preços) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-bold text-brand-navy uppercase tracking-widest block">Simulador de Engenharia de Custo</span>
            <h3 className="text-base font-bold text-slate-800">Flutuação de Preço do Insumo</h3>
            <p className="text-xs text-slate-500">Simule inflação no preço de um ingrediente e veja o impacto instantâneo nas margens do cardápio</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Selecione o Insumo para Simular Choque</label>
              <select
                value={shockedInsumoId}
                onChange={(e) => setShockedInsumoId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs cursor-pointer focus:outline-none"
              >
                <option value="">-- Escolha o Insumo --</option>
                {insumos.map(ins => (
                  <option key={ins.id} value={ins.id}>{ins.nome} (R$ {ins.custoMedio.toFixed(2)}/{ins.unidadeMedida})</option>
                ))}
              </select>
            </div>

            {shockedInsumoId && (
              <>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Flutuação no Preço:</span>
                    <span className="font-bold text-rose-600">+{shockPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={shockPercentage}
                    onChange={(e) => setShockPercentage(e.target.value)}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Pratos Impactados */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold text-slate-800 uppercase block font-semibold">Fichas Técnicas Afetadas:</span>
                  
                  {fichasAfetadasSimuladas.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Nenhum prato utiliza este ingrediente.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {fichasAfetadasSimuladas.map(f => (
                        <div key={f.id} className="p-2.5 bg-slate-50 rounded-lg text-[11px] space-y-1 border border-slate-100">
                          <strong className="text-slate-800 block">{f.nome}</strong>
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>Original: R$ {f.custoOriginal.toFixed(2)} ({f.fcpOriginal.toFixed(0)}%)</span>
                            <span>→ Simulado: R$ {f.custoSimulado.toFixed(2)} ({f.fcpSimulado.toFixed(0)}%)</span>
                          </div>
                          <span className="text-[10px] font-bold text-rose-600 block text-right">
                            CMV Sobe { (f.fcpSimulado - f.fcpOriginal).toFixed(1) }%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Caixa de Configurações, Importação e Exportação (Backup de Segurança) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Administração de Dados & Segurança</span>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Download className="w-4.5 h-4.5 text-brand-navy" />
              Exportar Backup JSON
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Baixe todas as suas receitas, ingredientes e histórico de movimentações em um único arquivo de segurança. Guarde seu banco de dados local.
            </p>
            <button
              onClick={handleExportData}
              className="mt-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-brand-navy border border-slate-200 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              Fazer Download de Segurança
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Upload className="w-4.5 h-4.5 text-brand-navy" />
              Importar Backup JSON
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Restaure um backup anterior colando os dados gerados pelo download de segurança para recompor o estoque.
            </p>
            
            {!isColaborador ? (
              <button
                onClick={() => setShowImportArea(!showImportArea)}
                className="mt-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200 shadow-sm"
              >
                Abrir Caixa de Importação
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-2.5 py-1.5 rounded-lg mt-2">
                <Lock className="w-3.5 h-3.5" />
                <span>Exclusivo do Gestor</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <RefreshCw className="w-4.5 h-4.5 text-brand-navy" />
              Zerar Dados / Fábrica
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Deseja limpar todo o histórico e iniciar o cadastro de ingredientes e fichas técnicas do absoluto zero?
            </p>
            
            {!isColaborador ? (
              <button
                onClick={handleReset}
                className="mt-2 px-4 py-2 bg-slate-50 hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-300 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                Resetar para Padrão de Fábrica
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-2.5 py-1.5 rounded-lg mt-2">
                <Lock className="w-3.5 h-3.5" />
                <span>Exclusivo do Gestor</span>
              </div>
            )}
          </div>
        </div>

        {showImportArea && !isColaborador && (
          <form onSubmit={handleImportSubmit} className="mt-6 border-t border-slate-100 pt-4 space-y-3 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Cole o conteúdo do JSON aqui:</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={5}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                placeholder='{"user": {...}, "insumos": [...]}'
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowImportArea(false); setImportText(''); }}
                className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm"
              >
                Carregar Backup
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
