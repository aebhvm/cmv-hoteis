import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { Insumo } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Truck, 
  Boxes, 
  ChevronRight,
  TrendingUp,
  X,
  Lock,
  Coins
} from 'lucide-react';

export const Insumos: React.FC = () => {
  const { user, insumos, addInsumo, updateInsumo, deleteInsumo, fichas, addMovimentacao } = useStock();
  const isColaborador = user.cargo === 'Colaborador';
  
  // Estados para busca e filtragem
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [filterAlerts, setFilterAlerts] = useState(false);

  // Estados do formulário de criação/edição
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Carnes e Peixes');
  const [unidadeMedida, setUnidadeMedida] = useState<'kg' | 'g' | 'L' | 'ml' | 'un'>('kg');
  const [valorEmbalagem, setValorEmbalagem] = useState('');
  const [conteudoEmbalagem, setConteudoEmbalagem] = useState('');
  const [custoMedio, setCustoMedio] = useState('');
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [validade, setValidade] = useState('');

  // Estados de feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estado para entrada rápida de estoque
  const [quickAddId, setQuickAddId] = useState<string | null>(null);
  const [quickQty, setQuickQty] = useState('');
  const [quickCost, setQuickCost] = useState('');
  const [quickObs, setQuickObs] = useState('');

  // Categorias disponíveis
  const categorias = ['Carnes e Peixes', 'Laticínios', 'Hortifruti', 'Secos e Mercearia', 'Bebidas', 'Embalagens'];

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setCategoria('Carnes e Peixes');
    setUnidadeMedida('kg');
    setValorEmbalagem('');
    setConteudoEmbalagem('');
    setCustoMedio('');
    setEstoqueAtual('');
    setEstoqueMinimo('');
    setFornecedor('');
    setValidade('');
    setErrorMsg('');
  };

  const handleOpenCreate = () => {
    if (isColaborador) return;
    resetForm();
    setShowForm(true);
  };

  const handleOpenEdit = (ins: Insumo) => {
    if (isColaborador) return;
    setEditingId(ins.id);
    setNome(ins.nome);
    setCategoria(ins.categoria);
    setUnidadeMedida(ins.unidadeMedida);
    setValorEmbalagem(ins.valorEmbalagem?.toString() || '');
    setConteudoEmbalagem(ins.conteudoEmbalagem?.toString() || '');
    setCustoMedio(ins.custoMedio.toString());
    setEstoqueAtual(ins.estoqueAtual.toString());
    setEstoqueMinimo(ins.estoqueMinimo.toString());
    setFornecedor(ins.fornecedor || '');
    setValidade(ins.validade || '');
    setErrorMsg('');
    setShowForm(true);
  };

  const roundMoneyUp = (value: number) => Math.ceil((value - 1e-9) * 100) / 100;
  const getPackageUnitCost = (valor: number, conteudo: number) => conteudo > 0 ? roundMoneyUp(valor / conteudo) : 0;
  const getEffectiveUnitCost = (ins: Insumo) => {
    if (ins.valorEmbalagem !== undefined && ins.conteudoEmbalagem && ins.conteudoEmbalagem > 0) {
      return getPackageUnitCost(ins.valorEmbalagem, ins.conteudoEmbalagem);
    }
    return roundMoneyUp(ins.custoMedio);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isColaborador) return;

    const valorEmb = valorEmbalagem ? Number(valorEmbalagem) : undefined;
    const conteudoEmb = conteudoEmbalagem ? Number(conteudoEmbalagem) : undefined;

    if (!nome || !valorEmb || !conteudoEmb || conteudoEmb <= 0 || !estoqueMinimo || !estoqueAtual) {
      setErrorMsg('Preencha nome, valor da embalagem, quantidade da embalagem, estoque minimo e estoque atual.');
      return;
    }

    const custoCalculado = getPackageUnitCost(valorEmb, conteudoEmb);

    const insumoData = {
      nome,
      categoria,
      unidadeMedida,
      valorEmbalagem: valorEmb,
      conteudoEmbalagem: conteudoEmb,
      custoMedio: custoCalculado,
      estoqueAtual: editingId ? Number(estoqueAtual) : Number(estoqueAtual || 0),
      estoqueMinimo: Number(estoqueMinimo),
      fornecedor: fornecedor || undefined,
      validade: validade || undefined
    };

    if (editingId) {
      updateInsumo(editingId, insumoData);
      setSuccessMsg('Insumo atualizado com sucesso!');
    } else {
      addInsumo(insumoData);
      setSuccessMsg('Insumo cadastrado com sucesso!');
    }

    setShowForm(false);
    resetForm();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = (id: string) => {
    if (isColaborador) return;

    // Verificar se o insumo está sendo usado em alguma ficha técnica
    const fichasUsando = fichas.filter(f => f.ingredientes.some(ing => ing.insumoId === id));
    if (fichasUsando.length > 0) {
      const nomesFichas = fichasUsando.map(f => f.nome).join(', ');
      setErrorMsg(`Não é possível excluir este insumo porque ele faz parte das seguintes fichas técnicas: ${nomesFichas}`);
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }

    if (window.confirm('Tem certeza de que deseja excluir este insumo permanentemente?')) {
      const success = deleteInsumo(id);
      if (success) {
        setSuccessMsg('Insumo excluído com sucesso.');
      } else {
        setErrorMsg('Erro ao excluir insumo.');
      }
      setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 3000);
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isColaborador) return;
    if (!quickAddId || !quickQty) return;

    const ins = insumos.find(i => i.id === quickAddId);
    if (!ins) return;

    const qty = Number(quickQty);
    const cost = quickCost ? Number(quickCost) : ins.custoMedio;

    // Adiciona movimentação de entrada
    addMovimentacao({
      insumoId: quickAddId,
      tipo: 'entrada',
      quantidade: qty,
      custoUnitario: cost,
      observacao: quickObs || 'Entrada rápida de estoque'
    });

    setQuickAddId(null);
    setQuickQty('');
    setQuickCost('');
    setQuickObs('');
    setSuccessMsg(`Entrada de estoque de ${ins.nome} realizada com sucesso!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Filtragem dos insumos
  const filteredInsumos = insumos.filter(ins => {
    const matchesSearch = ins.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (ins.fornecedor && ins.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'Todas' || ins.categoria === selectedCategory;
    const matchesAlert = !filterAlerts || ins.estoqueAtual < ins.estoqueMinimo;
    return matchesSearch && matchesCategory && matchesAlert;
  });

  const handleValorEmbalagemChange = (value: string) => {
    setValorEmbalagem(value);
    const valor = Number(value);
    const conteudo = Number(conteudoEmbalagem);
    if (value && conteudoEmbalagem && conteudo > 0) {
      setCustoMedio(getPackageUnitCost(valor, conteudo).toFixed(2));
    }
  };

  const handleConteudoEmbalagemChange = (value: string) => {
    setConteudoEmbalagem(value);
    const valor = Number(valorEmbalagem);
    const conteudo = Number(value);
    if (valorEmbalagem && value && conteudo > 0) {
      setCustoMedio(getPackageUnitCost(valor, conteudo).toFixed(2));
    }
  };

  return (
    <div className="space-y-6" id="insumos-view">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Cadastro de Insumos</h2>
            {isColaborador && (
              <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-full text-[10px] font-bold flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Consulta / Operação
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Cadastre o valor e a quantidade da embalagem para calcular automaticamente o custo usado nas fichas.</p>
        </div>
        
        {!isColaborador ? (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all hover:scale-[1.01] cursor-pointer self-start sm:self-auto"
            id="btn-novo-insumo"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Novo Insumo
          </button>
        ) : (
          <div className="text-[11px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-3 py-2 rounded-xl flex items-center gap-1.5 max-w-[280px]">
            <Lock className="w-3.5 h-3.5" />
            <span>Permissões de edição restritas ao Gestor</span>
          </div>
        )}
      </div>

      {/* Alertas e Mensagens de Feedback */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-medium" id="success-feedback">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium" id="error-feedback">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          {errorMsg}
        </div>
      )}

      {/* Barra de Ações (Filtros e Busca) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar insumo ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none cursor-pointer text-xs font-semibold"
            >
              <option value="Todas">Todas as Categorias</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setFilterAlerts(!filterAlerts)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              filterAlerts 
                ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold' 
                : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Estoque Crítico ({insumos.filter(i => i.estoqueAtual < i.estoqueMinimo).length})
          </button>
        </div>
      </div>

      {/* Modal de Cadastro / Edicao */}
      {showForm && !isColaborador && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 px-4 py-6 sm:py-10 overflow-y-auto"
          id="insumo-form-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="insumo-form-title"
        >
          <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-white border border-slate-200 p-6 rounded-xl shadow-2xl relative animate-fadeIn" id="insumo-form">
            <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-brand-navy" />
              <span id="insumo-form-title">{editingId ? 'Editar Insumo' : 'Cadastrar Novo Insumo'}</span>
            </h3>
            <button 
              onClick={() => { setShowForm(false); resetForm(); }}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Fechar formulario"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Nome do Insumo *</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                placeholder="ex: Filé Mignon"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Categoria *</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 cursor-pointer"
              >
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Unidade de Medida *</label>
              <select
                value={unidadeMedida}
                onChange={(e) => setUnidadeMedida(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 cursor-pointer"
              >
                <option value="kg">kg (Quilograma)</option>
                <option value="g">g (Grama)</option>
                <option value="L">L (Litro)</option>
                <option value="ml">ml (Mililitro)</option>
                <option value="un">un (Unidade)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Estoque Mínimo (Segurança) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={estoqueMinimo}
                  onChange={(e) => setEstoqueMinimo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 font-mono"
                  placeholder="ex: 5"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Valor da Embalagem (R$) *</label>
              <input
                type="number"
                step="any"
                value={valorEmbalagem}
                onChange={(e) => handleValorEmbalagemChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 font-mono"
                placeholder="ex: 53.76"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Conteudo da Embalagem *</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={conteudoEmbalagem}
                  onChange={(e) => handleConteudoEmbalagemChange(e.target.value)}
                  className="w-full px-3 py-2 pr-12 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 font-mono"
                  placeholder={unidadeMedida === 'L' ? 'ex: 0.750' : unidadeMedida === 'kg' ? 'ex: 1.000' : 'ex: 1'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 uppercase font-bold">{unidadeMedida}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                {editingId ? 'Estoque Atual' : 'Estoque Inicial'} *
              </label>
              <input
                type="number"
                step="any"
                value={estoqueAtual}
                onChange={(e) => setEstoqueAtual(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 font-mono"
                placeholder="ex: 10"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Fornecedor Preferencial</label>
              <input
                type="text"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                placeholder="Nome do fornecedor"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Data de Validade</label>
              <input
                type="date"
                value={validade}
                onChange={(e) => setValidade(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                {editingId ? 'Salvar Alterações' : 'Cadastrar Insumo'}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Caixa de Entrada Rápida de Estoque (Se ativa) */}
      {quickAddId && !isColaborador && (
        <div className="bg-white border border-brand-navy/20 p-5 rounded-xl shadow-lg relative animate-scaleIn">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-brand-navy" />
              Entrada Rápida de Estoque: <span className="text-brand-navy">{insumos.find(i => i.id === quickAddId)?.nome}</span>
            </h4>
            <button 
              onClick={() => { setQuickAddId(null); setQuickQty(''); }}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleQuickAddSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Quantidade Adquirida *</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  value={quickQty}
                  onChange={(e) => setQuickQty(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                  placeholder="Qtd"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 uppercase font-bold">
                  {insumos.find(i => i.id === quickAddId)?.unidadeMedida}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Custo por Unidade (R$)</label>
              <input
                type="number"
                step="any"
                value={quickCost}
                onChange={(e) => setQuickCost(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                placeholder={`Sugestão: R$ ${insumos.find(i => i.id === quickAddId)?.custoMedio.toFixed(2)}`}
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                Confirmar Entrada
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabela/Grade de Insumos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="insumos-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Insumo</th>
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4 text-right">Estoque Atual</th>
                <th className="py-3.5 px-4 text-right">Capital Imobilizado</th>
                <th className="py-3.5 px-4">Fornecedor</th>
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInsumos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                    Nenhum insumo encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredInsumos.map(ins => {
                  const estoqueCrítico = ins.estoqueAtual < ins.estoqueMinimo;
                  const valorEstoque = roundMoneyUp(ins.estoqueAtual * getEffectiveUnitCost(ins));
                  return (
                    <tr key={ins.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{ins.nome}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {ins.id}</span>
                          </div>
                          {estoqueCrítico && (
                            <span className="p-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Baixo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{ins.categoria}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        <span className={estoqueCrítico ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                          {ins.estoqueAtual.toFixed(2)}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400 uppercase">{ins.unidadeMedida}</span>
                        <div className="text-[10px] text-slate-500 font-sans">
                          Mín: {ins.estoqueMinimo} {ins.unidadeMedida}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        R$ {valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]">
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          {ins.fornecedor || 'Não definido'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Entrada Rapida - Somente Gestor */}
                          {!isColaborador && (
                            <button
                              onClick={() => { setQuickAddId(ins.id); setQuickQty(''); }}
                              className="p-1.5 bg-slate-50 hover:bg-brand-navy/5 text-brand-navy rounded-lg border border-slate-200 transition-all cursor-pointer"
                              title="Entrada Rapida de Compra"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          )}
                          {/* Editar - Somente Gestor */}
                          {!isColaborador && (
                            <button
                              onClick={() => handleOpenEdit(ins)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-all cursor-pointer"
                              title="Editar Insumo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          
                          {/* Deletar - Somente Gestor */}
                          {!isColaborador && (
                            <button
                              onClick={() => handleDelete(ins.id)}
                              className="p-1.5 bg-slate-50 hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-200 transition-all cursor-pointer"
                              title="Excluir Insumo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};