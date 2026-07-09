import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { FichaTecnica, IngredienteFicha, Insumo } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  DollarSign, 
  Percent, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Calculator, 
  BookOpen, 
  X,
  PlusCircle,
  HelpCircle,
  PiggyBank,
  Lock
} from 'lucide-react';

export const FichasTecnicas: React.FC = () => {
  const { fichas, insumos, addFicha, updateFicha, deleteFicha, getFichaCusto, user } = useStock();
  const isColaborador = user.cargo === 'Colaborador';

  // Estados para busca e seleção
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [activeFichaId, setActiveFichaId] = useState<string | null>(null);

  // Estados do formulário de criação/edição
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Pratos Principais');
  const [descricao, setDescricao] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [rendimentoPorcoes, setRendimentoPorcoes] = useState('1');
  const [ingredientesEscolhidos, setIngredientesEscolhidos] = useState<IngredienteFicha[]>([]);

  // Auxiliares de inserção de ingrediente no formulário
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [insumoSearchTerm, setInsumoSearchTerm] = useState('');
  const [showInsumoSugestoes, setShowInsumoSugestoes] = useState(false);
  const [quantidadeInput, setQuantidadeInput] = useState('');
  const [unidadeInserida, setUnidadeInserida] = useState<'principal' | 'sub'>('sub'); // ex: principal = kg, sub = g

  // Simulador de precificação individual
  const [simulacaoPrecoVenda, setSimulacaoPrecoVenda] = useState<number | null>(null);

  // Feedbacks
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Categorias de fichas
  const categoriasFichas = ['Pratos Principais', 'Entradas', 'Sobremesas', 'Bebidas', 'Porções', 'Outros'];

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setCategoria('Pratos Principais');
    setDescricao('');
    setPrecoVenda('');
    setRendimentoPorcoes('1');
    setIngredientesEscolhidos([]);
    setSelectedInsumoId('');
    setInsumoSearchTerm('');
    setShowInsumoSugestoes(false);
    setQuantidadeInput('');
    setErrorMsg('');
  };

  const handleOpenCreate = () => {
    if (isColaborador) return;
    resetForm();
    setShowForm(true);
  };

  const handleOpenEdit = (f: FichaTecnica) => {
    if (isColaborador) return;
    setEditingId(f.id);
    setNome(f.nome);
    setCategoria(f.categoria);
    setDescricao(f.descricao || '');
    setPrecoVenda(f.precoVenda.toString());
    setRendimentoPorcoes(f.rendimentoPorcoes.toString());
    setIngredientesEscolhidos([...f.ingredientes]);
    setSelectedInsumoId('');
    setInsumoSearchTerm('');
    setShowInsumoSugestoes(false);
    setQuantidadeInput('');
    setErrorMsg('');
    setShowForm(true);
  };

  // Adicionar ingrediente à lista temporária no formulário
  const handleAddIngredienteAoForm = () => {
    if (!selectedInsumoId || !quantidadeInput) {
      setErrorMsg('Selecione um insumo e digite a quantidade.');
      return;
    }

    const ins = insumos.find(i => i.id === selectedInsumoId);
    if (!ins) return;

    // Converter se necessário (ex: g para kg, ml para L)
    let quantFinal = Number(quantidadeInput);
    if (unidadeInserida === 'sub') {
      if (ins.unidadeMedida === 'kg' || ins.unidadeMedida === 'L') {
        quantFinal = quantFinal / 1000; // converter de g para kg / de ml para L
      }
    }

    // Validar se o insumo já está nos ingredientes escolhidos
    if (ingredientesEscolhidos.some(ing => ing.insumoId === selectedInsumoId)) {
      setErrorMsg('Este insumo já foi adicionado. Remova-o antes de readicionar.');
      return;
    }

    const novoIng: IngredienteFicha = {
      insumoId: selectedInsumoId,
      quantidade: quantFinal
    };

    setIngredientesEscolhidos([...ingredientesEscolhidos, novoIng]);
    setSelectedInsumoId('');
    setInsumoSearchTerm('');
    setShowInsumoSugestoes(false);
    setQuantidadeInput('');
    setErrorMsg('');
  };

  const handleRemoverIngredienteDoForm = (insumoId: string) => {
    setIngredientesEscolhidos(ingredientesEscolhidos.filter(ing => ing.insumoId !== insumoId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isColaborador) return;

    if (!nome || !precoVenda || ingredientesEscolhidos.length === 0) {
      setErrorMsg('Insira pelo menos o nome, preço de venda e um ingrediente na composição.');
      return;
    }

    const fichaData = {
      nome,
      categoria,
      descricao: descricao || undefined,
      precoVenda: Number(precoVenda),
      rendimentoPorcoes: Number(rendimentoPorcoes) || 1,
      ingredientes: ingredientesEscolhidos
    };

    if (editingId) {
      updateFicha(editingId, fichaData);
      setSuccessMsg('Ficha técnica atualizada com sucesso!');
    } else {
      addFicha(fichaData);
      setSuccessMsg('Nova Ficha técnica criada com sucesso!');
    }

    setShowForm(false);
    resetForm();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = (id: string) => {
    if (isColaborador) return;

    if (window.confirm('Tem certeza de que deseja excluir esta ficha técnica?')) {
      deleteFicha(id);
      setSuccessMsg('Ficha técnica removida!');
      if (activeFichaId === id) setActiveFichaId(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Filtragem
  const filteredFichas = fichas.filter(f => {
    const matchesSearch = f.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || f.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeFicha = fichas.find(f => f.id === activeFichaId);
  const activeCusto = activeFicha ? getFichaCusto(activeFicha) : 0;
  const activePrecoFinal = simulacaoPrecoVenda !== null ? simulacaoPrecoVenda : (activeFicha?.precoVenda || 0);
  
  // Métricas da Ficha Ativa
  const activeFCP = activePrecoFinal > 0 ? (activeCusto / activePrecoFinal) * 100 : 0;
  const activeMargemR$ = activePrecoFinal - activeCusto;
  const activeMargemPerc = activePrecoFinal > 0 ? (activeMargemR$ / activePrecoFinal) * 100 : 0;
  const activeMarkup = activeCusto > 0 ? activePrecoFinal / activeCusto : 0;

  // Preço sugerido com base na meta de FCP do usuário (ex: meta 30% -> custo / 0.3)
  const precoSugerido = activeCusto > 0 ? activeCusto / (user.metaFCP / 100) : 0;

  const normalizeSearch = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const selectedInsumo = insumos.find(i => i.id === selectedInsumoId);
  const insumoSugestoes = insumoSearchTerm.trim()
    ? insumos
        .filter(ins => normalizeSearch(ins.nome).includes(normalizeSearch(insumoSearchTerm)))
        .slice(0, 8)
    : [];

  const formatQuantidade = (quantidade: number, ins: Insumo) => {
    if (ins.unidadeMedida === 'kg' && quantidade < 1) return (quantidade * 1000).toFixed(0) + 'g';
    if (ins.unidadeMedida === 'L' && quantidade < 1) return (quantidade * 1000).toFixed(0) + 'ml';
    return quantidade + ' ' + ins.unidadeMedida;
  };

  const formatEmbalagem = (ins: Insumo) => {
    const conteudo = ins.conteudoEmbalagem || 1;
    if (ins.unidadeMedida === 'kg' && conteudo < 1) return (conteudo * 1000).toFixed(0) + 'g';
    if (ins.unidadeMedida === 'L' && conteudo < 1) return (conteudo * 1000).toFixed(0) + 'ml';
    return conteudo.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + ins.unidadeMedida;
  };

  const roundMoneyUp = (value: number) => Math.ceil((value - 1e-9) * 100) / 100;

  const getValorEmbalagem = (ins: Insumo) => ins.valorEmbalagem ?? (ins.custoMedio * (ins.conteudoEmbalagem || 1));

  const getCustoPorEmbalagem = (ins: Insumo, quantidade: number) => {
    const conteudo = ins.conteudoEmbalagem || 1;
    const valor = getValorEmbalagem(ins);
    return roundMoneyUp(conteudo > 0 ? (valor * quantidade) / conteudo : quantidade * ins.custoMedio);
  };

  const getFormulaEmbalagem = (ins: Insumo, quantidade: number) => {
    const valor = getValorEmbalagem(ins);
    return 'R$ ' + valor.toFixed(2) + ' x ' + formatQuantidade(quantidade, ins) + ' / ' + formatEmbalagem(ins);
  };

  const handleSelectInsumo = (ins: Insumo) => {
    setSelectedInsumoId(ins.id);
    setInsumoSearchTerm(ins.nome + ' - embalagem R$ ' + getValorEmbalagem(ins).toFixed(2) + ' / ' + formatEmbalagem(ins));
    setShowInsumoSugestoes(false);
    if (ins.unidadeMedida === 'kg' || ins.unidadeMedida === 'L') {
      setUnidadeInserida('sub');
    } else {
      setUnidadeInserida('principal');
    }
  };

  return (
    <div className="space-y-6" id="fichas-tecnicas-view">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Engenharia de Cardápio & Fichas Técnicas</h2>
            {isColaborador && (
              <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-full text-[10px] font-bold flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Consulta / Simulação
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Desenvolva receitas com cálculo de custo automático, CMV Teórico e simulações de margem de lucro</p>
        </div>

        {!isColaborador ? (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all hover:scale-[1.01] cursor-pointer self-start sm:self-auto"
            id="btn-nova-ficha"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Criar Ficha Técnica
          </button>
        ) : (
          <div className="text-[11px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-3 py-2 rounded-xl flex items-center gap-1.5 max-w-[280px]">
            <Lock className="w-3.5 h-3.5" />
            <span>Permissões de edição restritas ao Gestor</span>
          </div>
        )}
      </div>

      {/* Feedbacks */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-medium" id="ficha-success">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium" id="ficha-error">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          {errorMsg}
        </div>
      )}

      {/* Formulário de Criação/Edição */}
      {showForm && !isColaborador && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-lg animate-fadeIn space-y-4" id="ficha-form">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-navy" />
              {editingId ? 'Editar Ficha Técnica' : 'Cadastrar Nova Ficha Técnica'}
            </h3>
            <button 
              onClick={() => { setShowForm(false); resetForm(); }}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Nome do Item de Cardápio *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                  placeholder="ex: Filé Mignon ao Molho Madeira"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Categoria de Cardápio *</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 cursor-pointer"
                >
                  {categoriasFichas.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Preço de Venda (R$) *</label>
                <input
                  type="number"
                  step="any"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 font-mono"
                  placeholder="R$ 0.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Descrição</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                  placeholder="Breve descrição do prato para o cardápio..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Rendimento (Porções)</label>
                <input
                  type="number"
                  value={rendimentoPorcoes}
                  onChange={(e) => setRendimentoPorcoes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 font-mono"
                  placeholder="ex: 1"
                />
              </div>
            </div>

            {/* SEÇÃO INTERATIVA: Adicionar Ingredientes */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Composição da Receita (Ingredientes)</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Insumo em Estoque</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={insumoSearchTerm}
                      onChange={(e) => {
                        setInsumoSearchTerm(e.target.value);
                        setSelectedInsumoId('');
                        setShowInsumoSugestoes(true);
                      }}
                      onFocus={() => setShowInsumoSugestoes(true)}
                      onBlur={() => window.setTimeout(() => setShowInsumoSugestoes(false), 120)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 font-medium"
                      placeholder="Digite o nome do insumo..."
                      autoComplete="off"
                    />

                    {showInsumoSugestoes && insumoSearchTerm.trim() && (
                      <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl divide-y divide-slate-100">
                        {insumoSugestoes.length > 0 ? (
                          insumoSugestoes.map(ins => (
                            <button
                              key={ins.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectInsumo(ins)}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <span className="block text-xs font-bold text-slate-800">{ins.nome}</span>
                              <span className="block text-[10px] text-slate-500 font-mono">
                                Embalagem: R$ {getValorEmbalagem(ins).toFixed(2)} / {formatEmbalagem(ins)}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-xs text-slate-400">Nenhum insumo encontrado.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Quantidade Necessária</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={quantidadeInput}
                      onChange={(e) => setQuantidadeInput(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                      placeholder="Qtd"
                    />
                    
                    {/* Seletor de subunidade inteligente */}
                    {selectedInsumoId && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {(selectedInsumo?.unidadeMedida === 'kg' || 
                          selectedInsumo?.unidadeMedida === 'L') && (
                          <div className="flex bg-slate-100 border border-slate-200 rounded text-[9px] font-bold overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => setUnidadeInserida('sub')}
                              className={`px-1.5 py-0.5 cursor-pointer ${unidadeInserida === 'sub' ? 'bg-brand-navy text-white' : 'text-slate-500'}`}
                            >
                              {selectedInsumo?.unidadeMedida === 'kg' ? 'g' : 'ml'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setUnidadeInserida('principal')}
                              className={`px-1.5 py-0.5 cursor-pointer ${unidadeInserida === 'principal' ? 'bg-brand-navy text-white' : 'text-slate-500'}`}
                            >
                              {selectedInsumo?.unidadeMedida === 'kg' ? 'kg' : 'L'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleAddIngredienteAoForm}
                    className="w-full py-2 bg-brand-gold hover:bg-brand-gold/90 text-white font-bold text-xs rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Inserir Ingrediente
                  </button>
                </div>
              </div>

              {/* Tabela de Ingredientes Adicionados */}
              <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                      <th className="py-2 px-3">Insumo</th>
                      <th className="py-2 px-3 text-right">Qtd do Prato</th>
                      <th className="py-2 px-3 text-right">Embalagem</th>
                      <th className="py-2 px-3 text-right">Custo usado</th>
                      <th className="py-2 px-3 text-center">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ingredientesEscolhidos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 font-normal">
                          Adicione ingredientes acima para compor o custo da receita.
                        </td>
                      </tr>
                    ) : (
                      ingredientesEscolhidos.map(ing => {
                        const ins = insumos.find(i => i.id === ing.insumoId);
                        if (!ins) return null;
                        const itemCusto = getCustoPorEmbalagem(ins, ing.quantidade);
                        const qtFriendly = formatQuantidade(ing.quantidade, ins);

                        return (
                          <tr key={ing.insumoId} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-800 font-bold">{ins.nome}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">{qtFriendly}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500">
                              <div>R$ {getValorEmbalagem(ins).toFixed(2)} / {formatEmbalagem(ins)}</div>
                              <div className="text-[10px] text-slate-400">{getFormulaEmbalagem(ins, ing.quantidade)}</div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-800 font-bold">R$ {itemCusto.toFixed(2)}</td>
                            <td className="py-1 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoverIngredienteDoForm(ing.insumoId)}
                                className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {ingredientesEscolhidos.length > 0 && (
                <div className="flex justify-end pr-4 text-xs font-bold text-slate-700 py-1">
                  <span>Custo total dos ingredientes: R$ {
                    ingredientesEscolhidos.reduce((acc, ing) => {
                      const ins = insumos.find(i => i.id === ing.insumoId);
                      return ins ? acc + getCustoPorEmbalagem(ins, ing.quantidade) : acc;
                    }, 0).toFixed(2)
                  }</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
              >
                {editingId ? 'Salvar Ficha Técnica' : 'Salvar e Publicar Ficha'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid Principal: Lista de Fichas e Detalhamento da Ficha Ativa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Esquerda: Lista de Fichas por Categoria */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar ficha técnica..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700">
              <span className="text-slate-400 font-medium">Categoria:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-slate-700 focus:outline-none cursor-pointer font-bold"
              >
                <option value="Todas">Todas</option>
                {categoriasFichas.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1" id="fichas-scroll-container">
            {filteredFichas.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
                Nenhuma receita cadastrada nesta categoria.
              </div>
            ) : (
              filteredFichas.map(f => {
                const custo = getFichaCusto(f);
                const FCP = f.precoVenda > 0 ? (custo / f.precoVenda) * 100 : 0;
                
                // Alerta se o FCP está muito alto (acima da meta do usuário)
                const fcpPerigoso = FCP > user.metaFCP;

                return (
                  <div 
                    key={f.id}
                    onClick={() => {
                      setActiveFichaId(f.id);
                      setSimulacaoPrecoVenda(null); // resetar simulação ao mudar de ficha
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative group flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                      activeFichaId === f.id 
                        ? 'bg-brand-navy/5 border-brand-navy shadow-sm' 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-800">{f.nome}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-semibold rounded text-slate-500">
                          {f.categoria}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-[280px] md:max-w-[360px]">
                        {f.descricao || 'Sem descrição cadastrada'}
                      </p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-3">
                        <span className="font-semibold">{f.ingredientes.length} ingredientes</span>
                        <span>•</span>
                        <span>Rendimento: {f.rendimentoPorcoes} {f.rendimentoPorcoes > 1 ? 'porções' : 'porção'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 md:gap-6 font-mono text-right shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Custo Receita</span>
                        <span className="text-sm font-bold text-slate-700">R$ {custo.toFixed(2)}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Preço Venda</span>
                        <span className="text-sm font-bold text-brand-navy">R$ {f.precoVenda.toFixed(2)}</span>
                      </div>

                      <div className="min-w-[70px]">
                        <span className="text-[10px] text-slate-400 block uppercase">CMV Teórico</span>
                        <span className={`text-sm font-bold flex items-center justify-end gap-1 ${
                          fcpPerigoso ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {fcpPerigoso && <AlertTriangle className="w-3.5 h-3.5" title="CMV acima da meta gerencial!" />}
                          {FCP.toFixed(0)}%
                        </span>
                      </div>

                      {/* Ações - Somente Gestor */}
                      {!isColaborador && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEdit(f)}
                            className="p-1.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-850 rounded-lg border border-slate-200 cursor-pointer shadow-sm"
                            title="Editar Ficha"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="p-1.5 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg border border-slate-200 cursor-pointer shadow-sm"
                            title="Excluir Ficha"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Direita: Painel Analítico e Simulador de Margem */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md h-fit">
          {activeFicha ? (
            <div className="space-y-6" id="analise-ficha-box">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-bold text-brand-navy uppercase tracking-widest block">Análise Detalhada & Engenharia</span>
                <h3 className="text-lg font-black text-slate-800 mt-1">{activeFicha.nome}</h3>
                <p className="text-xs text-slate-500 mt-1">{activeFicha.descricao || 'Sem descrição disponível'}</p>
              </div>

              {/* Métricas Principais */}
              <div className="grid grid-cols-2 gap-3" id="ficha-analitica-kpis">
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[9px] uppercase text-slate-500 block font-bold">Margem de Contribuição</span>
                  <span className="text-base font-bold text-emerald-600 block font-mono mt-1">
                    R$ {activeMargemR$.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">({activeMargemPerc.toFixed(1)}%)</span>
                </div>

                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[9px] uppercase text-slate-500 block font-bold">Markup Atual</span>
                  <span className="text-base font-bold text-slate-800 block font-mono mt-1">
                    {activeMarkup.toFixed(2)}x
                  </span>
                  <span className="text-[10px] text-slate-400">Sugerido: {(100 / user.metaFCP).toFixed(1)}x</span>
                </div>
              </div>

              {/* FCP Gauge com Meta */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-medium">CMV Teórico (Food Cost %):</span>
                  <span className={`font-bold font-mono ${activeFCP > user.metaFCP ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {activeFCP.toFixed(1)}%
                  </span>
                </div>
                
                {/* Barra horizontal comparando FCP com a Meta */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                  {/* Marcador da Meta do Usuário */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10" 
                    style={{ left: `${user.metaFCP}%` }}
                    title={`Meta CMV: ${user.metaFCP}%`}
                  />
                  <div 
                    className={`h-full rounded-full transition-all ${
                      activeFCP > user.metaFCP ? 'bg-rose-500' : 'bg-emerald-500'
                    }`} 
                    style={{ width: `${Math.min(100, activeFCP)}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                  <span>Excelente (≤ 25%)</span>
                  <span>Meta ({user.metaFCP}%)</span>
                  <span>Alerta (&gt; 35%)</span>
                </div>
              </div>

              {/* Simulação Interativa */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Calculator className="w-4 h-4 text-brand-navy" />
                    Simular Reajuste de Preço
                  </span>
                  {simulacaoPrecoVenda !== null && (
                    <button
                      onClick={() => setSimulacaoPrecoVenda(null)}
                      className="text-[10px] text-brand-navy hover:underline cursor-pointer font-bold"
                    >
                      Restaurar
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Preço Simulado de Venda:</span>
                    <span className="font-bold text-brand-navy font-mono">
                      R$ {activePrecoFinal.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={Math.ceil(activeCusto)}
                    max={Math.ceil(activeCusto * 8)}
                    step="1"
                    value={activePrecoFinal}
                    onChange={(e) => setSimulacaoPrecoVenda(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-navy"
                  />
                </div>

                {/* Preço de Venda Sugerido pela Engenharia de Cardápio */}
                <div className="p-2.5 bg-brand-navy/5 border border-brand-navy/10 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1 text-brand-navy font-semibold">
                    <PiggyBank className="w-4 h-4 text-brand-gold" />
                    Recomendação Inteligente:
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Para atingir sua meta de <strong className="text-slate-850">{user.metaFCP}% de CMV</strong>, o preço sugerido é de <strong className="text-brand-navy font-bold">R$ {precoSugerido.toFixed(2)}</strong>.
                  </p>
                </div>
              </div>

              {/* Composição Interna Detalhada */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-800 block border-b border-slate-100 pb-2">Lista de Insumos da Ficha</span>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-xs">
                  {activeFicha.ingredientes.map(ing => {
                    const ins = insumos.find(i => i.id === ing.insumoId);
                    if (!ins) return null;
                    const itemCusto = getCustoPorEmbalagem(ins, ing.quantidade);
                    const pesoProp = activeCusto > 0 ? (itemCusto / activeCusto) * 100 : 0;
                    const qtFriendly = formatQuantidade(ing.quantidade, ins);

                    return (
                      <div key={ing.insumoId} className="flex justify-between items-center p-2 bg-slate-50/50 rounded-lg border border-slate-100">
                        <div>
                          <strong className="text-slate-800 block">{ins.nome}</strong>
                          <span className="text-[10px] text-slate-400">
                            {getFormulaEmbalagem(ins, ing.quantidade)} | {pesoProp.toFixed(0)}% do custo do prato
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-700">
                          R$ {itemCusto.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
              <Calculator className="w-12 h-12 text-slate-300" />
              <span>Selecione uma receita da lista ao lado para ver a engenharia de custos, margem detalhada e simulador inteligente de precificação.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
