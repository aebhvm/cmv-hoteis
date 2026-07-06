import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { 
  ShoppingBag, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  RefreshCw, 
  ShoppingCart, 
  DollarSign, 
  History, 
  Calendar,
  X
} from 'lucide-react';

export const Vendas: React.FC = () => {
  const { fichas, registrarVenda, vendas, insumos } = useStock();

  // Estados do PDV Simulado
  const [selectedFichaId, setSelectedFichaId] = useState<string | null>(null);
  const [quantidadeVenda, setQuantidadeVenda] = useState('1');

  // Feedbacks
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Receita acumulada e margem bruta das vendas registradas hoje
  const hoje = new Date().toISOString().slice(0, 10);
  const vendasHoje = vendas.filter(v => v.data.slice(0, 10) === hoje);
  const faturamentoHoje = vendasHoje.reduce((acc, v) => acc + v.receitaTotal, 0);
  const custoInsumosHoje = vendasHoje.reduce((acc, v) => acc + v.custoInsumosTotal, 0);
  const lucroHoje = faturamentoHoje - custoInsumosHoje;

  const handleVenderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFichaId || !quantidadeVenda) return;

    const qty = Number(quantidadeVenda);
    const f = fichas.find(fic => fic.id === selectedFichaId);
    if (!f) return;

    const result = registrarVenda(selectedFichaId, qty);

    if (result.success) {
      setSuccessMsg(`Venda de ${qty}x ${f.nome} registrada! Estoque de ingredientes deduzido.`);
      setErrorMsg('');
      setSelectedFichaId(null);
      setQuantidadeVenda('1');
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(result.error || 'Erro desconhecido ao registrar venda.');
      setSuccessMsg('');
    }
  };

  return (
    <div className="space-y-6" id="vendas-view">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Integração de Vendas & Consumo</h2>
          <p className="text-xs text-slate-500">Simule vendas de pratos para deduzir automaticamente o estoque proporcional das fichas técnicas e apurar custos</p>
        </div>
      </div>

      {/* Feedbacks de Venda */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 shadow-sm" id="venda-success">
          <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 shadow-sm" id="venda-error">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <strong className="block font-bold text-rose-800">Bloqueio de Estoque!</strong>
            <span className="text-[11px] text-rose-600">{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Painel de Vendas / PDV */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Esquerda: Grid de Pratos do Cardápio */}
        <div className="lg:col-span-2 space-y-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-semibold">Cardápio Disponível para Venda</span>
          
          {fichas.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-sm shadow-sm">
              Nenhuma ficha técnica cadastrada ainda. Crie fichas técnicas na guia anterior para simular vendas.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="cardapio-vendas-grid">
              {fichas.map(f => {
                // Verificar disponibilidade de estoque estimativa rápida
                let estoquePossivel = Infinity;
                f.ingredientes.forEach(ing => {
                  const ins = insumos.find(i => i.id === ing.insumoId);
                  if (ins) {
                    const porcaoIng = ing.quantidade / (f.rendimentoPorcoes || 1);
                    const possivelParaEste = ins.estoqueAtual / porcaoIng;
                    if (possivelParaEste < estoquePossivel) {
                      estoquePossivel = possivelParaEste;
                    }
                  } else {
                    estoquePossivel = 0;
                  }
                });

                const maxVendasDisponiveis = Math.floor(estoquePossivel === Infinity ? 0 : estoquePossivel);
                const esgotado = maxVendasDisponiveis <= 0;

                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      if (!esgotado) {
                        setSelectedFichaId(f.id);
                        setQuantidadeVenda('1');
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between h-40 relative group shadow-sm ${
                      esgotado 
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                        : selectedFichaId === f.id 
                        ? 'bg-brand-navy/5 border-brand-navy cursor-pointer ring-1 ring-brand-navy' 
                        : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer hover:scale-[1.01]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-sm text-slate-800 group-hover:text-brand-navy transition-colors truncate max-w-[150px]">
                          {f.nome}
                        </span>
                        <span className="font-mono text-xs font-bold text-brand-navy">
                          R$ {f.precoVenda.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {f.descricao || 'Sem descrição.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                        Estoque Estimado
                      </span>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Direita: Painel de Venda Ativa e Relatório do Dia */}
        <div className="space-y-6">
          {/* Caixa de Checkout de Venda Ativa */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-brand-navy uppercase tracking-widest block mb-4">Registro do Pedido</span>
            
            {selectedFichaId ? (
              <form onSubmit={handleVenderSubmit} className="space-y-4" id="vendas-form">
                <div className="pb-3 border-b border-slate-100">
                  <span className="text-xs text-slate-400 block">Item Selecionado:</span>
                  <strong className="text-base text-slate-800 font-black block mt-0.5">
                    {fichas.find(f => f.id === selectedFichaId)?.nome}
                  </strong>
                  <span className="text-xs font-bold font-mono text-brand-navy mt-1 block">
                    R$ {fichas.find(f => f.id === selectedFichaId)?.precoVenda.toFixed(2)} / un
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Quantidade de Porções Vendidas *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantidadeVenda}
                    onChange={(e) => setQuantidadeVenda(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                    placeholder="Qtd"
                  />
                </div>

                {/* Subtotal da venda */}
                <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs border border-slate-100">
                  <span className="text-slate-500 font-semibold">Valor Total do Pedido:</span>
                  <strong className="text-sm font-bold text-slate-800 font-mono">
                    R$ {((Number(quantidadeVenda || 1)) * (fichas.find(f => f.id === selectedFichaId)?.precoVenda || 0)).toFixed(2)}
                  </strong>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFichaId(null)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4 text-brand-gold" />
                    Confirmar Venda
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <ShoppingCart className="w-10 h-10 text-slate-300 opacity-60" />
                <span>Clique em um prato do cardápio ao lado para abrir a caixa registradora e registrar a venda.</span>
              </div>
            )}
          </div>

          {/* Resumo do Dia */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
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

      {/* Histórico Recente de Vendas */}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {vendas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhuma venda processada nas últimas horas.
                  </td>
                </tr>
              ) : (
                vendas.map(v => {
                  const margem = v.receitaTotal - v.custoInsumosTotal;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {new Date(v.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{v.fichaNome}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium">{v.quantidade}x</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">R$ {v.precoVendaUnitario.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">R$ {v.receitaTotal.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600">- R$ {v.custoInsumosTotal.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">R$ {margem.toFixed(2)}</td>
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
