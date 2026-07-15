import React, { useEffect, useState } from 'react';
import { useStock } from '../context/StockContext';
import {
  AlertTriangle,
  CheckCircle,
  Edit2,
  History,
  Search,
  ShoppingCart,
  Trash2,
  X
} from 'lucide-react';

export const Vendas: React.FC = () => {
  const { fichas, registrarVenda, updateVenda, deleteVenda, vendas, insumos } = useStock();

  const [selectedFichaId, setSelectedFichaId] = useState<string | null>(null);
  const [quantidadeVenda, setQuantidadeVenda] = useState('1');
  const [editingVendaId, setEditingVendaId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const hoje = new Date().toISOString().slice(0, 10);
  const vendasHoje = vendas.filter(v => v.data.slice(0, 10) === hoje);
  const faturamentoHoje = vendasHoje.reduce((acc, v) => acc + v.receitaTotal, 0);
  const custoInsumosHoje = vendasHoje.reduce((acc, v) => acc + v.custoInsumosTotal, 0);
  const lucroHoje = faturamentoHoje - custoInsumosHoje;

  const normalizeText = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const normalizedSearch = normalizeText(searchTerm);
  const filteredFichas = fichas.filter(ficha => {
    if (!normalizedSearch) return true;
    return normalizeText(`${ficha.nome} ${ficha.descricao || ''} ${ficha.categoria}`).includes(normalizedSearch);
  });
  const selectedFicha = fichas.find(ficha => ficha.id === selectedFichaId);

  const closeVendaModal = () => {
    setSelectedFichaId(null);
    setEditingVendaId(null);
    setQuantidadeVenda('1');
    setErrorMsg('');
  };

  useEffect(() => {
    if (!selectedFichaId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedFichaId(null);
        setEditingVendaId(null);
        setQuantidadeVenda('1');
        setErrorMsg('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedFichaId]);

  const handleVenderSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFichaId || !quantidadeVenda) return;

    const qty = Number(quantidadeVenda);
    const ficha = fichas.find(item => item.id === selectedFichaId);
    if (!ficha) return;

    const result = editingVendaId
      ? updateVenda(editingVendaId, selectedFichaId, qty)
      : registrarVenda(selectedFichaId, qty);

    if (result.success) {
      setSuccessMsg(editingVendaId
        ? 'Venda atualizada com sucesso.'
        : `Venda de ${qty}x ${ficha.nome} registrada! Estoque de ingredientes deduzido.`);
      setErrorMsg('');
      setSelectedFichaId(null);
      setEditingVendaId(null);
      setQuantidadeVenda('1');
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(result.error || 'Erro desconhecido ao salvar venda.');
      setSuccessMsg('');
    }
  };

  const handleEditVenda = (id: string) => {
    const venda = vendas.find(item => item.id === id);
    if (!venda) return;
    setEditingVendaId(id);
    setSelectedFichaId(venda.fichaId);
    setQuantidadeVenda(venda.quantidade.toString());
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleDeleteVenda = (id: string) => {
    if (!window.confirm('Deseja excluir esta venda e devolver o consumo ao estoque?')) return;
    const result = deleteVenda(id);
    if (result.success) {
      if (editingVendaId === id) {
        setEditingVendaId(null);
        setSelectedFichaId(null);
        setQuantidadeVenda('1');
      }
      setSuccessMsg('Venda excluída e estoque restaurado.');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(result.error || 'Erro ao excluir venda.');
      setSuccessMsg('');
    }
  };

  return (
    <div className="space-y-6" id="vendas-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Integração de Vendas & Consumo</h2>
          <p className="text-xs text-slate-500">Simule vendas de pratos para deduzir automaticamente o estoque proporcional das fichas técnicas e apurar custos</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 shadow-sm" id="venda-success">
          <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && !selectedFicha && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 shadow-sm" id="venda-error">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <strong className="block font-bold text-rose-800">Bloqueio de Estoque!</strong>
            <span className="text-[11px] text-rose-600">{errorMsg}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Cardápio Disponível para Venda</span>
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Pesquisar produto..."
                aria-label="Pesquisar produto para venda e consumo"
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpar pesquisa" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700" title="Limpar pesquisa">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {fichas.length === 0 ? (
            <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-sm shadow-sm">
              Nenhuma ficha técnica cadastrada ainda. Crie fichas técnicas na guia anterior para simular vendas.
            </div>
          ) : filteredFichas.length === 0 ? (
            <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-sm shadow-sm">
              Nenhum produto encontrado para &quot;{searchTerm}&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="cardapio-vendas-grid">
              {filteredFichas.map(ficha => {
                let estoquePossivel = Infinity;
                ficha.ingredientes.forEach(ingrediente => {
                  const insumo = insumos.find(item => item.id === ingrediente.insumoId);
                  if (insumo) {
                    const quantidadePorPorcao = ingrediente.quantidade / (ficha.rendimentoPorcoes || 1);
                    const disponibilidade = quantidadePorPorcao > 0
                      ? insumo.estoqueAtual / quantidadePorPorcao
                      : Infinity;
                    if (disponibilidade < estoquePossivel) estoquePossivel = disponibilidade;
                  } else {
                    estoquePossivel = 0;
                  }
                });

                const maxVendasDisponiveis = Math.floor(estoquePossivel === Infinity ? 0 : estoquePossivel);
                const esgotado = maxVendasDisponiveis <= 0;

                return (
                  <button
                    type="button"
                    key={ficha.id}
                    disabled={esgotado}
                    onClick={() => {
                      setEditingVendaId(null);
                      setSelectedFichaId(ficha.id);
                      setQuantidadeVenda('1');
                      setErrorMsg('');
                    }}
                    aria-label={`Registrar venda de ${ficha.nome}`}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col justify-between h-40 relative group shadow-sm ${
                      esgotado
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-brand-navy/40 cursor-pointer hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-sm text-slate-800 group-hover:text-brand-navy transition-colors truncate max-w-[150px]">
                          {ficha.nome}
                        </span>
                        <span className="font-mono text-xs font-bold text-brand-navy shrink-0">
                          R$ {ficha.precoVenda.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {ficha.descricao || 'Sem descrição.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Estoque Estimado</span>
                      {esgotado ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[9px]">
                          Indisponível (Sem Insumos)
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[10px] font-mono">
                          {maxVendasDisponiveis} porções
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Resumo do Turno / Dia</span>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Faturamento Total:</span>
                <span className="font-bold text-slate-800">R$ {faturamentoHoje.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Custo CMV Teórico (Insumos):</span>
                <span className="font-bold text-slate-600">- R$ {custoInsumosHoje.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                <span className="text-xs font-bold text-slate-700">Lucro Bruto Simulado:</span>
                <span className="text-sm font-bold text-emerald-600">R$ {lucroHoje.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedFicha && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="venda-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeVendaModal();
          }}
        >
          <div className="w-full max-w-md bg-white border border-slate-200 p-6 rounded-xl shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <span className="text-[10px] font-bold text-brand-navy uppercase tracking-widest block">
                  {editingVendaId ? 'Editar Pedido' : 'Registro do Pedido'}
                </span>
                <h3 id="venda-modal-title" className="text-lg font-black text-slate-800 mt-1">{selectedFicha.nome}</h3>
              </div>
              <button
                type="button"
                onClick={closeVendaModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Fechar registro de venda"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleVenderSubmit} className="space-y-4" id="vendas-form">
              <div className="pb-3 border-b border-slate-100">
                <span className="text-xs text-slate-400 block">Valor unitário</span>
                <span className="text-sm font-bold font-mono text-brand-navy mt-1 block">
                  R$ {selectedFicha.precoVenda.toFixed(2)}
                </span>
              </div>

              <div>
                <label htmlFor="quantidade-venda" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Quantidade de Porções Vendidas *
                </label>
                <input
                  id="quantidade-venda"
                  type="number"
                  min="1"
                  step="1"
                  autoFocus
                  required
                  value={quantidadeVenda}
                  onChange={(event) => setQuantidadeVenda(event.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                  placeholder="Qtd"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs border border-slate-100">
                <span className="text-slate-500 font-semibold">Valor Total do Pedido:</span>
                <strong className="text-sm font-bold text-slate-800 font-mono">
                  R$ {((Number(quantidadeVenda || 1)) * selectedFicha.precoVenda).toFixed(2)}
                </strong>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeVendaModal}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <ShoppingCart className="w-4 h-4 text-brand-gold" />
                  {editingVendaId ? 'Salvar Venda' : 'Confirmar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="vendas-history-box">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-brand-navy" />
          <span className="text-xs font-bold text-slate-800">Últimas Vendas Processadas (Dedução de Estoque)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Horário da Venda</th>
                <th className="py-3 px-4">Item de Cardápio</th>
                <th className="py-3 px-4 text-right">Qtd</th>
                <th className="py-3 px-4 text-right">Valor Unitário</th>
                <th className="py-3 px-4 text-right">Receita Bruta</th>
                <th className="py-3 px-4 text-right">Custo de Matéria-Prima (CMV)</th>
                <th className="py-3 px-4 text-right">Margem Bruta (R$)</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {vendas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhuma venda processada nas últimas horas.
                  </td>
                </tr>
              ) : (
                vendas.map(venda => {
                  const margem = venda.receitaTotal - venda.custoInsumosTotal;
                  return (
                    <tr key={venda.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {new Date(venda.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{venda.fichaNome}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium">{venda.quantidade}x</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">R$ {venda.precoVendaUnitario.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">R$ {venda.receitaTotal.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600">- R$ {venda.custoInsumosTotal.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">R$ {margem.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditVenda(venda.id)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-all cursor-pointer"
                            title="Editar venda"
                            aria-label={`Editar venda de ${venda.fichaNome}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVenda(venda.id)}
                            className="p-1.5 bg-slate-50 hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-200 transition-all cursor-pointer"
                            title="Excluir venda"
                            aria-label={`Excluir venda de ${venda.fichaNome}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
