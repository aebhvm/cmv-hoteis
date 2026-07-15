import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { 
  ClipboardCheck, 
  Search, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  PlayCircle,
  CheckCircle,
  Layers,
  Lock,
  X
} from 'lucide-react';

export const Inventario: React.FC = () => {
  const { insumos, addMovimentacao, user } = useStock();
  const isColaborador = user.cargo === 'Colaborador';

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Estado das contagens físicas inseridas pelo usuário
  const [contagensFisicas, setContagensFisicas] = useState<{ [id: string]: string }>({});
  
  // Estado de feedback de gravação individual
  const [feedbackSalvos, setFeedbackSalvos] = useState<{ [id: string]: 'salvo' | null }>({});

  const categorias = ['Todas', 'Carnes e Peixes', 'Laticínios', 'Hortifruti', 'Secos e Mercearia', 'Bebidas', 'Embalagens'];

  // Valor total teórico do estoque
  const totalValorTeorico = insumos.reduce((acc, ins) => acc + (ins.estoqueAtual * ins.custoMedio), 0);

  // Tratar entrada de contagem física
  const handleContagemChange = (id: string, value: string) => {
    if (isColaborador) return;
    setContagensFisicas(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Ajustar o estoque com base na contagem física informada (Salvar linha a linha)
  const aplicarAjusteIndividual = (id: string) => {
    if (isColaborador) return;

    const ins = insumos.find(i => i.id === id);
    const contagemStr = contagensFisicas[id];
    
    if (!ins || contagemStr === undefined || contagemStr === '') return;

    const contagemVal = Number(contagemStr);
    const discrepancia = contagemVal - ins.estoqueAtual;

    if (discrepancia === 0) {
      // Sem discrepância, limpar contagem digitada
      setContagensFisicas(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      return;
    }

    // Gravar o ajuste (positivo ou negativo)
    addMovimentacao({
      insumoId: id,
      tipo: 'ajuste',
      quantidade: discrepancia, // discrepância (ex: físico 8 - teórico 10 = -2)
      custoUnitario: ins.custoMedio,
      observacao: `Ajuste inventário físico (Diferença: ${discrepancia > 0 ? '+' : ''}${discrepancia.toFixed(2)})`
    });

    // Feedback visual
    setFeedbackSalvos(prev => ({ ...prev, [id]: 'salvo' }));
    
    // Limpar o campo de contagem física
    setContagensFisicas(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    setTimeout(() => {
      setFeedbackSalvos(prev => ({ ...prev, [id]: null }));
    }, 2500);
  };

  // Aplicar todos os ajustes que têm valores digitados
  const ajustarTodos = () => {
    if (isColaborador) return;

    let alterados = 0;
    Object.keys(contagensFisicas).forEach(id => {
      const val = contagensFisicas[id];
      if (val !== '') {
        aplicarAjusteIndividual(id);
        alterados++;
      }
    });
    if (alterados > 0) {
      alert(`${alterados} ajustes de inventário físico gravados com sucesso!`);
    }
  };

  // Filtragem
  const filteredInsumos = insumos.filter(ins => {
    const matchesSearch = ins.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || ins.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6" id="inventario-view">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Auditoria & Inventário Físico</h2>
            {isColaborador && (
              <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-full text-[10px] font-bold flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Apenas Leitura
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Compare o estoque teórico do sistema com a contagem real das prateleiras e ajuste as quebras instantaneamente</p>
        </div>

        {Object.keys(contagensFisicas).length > 0 && !isColaborador && (
          <button
            onClick={ajustarTodos}
            className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
          >
            <ClipboardCheck className="w-4 h-4 stroke-[2]" />
            Confirmar Todos os Ajustes ({Object.keys(contagensFisicas).length})
          </button>
        )}
      </div>

      {/* Informativo de Capital Ativo */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-navy/5 rounded-lg text-brand-navy">
            <Layers className="w-5 h-5 text-brand-gold" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Capital Imobilizado no Estoque Ativo</span>
            <span className="text-lg font-black text-slate-800 font-mono block">
              R$ {totalValorTeorico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        
        {isColaborador ? (
          <div className="text-brand-gold text-xs max-w-sm flex items-center gap-2 bg-brand-gold/5 px-3 py-2 border border-brand-gold/15 rounded-xl">
            <Lock className="w-4 h-4 shrink-0" />
            <span>As permissões de auditoria e ajuste físico estão disponíveis apenas para o Gestor.</span>
          </div>
        ) : (
          <div className="text-slate-500 text-xs max-w-sm">
            💡 <strong>Dica do Chef:</strong> Recomenda-se fazer a contagem física (balanço) semanalmente para evitar quebras silenciosas e desvios de CMV.
          </div>
        )}
      </div>

      {/* Caixa de Busca e Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar insumo para auditar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-10 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpar pesquisa" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700" title="Limpar pesquisa">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-navy/10 font-medium"
        >
          {categorias.map(cat => (
            <option key={cat} value={cat}>{cat === 'Todas' ? 'Todas as Categorias' : cat}</option>
          ))}
        </select>
      </div>

      {/* Folha de Inventário */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="folha-inventario">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Insumo / Categoria</th>
                <th className="py-3.5 px-4 text-right">Estoque Teórico (Sistema)</th>
                <th className="py-3.5 px-4 text-right">Contagem Física Real</th>
                <th className="py-3.5 px-4 text-right">Diferença (Qtd)</th>
                <th className="py-3.5 px-4 text-right">Impacto Financeiro (R$)</th>
                <th className="py-3.5 px-4 text-center">Ações de Ajuste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInsumos.map(ins => {
                const contagemFisicaDig = contagensFisicas[ins.id] || '';
                const temDigitacao = contagemFisicaDig !== '';
                
                const valFisico = temDigitacao ? Number(contagemFisicaDig) : ins.estoqueAtual;
                const discrepancia = valFisico - ins.estoqueAtual;
                const impactoFinanceiro = discrepancia * ins.custoMedio;

                const hasFeedback = feedbackSalvos[ins.id] === 'salvo';

                return (
                  <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <strong className="text-slate-800 block text-sm">{ins.nome}</strong>
                        <span className="text-[10px] text-slate-400">{ins.categoria}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-600">
                      {ins.estoqueAtual.toFixed(2)} <span className="text-[10px] text-slate-400 uppercase">{ins.unidadeMedida}</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        <div className="relative w-28">
                          <input
                            type="number"
                            step="any"
                            placeholder={isColaborador ? "Restrito" : "Contagem"}
                            disabled={isColaborador}
                            value={contagemFisicaDig}
                            onChange={(e) => handleContagemChange(ins.id, e.target.value)}
                            className={`w-full text-right pr-9 pl-3 py-1 bg-white border rounded-lg text-slate-850 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 ${
                              isColaborador 
                                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                                : temDigitacao 
                                  ? 'border-brand-navy bg-brand-navy/5' 
                                  : 'border-slate-200'
                            }`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] uppercase font-bold text-slate-400">
                            {ins.unidadeMedida}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {temDigitacao ? (
                        discrepancia === 0 ? (
                          <span className="text-emerald-600">0.00</span>
                        ) : (
                          <span className={discrepancia > 0 ? 'text-emerald-600' : 'text-rose-600 font-bold'}>
                            {discrepancia > 0 ? '+' : ''}{discrepancia.toFixed(2)}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {temDigitacao ? (
                        discrepancia === 0 ? (
                          <span className="text-slate-400">R$ 0,00</span>
                        ) : (
                          <span className={discrepancia > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            R$ {impactoFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isColaborador ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                          <Lock className="w-3 h-3" />
                          Bloqueado
                        </span>
                      ) : hasFeedback ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 animate-fadeIn">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Ajustado
                        </span>
                      ) : (
                        <button
                          disabled={!temDigitacao}
                          onClick={() => aplicarAjusteIndividual(ins.id)}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-colors ${
                            temDigitacao 
                              ? 'bg-brand-navy hover:bg-brand-navy/90 text-white shadow-sm' 
                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          }`}
                        >
                          Salvar Ajuste
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
