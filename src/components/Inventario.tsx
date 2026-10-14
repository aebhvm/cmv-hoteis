import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { Insumo, SetorEstoque } from '../types';
import { formatPtBrNumberInput, formatPtBrNumberWhileTyping, parsePtBrNumber } from '../utils/numberInput';
import { 
  ClipboardCheck, 
  Search, 
  AlertTriangle,
  CheckCircle,
  Layers,
  Lock,
  X,
  Edit2,
  Trash2,
  Boxes
} from 'lucide-react';

const SETOR_CAFE: SetorEstoque = 'Café da manhã';
const SETOR_RESTAURANTE: SetorEstoque = 'Restaurante';
const SETOR_TABS = ['Todos', SETOR_CAFE, SETOR_RESTAURANTE] as const;

const getInsumoSetor = (insumo: Insumo): SetorEstoque => {
  if (insumo.setor === SETOR_CAFE || insumo.setor === SETOR_RESTAURANTE) return insumo.setor;
  return insumo.categoria === SETOR_CAFE ? SETOR_CAFE : SETOR_RESTAURANTE;
};

export const Inventario: React.FC = () => {
  const { insumos, addMovimentacao, updateInsumo, deleteInsumo, fichas, user } = useStock();
  const isColaborador = user.cargo === 'Colaborador';

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [setorAtivo, setSetorAtivo] = useState<'Todos' | SetorEstoque>('Todos');
  const [dataAuditoria, setDataAuditoria] = useState(() => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const part = (type: string) => parts.find(item => item.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  });
  const dataAuditoriaIso = /^\d{4}-\d{2}-\d{2}$/.test(dataAuditoria)
    ? new Date(`${dataAuditoria}T12:00:00-03:00`)
    : null;
  const dataAuditoriaValida = dataAuditoriaIso !== null
    && !Number.isNaN(dataAuditoriaIso.getTime())
    && dataAuditoriaIso.toISOString().slice(0, 10) === dataAuditoria;

  // Estado das contagens físicas inseridas pelo usuário
  const [contagensFisicas, setContagensFisicas] = useState<{ [id: string]: string }>({});
  
  // Estado de feedback de gravação individual
  const [feedbackSalvos, setFeedbackSalvos] = useState<{ [id: string]: 'salvo' | null }>({});
  const [editingInsumo, setEditingInsumo] = useState<{
    id: string;
    nome: string;
    categoria: string;
    setor: SetorEstoque;
    unidadeMedida: Insumo['unidadeMedida'];
    valorEmbalagem: string;
    conteudoEmbalagem: string;
    estoqueAtual: string;
    estoqueMinimo: string;
    fornecedor: string;
    validade: string;
    custoMedio: number;
  } | null>(null);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const categorias = ['Todas', 'Carnes e Peixes', 'Laticínios', 'Hortifruti', 'Secos e Mercearia', 'Bebidas', 'Embalagens', 'Picolé', 'Outros'];

  const abrirEdicao = (insumo: Insumo) => {
    if (isColaborador) return;
    setEditError('');
    setEditingInsumo({
      id: insumo.id,
      nome: insumo.nome,
      categoria: categorias.includes(insumo.categoria) ? insumo.categoria : 'Outros',
      setor: getInsumoSetor(insumo),
      unidadeMedida: insumo.unidadeMedida,
      valorEmbalagem: insumo.valorEmbalagem?.toString() || '',
      conteudoEmbalagem: insumo.conteudoEmbalagem?.toString() || '',
      estoqueAtual: insumo.estoqueAtual.toString(),
      estoqueMinimo: insumo.estoqueMinimo.toString(),
      fornecedor: insumo.fornecedor || '',
      validade: insumo.validade || '',
      custoMedio: insumo.custoMedio,
    });
  };

  const salvarEdicao = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingInsumo || isColaborador) return;

    const estoqueAtual = parsePtBrNumber(editingInsumo.estoqueAtual);
    const estoqueMinimo = parsePtBrNumber(editingInsumo.estoqueMinimo);
    const valorEmbalagem = editingInsumo.valorEmbalagem ? parsePtBrNumber(editingInsumo.valorEmbalagem) : undefined;
    const conteudoEmbalagem = editingInsumo.conteudoEmbalagem ? parsePtBrNumber(editingInsumo.conteudoEmbalagem) : undefined;

    if (!editingInsumo.nome.trim() || !Number.isFinite(estoqueAtual) || estoqueAtual < 0 || !Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) {
      setEditError('Preencha nome, estoque atual e estoque mínimo com valores válidos.');
      return;
    }
    if ((valorEmbalagem !== undefined && (!Number.isFinite(valorEmbalagem) || valorEmbalagem < 0)) || (conteudoEmbalagem !== undefined && (!Number.isFinite(conteudoEmbalagem) || conteudoEmbalagem <= 0))) {
      setEditError('Confira o valor e o conteúdo da embalagem.');
      return;
    }

    const custoMedio = valorEmbalagem !== undefined && conteudoEmbalagem !== undefined && conteudoEmbalagem > 0
      ? Math.ceil(((valorEmbalagem / conteudoEmbalagem) - 1e-9) * 100) / 100
      : editingInsumo.custoMedio;

    updateInsumo(editingInsumo.id, {
      nome: editingInsumo.nome.trim(),
      categoria: editingInsumo.categoria,
      setor: editingInsumo.setor,
      unidadeMedida: editingInsumo.unidadeMedida,
      valorEmbalagem,
      conteudoEmbalagem,
      custoMedio,
      estoqueAtual,
      estoqueMinimo,
      fornecedor: editingInsumo.fornecedor.trim() || undefined,
      validade: editingInsumo.validade || undefined,
    });
    setEditingInsumo(null);
    setEditSuccess('Insumo atualizado com sucesso.');
    window.setTimeout(() => setEditSuccess(''), 3000);
  };

  const excluirInsumo = (insumo: Insumo) => {
    if (isColaborador) return;
    const fichasUsando = fichas.filter(ficha => ficha.ingredientes.some(ingrediente => ingrediente.insumoId === insumo.id));
    if (fichasUsando.length > 0) {
      setEditError(`Não é possível excluir ${insumo.nome}: ele está em uso em uma ficha técnica.`);
      window.setTimeout(() => setEditError(''), 5000);
      return;
    }
    if (!window.confirm(`Excluir o insumo "${insumo.nome}"? Esta ação não pode ser desfeita.`)) return;
    if (deleteInsumo(insumo.id)) {
      setEditSuccess('Insumo excluído com sucesso.');
      window.setTimeout(() => setEditSuccess(''), 3000);
    } else {
      setEditError('Não foi possível excluir este insumo.');
      window.setTimeout(() => setEditError(''), 5000);
    }
  };

  // Valor total teórico do estoque
  const insumosDoSetor = setorAtivo === 'Todos' ? insumos : insumos.filter(ins => getInsumoSetor(ins) === setorAtivo);
  const totalValorTeorico = insumosDoSetor.reduce((acc, ins) => acc + (ins.estoqueAtual * ins.custoMedio), 0);

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
    if (isColaborador || !dataAuditoriaValida || !dataAuditoriaIso) return;

    const ins = insumos.find(i => i.id === id);
    const contagemStr = contagensFisicas[id];
    
    if (!ins || contagemStr === undefined || contagemStr === '') return;

    const contagemVal = parsePtBrNumber(contagemStr);
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

    // Gravar a contagem física; a diferença é calculada no contexto de estoque.
    addMovimentacao({
      insumoId: id,
      tipo: 'ajuste',
      data: dataAuditoriaIso.toISOString(),
      quantidade: contagemVal,
      estoqueFisico: contagemVal,
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
    if (isColaborador || !dataAuditoriaValida) return;

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
    const matchesSector = setorAtivo === 'Todos' || getInsumoSetor(ins) === setorAtivo;
    return matchesSearch && matchesCategory && matchesSector;
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
            disabled={!dataAuditoriaValida}
            className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
          >
            <ClipboardCheck className="w-4 h-4 stroke-[2]" />
            Confirmar Todos os Ajustes ({Object.keys(contagensFisicas).length})
          </button>
        )}
      </div>

      {(editSuccess || editError) && (
        <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${editSuccess ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`} role="status">
          {editSuccess || editError}
        </div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Setor dos insumos">
        {SETOR_TABS.map(setor => (
          <button
            key={setor}
            type="button"
            role="tab"
            aria-selected={setorAtivo === setor}
            onClick={() => { setSetorAtivo(setor); setSelectedCategory('Todas'); }}
            className={setorAtivo === setor ? 'whitespace-nowrap border-b-2 border-brand-navy px-4 py-2.5 text-xs font-bold text-brand-navy' : 'whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-xs font-bold text-slate-400 hover:border-slate-300 hover:text-slate-700'}
          >
            {setor}
          </button>
        ))}
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <label htmlFor="data-auditoria" className="block text-xs font-semibold text-slate-700 mb-2">Data da auditoria</label>
        <input
          id="data-auditoria"
          type="date"
          required
          value={dataAuditoria}
          onChange={(e) => setDataAuditoria(e.target.value)}
          aria-invalid={!dataAuditoriaValida}
          aria-describedby="data-auditoria-ajuda"
          className="w-full sm:w-auto px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
        />
        <p id="data-auditoria-ajuda" className={`mt-2 text-xs ${dataAuditoriaValida ? 'text-slate-500' : 'text-rose-600'}`}>
          {dataAuditoriaValida
            ? 'Os ajustes serão registrados nesta data. O estoque exibido corresponde ao saldo atual.'
            : 'Selecione uma data válida para salvar os ajustes.'}
        </p>
      </div>
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
                
                const valFisico = temDigitacao ? parsePtBrNumber(contagemFisicaDig) : ins.estoqueAtual;
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
                            type="text"
                            inputMode="decimal"
                            step="any"
                            placeholder={isColaborador ? "Restrito" : "Contagem"}
                            disabled={isColaborador}
                            value={contagemFisicaDig}
                            onChange={(e) => handleContagemChange(ins.id, formatPtBrNumberWhileTyping(e.target.value))}
                            onBlur={(e) => handleContagemChange(ins.id, formatPtBrNumberInput(e.target.value))}
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
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {hasFeedback ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 animate-fadeIn">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Ajustado
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!temDigitacao || !dataAuditoriaValida}
                              onClick={() => aplicarAjusteIndividual(ins.id)}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-colors ${
                                temDigitacao && dataAuditoriaValida
                                  ? 'bg-brand-navy hover:bg-brand-navy/90 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                              }`}
                            >
                              Salvar Ajuste
                            </button>
                          )}
                          <button type="button" onClick={() => abrirEdicao(ins)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50" title={`Editar ${ins.nome}`}>
                            <Edit2 className="h-3 w-3" /> Editar
                          </button>
                          <button type="button" onClick={() => excluirInsumo(ins)} className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-white px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50" title={`Excluir ${ins.nome}`}>
                            <Trash2 className="h-3 w-3" /> Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingInsumo && !isColaborador && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-6 sm:py-10" role="dialog" aria-modal="true" aria-labelledby="editar-insumo-inventario-title">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="editar-insumo-inventario-title" className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Boxes className="h-4 w-4 text-brand-navy" /> Editar insumo da contagem
              </h3>
              <button type="button" onClick={() => setEditingInsumo(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar edição">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={salvarEdicao} className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="md:col-span-2 block text-[10px] font-bold uppercase tracking-wider text-slate-600">Nome do insumo *
                <input required value={editingInsumo.nome} onChange={event => setEditingInsumo({ ...editingInsumo, nome: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-800" />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Categoria *
                <select value={editingInsumo.categoria} onChange={event => setEditingInsumo({ ...editingInsumo, categoria: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-800">
                  {categorias.filter(categoria => categoria !== 'Todas').map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Setor *
                <select value={editingInsumo.setor} onChange={event => setEditingInsumo({ ...editingInsumo, setor: event.target.value as SetorEstoque })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-800">
                  <option value={SETOR_RESTAURANTE}>{SETOR_RESTAURANTE}</option>
                  <option value={SETOR_CAFE}>{SETOR_CAFE}</option>
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Unidade de medida *
                <select value={editingInsumo.unidadeMedida} onChange={event => setEditingInsumo({ ...editingInsumo, unidadeMedida: event.target.value as Insumo['unidadeMedida'] })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-800">
                  {['kg', 'g', 'L', 'ml', 'un'].map(unidade => <option key={unidade} value={unidade}>{unidade}</option>)}
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Estoque atual *
                <input required type="text" inputMode="decimal" value={editingInsumo.estoqueAtual} onChange={event => setEditingInsumo({ ...editingInsumo, estoqueAtual: formatPtBrNumberWhileTyping(event.target.value) })} onBlur={event => setEditingInsumo({ ...editingInsumo, estoqueAtual: formatPtBrNumberInput(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-800" />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Estoque mínimo *
                <input required type="text" inputMode="decimal" value={editingInsumo.estoqueMinimo} onChange={event => setEditingInsumo({ ...editingInsumo, estoqueMinimo: formatPtBrNumberWhileTyping(event.target.value) })} onBlur={event => setEditingInsumo({ ...editingInsumo, estoqueMinimo: formatPtBrNumberInput(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-800" />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Valor da embalagem
                <input type="text" inputMode="decimal" value={editingInsumo.valorEmbalagem} onChange={event => setEditingInsumo({ ...editingInsumo, valorEmbalagem: formatPtBrNumberWhileTyping(event.target.value, 2) })} onBlur={event => setEditingInsumo({ ...editingInsumo, valorEmbalagem: formatPtBrNumberInput(event.target.value, 2) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-800" />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Conteúdo da embalagem
                <input type="text" inputMode="decimal" value={editingInsumo.conteudoEmbalagem} onChange={event => setEditingInsumo({ ...editingInsumo, conteudoEmbalagem: formatPtBrNumberWhileTyping(event.target.value) })} onBlur={event => setEditingInsumo({ ...editingInsumo, conteudoEmbalagem: formatPtBrNumberInput(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-800" />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Fornecedor
                <input value={editingInsumo.fornecedor} onChange={event => setEditingInsumo({ ...editingInsumo, fornecedor: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-800" />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Validade
                <input type="date" value={editingInsumo.validade} onChange={event => setEditingInsumo({ ...editingInsumo, validade: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-800" />
              </label>
              {editError && <p className="md:col-span-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{editError}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 md:col-span-3">
                <button type="button" onClick={() => setEditingInsumo(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200">Cancelar</button>
                <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-xs font-bold text-white hover:bg-brand-navy/90">Salvar alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
