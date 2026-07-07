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

export const Movimentacoes: React.FC = () => {
  const { user, movimentacoes, insumos, addMovimentacao, updateMovimentacao, deleteMovimentacao } = useStock();
  const isColaborador = user.cargo === 'Colaborador';

  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'todos' | 'entrada' | 'saida' | 'desperdicio' | 'ajuste'>('todos');

  // Estados do formulário de lançamento
  const [showForm, setShowForm] = useState(false);
  const [editingMovId, setEditingMovId] = useState<string | null>(null);
  const [insumoId, setInsumoId] = useState('');
  const [tipo, setTipo] = useState<'entrada' | 'saida' | 'desperdicio' | 'ajuste'>(() => isColaborador ? 'saida' : 'entrada');
  const [quantidade, setQuantidade] = useState('');
  const [custoUnitario, setCustoUnitario] = useState('');
  const [observacao, setObservacao] = useState('');

  // Feedbacks
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isColaborador && (tipo === 'entrada' || tipo === 'ajuste')) {
      setErrorMsg('Colaboradores podem registrar apenas saidas e desperdicios.');
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

    const payload = {
      insumoId,
      tipo,
      quantidade: qty,
      custoUnitario: custoUnitario ? Number(custoUnitario) : undefined,
      observacao: observacao || undefined
    };

    const result = editingMovId ? updateMovimentacao(editingMovId, payload) : (addMovimentacao(payload), { success: true });
    if (!result.success) {
      setErrorMsg(result.error || 'Erro ao salvar movimentacao.');
      setSuccessMsg('');
      return;
    }

    setInsumoId('');
    setQuantidade('');
    setCustoUnitario('');
    setObservacao('');
    setEditingMovId(null);
    setShowForm(false);
    setErrorMsg('');
    setSuccessMsg(editingMovId ? 'Movimentacao atualizada com sucesso!' : 'Movimentacao registrada com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };


  const handleOpenCreate = () => {
    setEditingMovId(null);
    setInsumoId('');
    setTipo(isColaborador ? 'saida' : 'entrada');
    setQuantidade('');
    setCustoUnitario('');
    setObservacao('');
    setErrorMsg('');
    setShowForm(true);
  };

  const handleOpenEdit = (id: string) => {
    const mov = movimentacoes.find(m => m.id === id);
    if (!mov) return;
    if (isColaborador && (mov.tipo === 'entrada' || mov.tipo === 'ajuste')) {
      setErrorMsg('Colaboradores podem editar apenas saidas e desperdicios.');
      return;
    }
    setEditingMovId(id);
    setInsumoId(mov.insumoId);
    setTipo(mov.tipo);
    setQuantidade(mov.quantidade.toString());
    setCustoUnitario(mov.custoUnitario?.toString() || '');
    setObservacao(mov.observacao || '');
    setErrorMsg('');
    setShowForm(true);
  };

  const handleDeleteMov = (id: string) => {
    const mov = movimentacoes.find(m => m.id === id);
    if (!mov) return;
    if (isColaborador && (mov.tipo === 'entrada' || mov.tipo === 'ajuste')) {
      setErrorMsg('Colaboradores podem excluir apenas saidas e desperdicios.');
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
    return matchesSearch && matchesType;
  });

  // Somatórias baseadas nos filtros/histórico
  const totalEntradasR$ = movimentacoes
    .filter(m => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.custoTotal, 0);

  const totalDesperdicioR$ = movimentacoes
    .filter(m => m.tipo === 'desperdicio')
    .reduce((acc, m) => acc + m.custoTotal, 0);

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
        <button
          onClick={() => showForm ? setShowForm(false) : handleOpenCreate()}
          className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all hover:scale-[1.01] cursor-pointer self-start sm:self-auto"
          id="btn-lancar-mov"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Registrar Movimentação
        </button>
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
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Total de Entradas (Compras)</span>
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
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Prejuízo por Desperdício Registrado</span>
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

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Lançamento *</label>
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as any);
                  if (e.target.value !== 'entrada') setCustoUnitario('');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 cursor-pointer"
              >
                {!isColaborador && <option value="entrada">Entrada (Compra / Reposicao)</option>}
                <option value="saida">Saída (Consumo / Brinde / Degustação)</option>
                <option value="desperdicio">Desperdício (Perda / Erro / Preparo)</option>
                {!isColaborador && <option value="ajuste">Ajuste de Estoque (Inventario Fisico)</option>}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Insumo Afetado *</label>
              <select
                value={insumoId}
                onChange={(e) => setInsumoId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 cursor-pointer"
                required
              >
                <option value="">-- Escolha um Insumo --</option>
                {insumos.map(ins => (
                  <option key={ins.id} value={ins.id}>
                    {ins.nome} (Estoque atual: {ins.estoqueAtual} {ins.unidadeMedida})
                  </option>
                ))}
              </select>
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

            <div className="md:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-150 mt-2">
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
        <div className="bg-slate-50/50 p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar histórico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
            />
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
                <th className="py-3.5 px-4 text-center">Acoes</th>
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
                filteredMovs.map(m => {
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
