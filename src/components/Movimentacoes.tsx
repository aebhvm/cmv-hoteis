import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Edit2,
  SlidersHorizontal, 
  FileText, 
  Calendar, 
  AlertOctagon, 
  Sparkles,
  CheckCircle,
  HelpCircle,
  X
} from 'lucide-react';

const toLocalDateKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMovementIso = (dateKey: string, previousDate?: string) => {
  const base = previousDate ? new Date(previousDate) : new Date();
  const [year, month, day] = dateKey.split('-').map(Number);
  base.setFullYear(year, month - 1, day);
  return base.toISOString();
};

export const Movimentacoes: React.FC = () => {
  const { user, movimentacoes, insumos, addMovimentacao, updateMovimentacao, deleteMovimentacao } = useStock();
  const isColaborador = user.cargo === 'Colaborador';

  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'todos' | 'entrada' | 'saida' | 'desperdicio' | 'ajuste'>('todos');
  const [selectedDate, setSelectedDate] = useState('');

  // Estados do formulário de lançamento
  const [showForm, setShowForm] = useState(false);
  const [editingMovId, setEditingMovId] = useState<string | null>(null);
  const [insumoId, setInsumoId] = useState('');
  const [insumoSearchTerm, setInsumoSearchTerm] = useState('');
  const [showInsumoSugestoes, setShowInsumoSugestoes] = useState(false);
  const [tipo, setTipo] = useState<'entrada' | 'saida' | 'desperdicio' | 'ajuste'>('entrada');
  const [quantidade, setQuantidade] = useState('');
  const [custoUnitario, setCustoUnitario] = useState('');
  const [observacao, setObservacao] = useState('');
  const [dataMovimentacao, setDataMovimentacao] = useState(() => toLocalDateKey(new Date()));

  // Feedbacks
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const normalizeSearch = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const insumoSugestoes = insumoSearchTerm.trim()
    ? [...insumos]
        .filter(ins => normalizeSearch(ins.nome).includes(normalizeSearch(insumoSearchTerm)))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .slice(0, 8)
    : [];

  const handleSelectInsumo = (selectedId: string) => {
    const ins = insumos.find(item => item.id === selectedId);
    if (!ins) return;
    setInsumoId(ins.id);
    setInsumoSearchTerm(ins.nome);
    setCustoUnitario(ins.custoMedio.toString());
    setShowInsumoSugestoes(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isColaborador && tipo === 'ajuste') {
      setErrorMsg('Ajustes de estoque são exclusivos do Gestor.');
      return;
    }

    if (!insumoId || !quantidade) {
      setErrorMsg('Por favor, preencha o insumo e a quantidade.');
      return;
    }

    const ins = insumos.find(i => i.id === insumoId);
    if (!ins) {
      setErrorMsg('Insumo inválido.');
      return;
    }

    // Validar se quantidade é suficiente para saídas/desperdícios
    const qty = Number(quantidade);
    if (!editingMovId && tipo !== 'entrada' && tipo !== 'ajuste' && ins.estoqueAtual < qty) {
      setErrorMsg(`Estoque insuficiente! Estoque atual de ${ins.nome} é de ${ins.estoqueAtual} ${ins.unidadeMedida}.`);
      return;
    }

    const originalMov = editingMovId ? movimentacoes.find(m => m.id === editingMovId) : undefined;
    const payload = {
      insumoId,
      tipo,
      quantidade: qty,
      custoUnitario: custoUnitario ? Number(custoUnitario) : undefined,
      observacao: observacao || undefined,
      data: toMovementIso(dataMovimentacao, originalMov?.data)
    };

    const result = editingMovId ? updateMovimentacao(editingMovId, payload) : (addMovimentacao(payload), { success: true });
    if (!result.success) {
      setErrorMsg(result.error || 'Erro ao salvar movimentacao.');
      setSuccessMsg('');
      return;
    }

    setInsumoId('');
    setInsumoSearchTerm('');
    setShowInsumoSugestoes(false);
    setQuantidade('');
    setCustoUnitario('');
    setObservacao('');
    setEditingMovId(null);
    setShowForm(false);
    setErrorMsg('');
    setDataMovimentacao(toLocalDateKey(new Date()));
    setSuccessMsg(editingMovId ? 'Movimentacao atualizada com sucesso!' : 'Movimentacao registrada com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };


  const handleOpenCreate = (initialType: 'entrada' | 'saida' = 'entrada') => {
    setEditingMovId(null);
    setInsumoId('');
    setInsumoSearchTerm('');
    setShowInsumoSugestoes(false);
    setTipo(initialType);
    setQuantidade('');
    setCustoUnitario('');
    setObservacao('');
    setErrorMsg('');
    setDataMovimentacao(toLocalDateKey(new Date()));
    setShowForm(true);
  };

  const handleOpenEdit = (id: string) => {
    const mov = movimentacoes.find(m => m.id === id);
    if (!mov) return;
    if (isColaborador && mov.tipo === 'ajuste') {
      setErrorMsg('Ajustes de estoque são exclusivos do Gestor.');
      return;
    }
    setEditingMovId(id);
    setInsumoId(mov.insumoId);
    setInsumoSearchTerm(insumos.find(item => item.id === mov.insumoId)?.nome || mov.insumoNome);
    setShowInsumoSugestoes(false);
    setTipo(mov.tipo);
    setQuantidade(mov.quantidade.toString());
    setCustoUnitario(mov.custoUnitario?.toString() || '');
    setObservacao(mov.observacao || '');
    setErrorMsg('');
    setDataMovimentacao(toLocalDateKey(mov.data));
    setShowForm(true);
  };

  const handleDeleteMov = (id: string) => {
    const mov = movimentacoes.find(m => m.id === id);
    if (!mov) return;
    if (isColaborador && mov.tipo === 'ajuste') {
      setErrorMsg('Ajustes de estoque são exclusivos do Gestor.');
      return;
    }
    if (!window.confirm('Deseja excluir esta movimentacao e reverter o estoque?')) return;
    const result = deleteMovimentacao(id);
    if (result.success) {
      if (editingMovId === id) {
        setEditingMovId(null);
        setShowForm(false);
      }
      setSuccessMsg('Movimentacao excluida com sucesso.');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(result.error || 'Erro ao excluir movimentacao.');
      setSuccessMsg('');
    }
  };

  // Filtragem
  const filteredMovs = movimentacoes.filter(m => {
    const matchesSearch = m.insumoNome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.observacao && m.observacao.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'todos' || m.tipo === selectedType;
    const matchesDate = !selectedDate || toLocalDateKey(m.data) === selectedDate;
    return matchesSearch && matchesType && matchesDate;
  }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const groupedMovs = filteredMovs.reduce<Array<{ dateKey: string; items: typeof filteredMovs }>>((groups, mov) => {
    const dateKey = toLocalDateKey(mov.data);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.dateKey === dateKey) lastGroup.items.push(mov);
    else groups.push({ dateKey, items: [mov] });
    return groups;
  }, []);

  const movimentosDaData = movimentacoes.filter(m => !selectedDate || toLocalDateKey(m.data) === selectedDate);
  const totalEntradasR$ = movimentosDaData
    .filter(m => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.custoTotal, 0);

  const totalDesperdicioR$ = movimentosDaData
    .filter(m => m.tipo === 'desperdicio')
    .reduce((acc, m) => acc + m.custoTotal, 0);
  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR')
    : 'Todo o período';

  const getTipoEstilo = (tipo: string) => {
    switch(tipo) {
      case 'entrada': 
        return { text: 'Entrada / Compra', bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' };
      case 'saida': 
        return { text: 'Saída / Consumo', bg: 'bg-brand-navy/5 text-brand-navy border border-brand-navy/10 font-medium' };
      case 'desperdicio': 
        return { text: 'Desperdício', bg: 'bg-rose-50 text-rose-700 border border-rose-200/60 font-bold' };
      case 'ajuste': 
        return { text: 'Ajuste Físico', bg: 'bg-amber-50 text-amber-700 border border-amber-200/60' };
      default: 
        return { text: tipo, bg: 'bg-slate-50 text-slate-700 border border-slate-200' };
    }
  };

  const getSinalSufixo = (tipo: string) => {
    if (tipo === 'entrada') return '+';
    if (tipo === 'saida' || tipo === 'desperdicio') return '-';
    return ''; // ajuste pode ser qualquer um
  };

  return (
    <div className="space-y-6" id="movimentacoes-view">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Fluxo de Entradas, Saídas e Perdas</h2>
          <p className="text-xs text-slate-500">Lance compras, registre quebras ou desperdícios e audite o histórico de movimentações do restaurante</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleOpenCreate('entrada')}
            className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
            id="btn-lancar-mov"
          >
            {isColaborador ? <TrendingUp className="w-4 h-4 stroke-[2.5]" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
            {isColaborador ? 'Entrada' : 'Registrar Movimentação'}
          </button>
          {isColaborador && (
            <button
              onClick={() => handleOpenCreate('saida')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              id="btn-lancar-saida"
            >
              <TrendingDown className="w-4 h-4 text-rose-600 stroke-[2.5]" />
              Saída
            </button>
          )}
        </div>
      </div>

      {/* Feedbacks */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 shadow-sm" id="mov-success">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 shadow-sm" id="mov-error">
          <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600" />
          {errorMsg}
        </div>
      )}

      {/* Grid de Totais Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Entradas - {selectedDateLabel}</span>
            <span className="text-xl font-black text-slate-800 font-mono mt-1">
              R$ {totalEntradasR$.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Desperdício - {selectedDateLabel}</span>
            <span className="text-xl font-black text-rose-600 font-mono mt-1">
              R$ {totalDesperdicioR$.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Formulário de Registro de Movimentação */}
      {showForm && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md animate-fadeIn" id="mov-form">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-navy" />
              Lançar Novo Registro de Estoque
            </h3>
            <button 
              onClick={() => { setShowForm(false); setEditingMovId(null); }}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Lançamento *</label>
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as any);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 cursor-pointer"
              >
                <option value="entrada">Entrada (Compra / Reposicao)</option>
                <option value="saida">Saída (Consumo / Brinde / Degustação)</option>
                <option value="desperdicio">Desperdício (Perda / Erro / Preparo)</option>
                {!isColaborador && <option value="ajuste">Ajuste de Estoque (Inventario Fisico)</option>}
              </select>
            </div>

            <div>
              <label htmlFor="data-movimentacao" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data da Movimentação *</label>
              <input
                id="data-movimentacao"
                type="date"
                value={dataMovimentacao}
                onChange={(e) => setDataMovimentacao(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 cursor-pointer"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="mov-produto-search" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Produto *</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="mov-produto-search"
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showInsumoSugestoes && Boolean(insumoSearchTerm.trim())}
                  aria-controls="mov-insumo-sugestoes"
                  value={insumoSearchTerm}
                  onChange={(e) => {
                    setInsumoSearchTerm(e.target.value);
                    setInsumoId('');
                    setCustoUnitario('');
                    setShowInsumoSugestoes(true);
                  }}
                  onFocus={() => setShowInsumoSugestoes(true)}
                  onBlur={() => window.setTimeout(() => setShowInsumoSugestoes(false), 120)}
                  className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                  placeholder="Digite o nome do produto..."
                  autoComplete="off"
                  required
                />
                {insumoSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setInsumoSearchTerm('');
                      setInsumoId('');
                      setCustoUnitario('');
                      setShowInsumoSugestoes(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    aria-label="Limpar produto"
                    title="Limpar produto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {showInsumoSugestoes && insumoSearchTerm.trim() && (
                  <div id="mov-insumo-sugestoes" role="listbox" className="absolute z-40 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl divide-y divide-slate-100">
                    {insumoSugestoes.length > 0 ? (
                      insumoSugestoes.map(ins => (
                        <button
                          key={ins.id}
                          type="button"
                          role="option"
                          aria-selected={ins.id === insumoId}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectInsumo(ins.id)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <span className="block text-xs font-bold text-slate-800 break-words">{ins.nome}</span>
                          <span className="block text-[10px] text-slate-500 font-mono">
                            Estoque: {ins.estoqueAtual} {ins.unidadeMedida} - Custo: R$ {ins.custoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-xs text-slate-400">Nenhum produto encontrado.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quantidade *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                    placeholder="ex: 2.5"
                    required
                  />
                  {insumoId && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 uppercase font-bold">
                      {insumos.find(i => i.id === insumoId)?.unidadeMedida}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {tipo === 'entrada' ? 'Custo Unitário (R$) *' : 'Custo Unit. (Opcional)'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={custoUnitario}
                  onChange={(e) => setCustoUnitario(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                  placeholder="R$ 0.00"
                  disabled={tipo !== 'entrada' && tipo !== 'ajuste'}
                  required={tipo === 'entrada'}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Motivo / Detalhes / Fornecedor</label>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                placeholder={
                  tipo === 'desperdicio' 
                    ? 'ex: Molho estragou na geladeira' 
                    : tipo === 'entrada' 
                    ? 'ex: Frigorífico Boi Nobre, NF-458' 
                    : 'Mais detalhes sobre a movimentação...'
                }
              />
            </div>

            <div className="md:col-span-6 flex justify-end gap-2 pt-2 border-t border-slate-150 mt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingMovId(null); }}
                className="px-4 py-1.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm"
              >
                Gravar Lançamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabela do Histórico */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="movimentacoes-table-box">
        {/* Filtros da Tabela */}
        <div className="bg-slate-50/50 p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-3 justify-between lg:items-center">
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar histórico..."
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
            <div className="flex gap-1.5">
              <div className="relative flex-1 sm:w-44">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  aria-label="Filtrar movimentações por data"
                  className="w-full pl-9 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 cursor-pointer"
                />
              </div>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  title="Mostrar todas as datas"
                  aria-label="Limpar filtro de data"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['todos', 'entrada', 'saida', 'desperdicio', 'ajuste'].map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  selectedType === t 
                    ? 'bg-brand-navy text-white shadow-sm' 
                    : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {t === 'todos' ? 'Todos' : t === 'entrada' ? 'Entradas' : t === 'saida' ? 'Saídas' : t === 'desperdicio' ? 'Desperdício' : 'Ajustes'}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Data / Hora</th>
                <th className="py-3.5 px-4">Insumo</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4 text-right">Quantidade</th>
                <th className="py-3.5 px-4 text-right">Custo Unitário</th>
                <th className="py-3.5 px-4 text-right">Custo/Impacto Total</th>
                <th className="py-3.5 px-4">Motivo / Detalhes</th>
                <th className="py-3.5 px-4 text-center sticky right-0 z-10 bg-slate-50">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {filteredMovs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Nenhuma movimentação registrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                groupedMovs.map(group => (
                  <React.Fragment key={group.dateKey}>
                    <tr className="bg-slate-50/80 border-y border-slate-200">
                      <td colSpan={8} className="px-4 py-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-brand-navy" />
                          {new Date(`${group.dateKey}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                          <span className="text-slate-400">({group.items.length})</span>
                        </div>
                      </td>
                    </tr>
                    {group.items.map(m => {
                  const dataObj = new Date(m.data);
                  const dataFormatada = dataObj.toLocaleDateString('pt-BR');
                  const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  
                  const estiloBadge = getTipoEstilo(m.tipo);
                  const ins = insumos.find(i => i.id === m.insumoId);
                  const sinal = getSinalSufixo(m.tipo);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <div>
                            <span className="font-semibold text-slate-700 block">{dataFormatada}</span>
                            <span className="text-[10px] font-mono">{horaFormatada}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{m.insumoNome}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${estiloBadge.bg}`}>
                          {estiloBadge.text}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium">
                        <span className={m.tipo === 'desperdicio' ? 'text-rose-600 font-semibold' : m.tipo === 'entrada' ? 'text-emerald-600 font-semibold' : 'text-slate-700'}>
                          {sinal}{m.quantidade.toFixed(2)}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400 uppercase">{ins?.unidadeMedida || ''}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        {m.custoUnitario ? `R$ ${m.custoUnitario.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                        R$ {m.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate" title={m.observacao}>
                        {m.observacao || <span className="text-slate-300 italic">Sem observações</span>}
                      </td>

                      <td className="py-3.5 px-4 text-center sticky right-0 bg-white shadow-[-8px_0_12px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-brand-navy"
                            title="Editar movimentacao"
                            aria-label="Editar movimentacao"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMov(m.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition-all hover:bg-rose-100"
                            title="Excluir movimentacao"
                            aria-label="Excluir movimentacao"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
