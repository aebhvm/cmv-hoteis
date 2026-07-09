import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Insumo, FichaTecnica, Movimentacao, VendaLog, UserProfile } from '../types';
import {
  INITIAL_USER,
  INITIAL_INSUMOS,
  INITIAL_FICHAS,
  INITIAL_MOVIMENTACOES,
  INITIAL_VENDAS
} from '../data/mockData';

interface StockContextType {
  user: UserProfile;
  currentUnit: 'AeB Villa Mayor' | 'VM Cumbuco';
  setCurrentUnit: (unit: 'AeB Villa Mayor' | 'VM Cumbuco') => void;
  insumos: Insumo[];
  fichas: FichaTecnica[];
  movimentacoes: Movimentacao[];
  vendas: VendaLog[];
  updateUser: (profile: Partial<UserProfile>) => void;
  addInsumo: (insumo: Omit<Insumo, 'id'>) => void;
  updateInsumo: (id: string, insumo: Partial<Insumo>) => void;
  deleteInsumo: (id: string) => boolean;
  addMovimentacao: (mov: {
    insumoId: string;
    tipo: 'entrada' | 'saida' | 'desperdicio' | 'ajuste';
    quantidade: number;
    custoUnitario?: number;
    observacao?: string;
  }) => void;
  updateMovimentacao: (id: string, mov: {
    insumoId: string;
    tipo: 'entrada' | 'saida' | 'desperdicio' | 'ajuste';
    quantidade: number;
    custoUnitario?: number;
    observacao?: string;
  }) => { success: boolean; error?: string };
  deleteMovimentacao: (id: string) => { success: boolean; error?: string };
  addFicha: (ficha: Omit<FichaTecnica, 'id'>) => void;
  updateFicha: (id: string, ficha: Partial<FichaTecnica>) => void;
  deleteFicha: (id: string) => void;
  registrarVenda: (fichaId: string, quantidade: number) => { success: boolean; error?: string };
  updateVenda: (id: string, fichaId: string, quantidade: number) => { success: boolean; error?: string };
  deleteVenda: (id: string) => { success: boolean; error?: string };
  getFichaCusto: (ficha: FichaTecnica) => number;
  resetData: () => void;
  importarDados: (jsonString: string) => boolean;
  exportarDados: () => string;
  users: Array<UserProfile & { senha?: string }>;
  registerUser: (newUser: UserProfile & { senha?: string }) => void;
  deleteUser: (email: string) => void;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) throw new Error('useStock deve ser usado dentro de um StockProvider');
  return context;
};


type Unidade = 'AeB Villa Mayor' | 'VM Cumbuco';

type AppStateSnapshot = {
  currentUnit: Unidade;
  user: UserProfile;
  users: Array<UserProfile & { senha?: string }>;
  allInsumos: Insumo[];
  allFichas: FichaTecnica[];
  allMovimentacoes: Movimentacao[];
  allVendas: VendaLog[];
};

const DEFAULT_USERS: Array<UserProfile & { senha?: string }> = [
  {
    id: 'user-1',
    nome: 'Ataide Silveira',
    email: 'gerenteataide@gmail.com',
    cargo: 'Gestor',
    estabelecimento: 'AeB Villa Mayor',
    metaFCP: 30,
    senha: '123456'
  },
  {
    id: 'user-2',
    nome: 'Carlos Souza',
    email: 'colaborador@vmhoteis.com',
    cargo: 'Colaborador',
    estabelecimento: 'AeB Villa Mayor',
    metaFCP: 30,
    senha: '123456'
  }
];

const buildInitialCollections = () => {
  const villaMayorInsumos = INITIAL_INSUMOS.map(i => ({ ...i, unidade: 'AeB Villa Mayor' }));
  const cumbucoInsumos = INITIAL_INSUMOS.map(i => ({
    ...i,
    id: i.id + '-cumbuco',
    unidade: 'VM Cumbuco'
  }));

  const villaMayorFichas = INITIAL_FICHAS.map(f => ({ ...f, unidade: 'AeB Villa Mayor' }));
  const cumbucoFichas = INITIAL_FICHAS.map(f => ({
    ...f,
    id: f.id + '-cumbuco',
    unidade: 'VM Cumbuco',
    ingredientes: f.ingredientes.map(ing => ({
      ...ing,
      insumoId: ing.insumoId + '-cumbuco'
    }))
  }));

  const villaMayorMovs = INITIAL_MOVIMENTACOES.map(m => ({ ...m, unidade: 'AeB Villa Mayor' }));
  const cumbucoMovs = INITIAL_MOVIMENTACOES.map(m => ({
    ...m,
    id: m.id + '-cumbuco',
    insumoId: m.insumoId + '-cumbuco',
    unidade: 'VM Cumbuco'
  }));

  const villaMayorVendas = INITIAL_VENDAS.map(v => ({ ...v, unidade: 'AeB Villa Mayor' }));
  const cumbucoVendas = INITIAL_VENDAS.map(v => ({
    ...v,
    id: v.id + '-cumbuco',
    fichaId: v.fichaId + '-cumbuco',
    unidade: 'VM Cumbuco'
  }));

  return {
    allInsumos: [...villaMayorInsumos, ...cumbucoInsumos],
    allFichas: [...villaMayorFichas, ...cumbucoFichas],
    allMovimentacoes: [...villaMayorMovs, ...cumbucoMovs],
    allVendas: [...villaMayorVendas, ...cumbucoVendas]
  };
};


const readJsonStorage = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const roundMoneyUp = (value: number) => Math.ceil((value - 1e-9) * 100) / 100;

const getInsumoUnitCost = (insumo: Insumo) => {
  if (insumo.valorEmbalagem !== undefined && insumo.conteudoEmbalagem && insumo.conteudoEmbalagem > 0) {
    return roundMoneyUp(insumo.valorEmbalagem / insumo.conteudoEmbalagem);
  }
  return insumo.custoMedio;
};

const getInsumoQuantityCost = (insumo: Insumo, quantidade: number) => {
  if (insumo.valorEmbalagem !== undefined && insumo.conteudoEmbalagem && insumo.conteudoEmbalagem > 0) {
    return roundMoneyUp((insumo.valorEmbalagem * quantidade) / insumo.conteudoEmbalagem);
  }
  return quantidade * insumo.custoMedio;
};

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const remoteStateReadyRef = useRef(false);

  const [currentUnit, setCurrentUnitState] = useState<Unidade>(() => {
    const saved = localStorage.getItem('chef_current_unit');
    return (saved as Unidade) || 'AeB Villa Mayor';
  });

  const [user, setUser] = useState<UserProfile>(() => {
    const u = readJsonStorage<UserProfile>('chef_user', INITIAL_USER);
    return { ...u, estabelecimento: currentUnit };
  });

  const [users, setUsers] = useState<Array<UserProfile & { senha?: string }>>(() =>
    readJsonStorage<Array<UserProfile & { senha?: string }>>('chef_registered_users', DEFAULT_USERS)
  );

  useEffect(() => {
    localStorage.setItem('chef_registered_users', JSON.stringify(users));
  }, [users]);

  const registerUser = (newUser: UserProfile & { senha?: string }) => {
    setUsers(prev => {
      const exists = prev.findIndex(u => u.email.toLowerCase() === newUser.email.toLowerCase());
      const completeUser = { ...newUser, id: newUser.id || `user-${Date.now()}` };
      if (exists !== -1) {
        const updated = [...prev];
        updated[exists] = { ...updated[exists], ...completeUser };
        return updated;
      }
      return [...prev, completeUser];
    });
  };

  const deleteUser = (email: string) => {
    setUsers(prev => prev.filter(u => u.email.toLowerCase() !== email.toLowerCase()));
  };

  // Master lists containing items for all units
  const initialCollections = buildInitialCollections();

  const [allInsumos, setAllInsumos] = useState<Insumo[]>(() =>
    readJsonStorage<Insumo[]>('chef_all_insumos', initialCollections.allInsumos)
  );

  const [allFichas, setAllFichas] = useState<FichaTecnica[]>(() =>
    readJsonStorage<FichaTecnica[]>('chef_all_fichas', initialCollections.allFichas)
  );

  const [allMovimentacoes, setAllMovimentacoes] = useState<Movimentacao[]>(() =>
    readJsonStorage<Movimentacao[]>('chef_all_movimentacoes', initialCollections.allMovimentacoes)
  );

  const [allVendas, setAllVendas] = useState<VendaLog[]>(() =>
    readJsonStorage<VendaLog[]>('chef_all_vendas', initialCollections.allVendas)
  );

  // Persist master states
  useEffect(() => {
    localStorage.setItem('chef_current_unit', currentUnit);
    setUser(prev => ({ ...prev, estabelecimento: currentUnit }));
  }, [currentUnit]);

  useEffect(() => {
    localStorage.setItem('chef_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('chef_all_insumos', JSON.stringify(allInsumos));
  }, [allInsumos]);

  useEffect(() => {
    localStorage.setItem('chef_all_fichas', JSON.stringify(allFichas));
  }, [allFichas]);

  useEffect(() => {
    localStorage.setItem('chef_all_movimentacoes', JSON.stringify(allMovimentacoes));
  }, [allMovimentacoes]);

  useEffect(() => {
    localStorage.setItem('chef_all_vendas', JSON.stringify(allVendas));
  }, [allVendas]);


  const buildSnapshot = (): AppStateSnapshot => ({
    currentUnit,
    user,
    users,
    allInsumos,
    allFichas,
    allMovimentacoes,
    allVendas
  });

  useEffect(() => {
    let active = true;

    fetch('/api/state')
      .then(async response => {
        if (!response.ok) throw new Error('Remote state unavailable');
        return response.json() as Promise<Partial<AppStateSnapshot>>;
      })
      .then(data => {
        if (!active) return;
        if (data.currentUnit) setCurrentUnitState(data.currentUnit);
        if (data.user) setUser(data.user);
        if (Array.isArray(data.users)) setUsers(data.users);
        if (Array.isArray(data.allInsumos)) setAllInsumos(data.allInsumos);
        if (Array.isArray(data.allFichas)) setAllFichas(data.allFichas);
        if (Array.isArray(data.allMovimentacoes)) setAllMovimentacoes(data.allMovimentacoes);
        if (Array.isArray(data.allVendas)) setAllVendas(data.allVendas);
      })
      .catch(() => {
        // Local Vite dev does not serve Vercel functions. Keep localStorage as fallback.
      })
      .finally(() => {
        setTimeout(() => {
          remoteStateReadyRef.current = true;
        }, 0);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!remoteStateReadyRef.current) return;

    const timer = window.setTimeout(() => {
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSnapshot())
      }).catch(() => {
        // Offline/local fallback remains in localStorage.
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [currentUnit, user, users, allInsumos, allFichas, allMovimentacoes, allVendas]);

  // Derived filtered state for current unit
  const insumos = allInsumos.filter(i => i.unidade === currentUnit);
  const fichas = allFichas.filter(f => f.unidade === currentUnit);
  const movimentacoes = allMovimentacoes.filter(m => m.unidade === currentUnit);
  const vendas = allVendas.filter(v => v.unidade === currentUnit);

  const setCurrentUnit = (unit: 'AeB Villa Mayor' | 'VM Cumbuco') => {
    setCurrentUnitState(unit);
  };

  const updateUser = (profile: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...profile }));
  };

  const addInsumo = (insumoData: Omit<Insumo, 'id'>) => {
    const newInsumo: Insumo = {
      ...insumoData,
      id: `ins-${Date.now()}`,
      unidade: currentUnit
    };
    setAllInsumos(prev => [...prev, newInsumo]);

    // Registrar movimentação de saldo inicial se estoqueAtual > 0
    if (insumoData.estoqueAtual > 0) {
      const custoTot = insumoData.estoqueAtual * insumoData.custoMedio;
      const newMov: Movimentacao = {
        id: `mov-${Date.now()}`,
        insumoId: newInsumo.id,
        insumoNome: newInsumo.nome,
        tipo: 'entrada',
        quantidade: insumoData.estoqueAtual,
        custoUnitario: insumoData.custoMedio,
        custoTotal: custoTot,
        data: new Date().toISOString(),
        observacao: 'Saldo Inicial de Cadastro',
        unidade: currentUnit
      };
      setAllMovimentacoes(prev => [newMov, ...prev]);
    }
  };

  const updateInsumo = (id: string, updatedFields: Partial<Insumo>) => {
    setAllInsumos(prev => prev.map(ins => {
      if (ins.id === id) {
        return { ...ins, ...updatedFields };
      }
      return ins;
    }));
  };

  const deleteInsumo = (id: string): boolean => {
    // Verificar se o insumo está em uso por alguma ficha técnica da unidade atual
    const estaEmUso = fichas.some(f => f.ingredientes.some(i => i.insumoId === id));
    if (estaEmUso) {
      return false; // Não pode deletar se estiver em uso
    }
    setAllInsumos(prev => prev.filter(ins => ins.id !== id));
    return true;
  };

  // Calcular o custo unitário atual de uma receita com base nos custos dos ingredientes
  const getFichaCusto = (ficha: FichaTecnica): number => {
    let custoTotal = 0;
    ficha.ingredientes.forEach(ing => {
      const ins = allInsumos.find(i => i.id === ing.insumoId);
      if (ins) {
        custoTotal += getInsumoQuantityCost(ins, ing.quantidade);
      }
    });
    return Number((custoTotal / (ficha.rendimentoPorcoes || 1)).toFixed(2));
  };

  // Adicionar movimentação e recalcular custo médio se for entrada
  const addMovimentacao = (movData: {
    insumoId: string;
    tipo: 'entrada' | 'saida' | 'desperdicio' | 'ajuste';
    quantidade: number;
    custoUnitario?: number;
    observacao?: string;
  }) => {
    const insumo = allInsumos.find(i => i.id === movData.insumoId);
    if (!insumo) return;

    const qty = Number(movData.quantidade);
    const costUnit = movData.custoUnitario !== undefined ? Number(movData.custoUnitario) : insumo.custoMedio;
    const totalCost = Number((qty * costUnit).toFixed(2));

    let novoEstoque = insumo.estoqueAtual;
    let novoCustoMedio = insumo.custoMedio;

    if (movData.tipo === 'entrada') {
      novoEstoque = insumo.estoqueAtual + qty;
      if (insumo.estoqueAtual > 0) {
        const valorEstoqueAntigo = insumo.estoqueAtual * insumo.custoMedio;
        const valorCompraNova = qty * costUnit;
        novoCustoMedio = Number(((valorEstoqueAntigo + valorCompraNova) / novoEstoque).toFixed(2));
      } else {
        novoCustoMedio = costUnit;
      }
    } else if (movData.tipo === 'saida' || movData.tipo === 'desperdicio') {
      novoEstoque = Math.max(0, insumo.estoqueAtual - qty);
    } else if (movData.tipo === 'ajuste') {
      novoEstoque = Math.max(0, insumo.estoqueAtual + qty);
      if (qty > 0 && movData.custoUnitario !== undefined) {
        const valorEstoqueAntigo = insumo.estoqueAtual * insumo.custoMedio;
        const valorAjusteNovo = qty * costUnit;
        novoCustoMedio = Number(((valorEstoqueAntigo + valorAjusteNovo) / novoEstoque).toFixed(2));
      }
    }

    setAllInsumos(prev => prev.map(ins => {
      if (ins.id === movData.insumoId) {
        return { ...ins, estoqueAtual: novoEstoque, custoMedio: novoCustoMedio };
      }
      return ins;
    }));

    const novaMov: Movimentacao = {
      id: `mov-${Date.now()}`,
      insumoId: movData.insumoId,
      insumoNome: insumo.nome,
      tipo: movData.tipo,
      quantidade: qty,
      custoUnitario: costUnit,
      custoTotal: totalCost,
      data: new Date().toISOString(),
      observacao: movData.observacao || '',
      unidade: currentUnit
    };

    setAllMovimentacoes(prev => [novaMov, ...prev]);
  };

  const getMovimentoEstoqueDelta = (mov: Movimentacao, reverse = false) => {
    const sinal = reverse ? -1 : 1;
    if (mov.tipo === 'entrada' || mov.tipo === 'ajuste') return sinal * mov.quantidade;
    return -sinal * mov.quantidade;
  };

  const updateMovimentacao = (id: string, movData: {
    insumoId: string;
    tipo: 'entrada' | 'saida' | 'desperdicio' | 'ajuste';
    quantidade: number;
    custoUnitario?: number;
    observacao?: string;
  }) => {
    const original = allMovimentacoes.find(m => m.id === id);
    const insumoNovo = allInsumos.find(i => i.id === movData.insumoId);
    if (!original || !insumoNovo) return { success: false, error: 'Registro ou insumo nao encontrado.' };

    const qty = Number(movData.quantidade);
    const costUnit = movData.custoUnitario !== undefined ? Number(movData.custoUnitario) : insumoNovo.custoMedio;
    const updatedMov: Movimentacao = {
      ...original,
      insumoId: movData.insumoId,
      insumoNome: insumoNovo.nome,
      tipo: movData.tipo,
      quantidade: qty,
      custoUnitario: costUnit,
      custoTotal: Number((qty * costUnit).toFixed(2)),
      observacao: movData.observacao || ''
    };

    const estoquePrevisto = allInsumos.map(ins => {
      let estoqueAtual = ins.estoqueAtual;
      if (ins.id === original.insumoId) estoqueAtual += getMovimentoEstoqueDelta(original, true);
      if (ins.id === updatedMov.insumoId) estoqueAtual += getMovimentoEstoqueDelta(updatedMov);
      return { ...ins, estoqueAtual };
    });

    const estoqueNegativo = estoquePrevisto.find(ins => ins.estoqueAtual < 0);
    if (estoqueNegativo) {
      return { success: false, error: `A alteracao deixaria o estoque de ${estoqueNegativo.nome} negativo.` };
    }

    setAllInsumos(estoquePrevisto.map(ins => (
      ins.id === updatedMov.insumoId && (updatedMov.tipo === 'entrada' || updatedMov.tipo === 'ajuste') && updatedMov.custoUnitario
        ? { ...ins, custoMedio: updatedMov.custoUnitario }
        : ins
    )));
    setAllMovimentacoes(prev => prev.map(m => m.id === id ? updatedMov : m));
    return { success: true };
  };

  const deleteMovimentacao = (id: string) => {
    const original = allMovimentacoes.find(m => m.id === id);
    if (!original) return { success: false, error: 'Registro nao encontrado.' };

    const estoquePrevisto = allInsumos.map(ins => {
      if (ins.id !== original.insumoId) return ins;
      return { ...ins, estoqueAtual: ins.estoqueAtual + getMovimentoEstoqueDelta(original, true) };
    });

    const estoqueNegativo = estoquePrevisto.find(ins => ins.estoqueAtual < 0);
    if (estoqueNegativo) {
      return { success: false, error: `A exclusao deixaria o estoque de ${estoqueNegativo.nome} negativo.` };
    }

    setAllInsumos(estoquePrevisto);
    setAllMovimentacoes(prev => prev.filter(m => m.id !== id));
    return { success: true };
  };

  const addFicha = (fichaData: Omit<FichaTecnica, 'id'>) => {
    const newFicha: FichaTecnica = {
      ...fichaData,
      id: `fic-${Date.now()}`,
      unidade: currentUnit
    };
    setAllFichas(prev => [...prev, newFicha]);
  };

  const updateFicha = (id: string, updatedFields: Partial<FichaTecnica>) => {
    setAllFichas(prev => prev.map(fic => {
      if (fic.id === id) {
        return { ...fic, ...updatedFields };
      }
      return fic;
    }));
  };

  const deleteFicha = (id: string) => {
    setAllFichas(prev => prev.filter(fic => fic.id !== id));
  };

  // Registrar venda simula o faturamento e decrementa insumos de forma explosiva
  const registrarVenda = (fichaId: string, quantidade: number) => {
    const qty = Number(quantidade);
    const f = fichas.find(fic => fic.id === fichaId);
    if (!f) return { success: false, error: 'Ficha técnica não encontrada.' };

    // Validar se há estoque suficiente de todos os ingredientes envolvidos
    const ingredientesFaltando: string[] = [];
    f.ingredientes.forEach(ing => {
      const ins = allInsumos.find(i => i.id === ing.insumoId);
      const totalNecessario = (ing.quantidade / (f.rendimentoPorcoes || 1)) * qty;
      if (!ins || ins.estoqueAtual < totalNecessario) {
        ingredientesFaltando.push(ins ? ins.nome : 'Insumo desconhecido');
      }
    });

    if (ingredientesFaltando.length > 0) {
      return {
        success: false,
        error: `Estoque insuficiente para os seguintes insumos: ${ingredientesFaltando.join(', ')}.`
      };
    }

    const saleId = `ven-${Date.now()}`;

    // Calcular o custo real dos ingredientes consumidos nesta venda
    let custoTotalInsumos = 0;
    const batchUpdates = new Map<string, number>();
    const newMovs: Movimentacao[] = [];

    // Decrementar estoque de cada ingrediente e calcular custo
    f.ingredientes.forEach(ing => {
      const quantConsumida = (ing.quantidade / (f.rendimentoPorcoes || 1)) * qty;
      const ins = allInsumos.find(i => i.id === ing.insumoId);
      if (ins) {
        custoTotalInsumos += getInsumoQuantityCost(ins, quantConsumida);

        // Deduzir o estoque do ingrediente
        const novoEstoque = Math.max(0, ins.estoqueAtual - quantConsumida);
        batchUpdates.set(ing.insumoId, novoEstoque);

        // Registrar saída correspondente no histórico de movimentações
        const novaMov: Movimentacao = {
          id: `${saleId}-${ing.insumoId}`,
          insumoId: ing.insumoId,
          insumoNome: ins.nome,
          tipo: 'saida',
          quantidade: quantConsumida,
          custoUnitario: getInsumoUnitCost(ins),
          custoTotal: Number(getInsumoQuantityCost(ins, quantConsumida).toFixed(2)),
          data: new Date().toISOString(),
          observacao: `Consumo venda: ${qty}x ${f.nome} [venda:${saleId}]`,
          unidade: currentUnit
        };
        newMovs.push(novaMov);
      }
    });

    // Bulk update insumos
    setAllInsumos(prev => prev.map(ins => {
      if (batchUpdates.has(ins.id)) {
        return { ...ins, estoqueAtual: batchUpdates.get(ins.id)! };
      }
      return ins;
    }));

    // Add new movements
    setAllMovimentacoes(prev => [...newMovs, ...prev]);

    const receitaTotal = Number((qty * f.precoVenda).toFixed(2));
    const custoInsumosTotal = Number(custoTotalInsumos.toFixed(2));

    // Registrar o log de venda
    const novaVenda: VendaLog = {
      id: saleId,
      fichaId,
      fichaNome: f.nome,
      quantidade: qty,
      precoVendaUnitario: f.precoVenda,
      receitaTotal,
      custoInsumosTotal,
      data: new Date().toISOString(),
      unidade: currentUnit
    };

    setAllVendas(prev => [novaVenda, ...prev]);
    return { success: true };
  };

  const buildVendaMovimentos = (f: FichaTecnica, qty: number, saleId: string) => {
    let custoTotalInsumos = 0;
    const movimentos: Movimentacao[] = [];

    f.ingredientes.forEach(ing => {
      const ins = allInsumos.find(i => i.id === ing.insumoId);
      if (!ins) return;

      const quantConsumida = (ing.quantidade / (f.rendimentoPorcoes || 1)) * qty;
      custoTotalInsumos += getInsumoQuantityCost(ins, quantConsumida);
      movimentos.push({
        id: `${saleId}-${ing.insumoId}`,
        insumoId: ing.insumoId,
        insumoNome: ins.nome,
        tipo: 'saida',
        quantidade: quantConsumida,
        custoUnitario: getInsumoUnitCost(ins),
        custoTotal: Number(getInsumoQuantityCost(ins, quantConsumida).toFixed(2)),
        data: new Date().toISOString(),
        observacao: `Consumo venda: ${qty}x ${f.nome} [venda:${saleId}]`,
        unidade: currentUnit
      });
    });

    return { custoTotalInsumos: Number(custoTotalInsumos.toFixed(2)), movimentos };
  };

  const removeMovimentosDaVenda = (saleId: string) => {
    setAllMovimentacoes(prev => prev.filter(m => !m.id.startsWith(`${saleId}-`) && !m.observacao?.includes(`[venda:${saleId}]`)));
  };

  const restoreVendaEstoque = (venda: VendaLog) => {
    const ficha = allFichas.find(f => f.id === venda.fichaId);
    if (!ficha) return;

    setAllInsumos(prev => prev.map(ins => {
      const ing = ficha.ingredientes.find(i => i.insumoId === ins.id);
      if (!ing) return ins;
      const quantRestaurada = (ing.quantidade / (ficha.rendimentoPorcoes || 1)) * venda.quantidade;
      return { ...ins, estoqueAtual: ins.estoqueAtual + quantRestaurada };
    }));
  };

  const updateVenda = (id: string, fichaId: string, quantidade: number) => {
    const vendaOriginal = allVendas.find(v => v.id === id);
    const fichaOriginal = vendaOriginal ? allFichas.find(f => f.id === vendaOriginal.fichaId) : undefined;
    const novaFicha = allFichas.find(f => f.id === fichaId);
    if (!vendaOriginal || !novaFicha) return { success: false, error: 'Venda ou ficha tecnica nao encontrada.' };

    const qty = Number(quantidade);
    const estoqueSimulado = new Map<string, number>(allInsumos.map(ins => [ins.id, ins.estoqueAtual]));

    if (fichaOriginal) {
      fichaOriginal.ingredientes.forEach(ing => {
        const atual = estoqueSimulado.get(ing.insumoId) || 0;
        estoqueSimulado.set(ing.insumoId, atual + ((ing.quantidade / (fichaOriginal.rendimentoPorcoes || 1)) * vendaOriginal.quantidade));
      });
    }

    const faltando: string[] = [];
    novaFicha.ingredientes.forEach(ing => {
      const ins = allInsumos.find(i => i.id === ing.insumoId);
      const necessario = (ing.quantidade / (novaFicha.rendimentoPorcoes || 1)) * qty;
      const disponivel = estoqueSimulado.get(ing.insumoId) || 0;
      if (!ins || disponivel < necessario) {
        faltando.push(ins ? ins.nome : 'Insumo desconhecido');
      } else {
        estoqueSimulado.set(ing.insumoId, disponivel - necessario);
      }
    });

    if (faltando.length > 0) {
      return { success: false, error: `Estoque insuficiente para: ${faltando.join(', ')}.` };
    }

    const { custoTotalInsumos, movimentos } = buildVendaMovimentos(novaFicha, qty, id);
    const custoInsumosTotal = custoTotalInsumos;
    setAllInsumos(prev => prev.map(ins => ({ ...ins, estoqueAtual: estoqueSimulado.get(ins.id) ?? ins.estoqueAtual })));
    removeMovimentosDaVenda(id);
    setAllMovimentacoes(prev => [...movimentos, ...prev]);
    setAllVendas(prev => prev.map(v => v.id === id ? {
      ...v,
      fichaId,
      fichaNome: novaFicha.nome,
      quantidade: qty,
      precoVendaUnitario: novaFicha.precoVenda,
      receitaTotal: Number((qty * novaFicha.precoVenda).toFixed(2)),
      custoInsumosTotal
    } : v));
    return { success: true };
  };

  const deleteVenda = (id: string) => {
    const venda = allVendas.find(v => v.id === id);
    if (!venda) return { success: false, error: 'Venda nao encontrada.' };

    restoreVendaEstoque(venda);
    removeMovimentosDaVenda(id);
    setAllVendas(prev => prev.filter(v => v.id !== id));
    return { success: true };
  };

  const resetData = () => {
    const fresh = buildInitialCollections();
    setUser(prev => ({ ...INITIAL_USER, estabelecimento: currentUnit, metaFCP: prev.metaFCP || INITIAL_USER.metaFCP }));
    setUsers(DEFAULT_USERS);
    setAllInsumos(fresh.allInsumos);
    setAllFichas(fresh.allFichas);
    setAllMovimentacoes(fresh.allMovimentacoes);
    setAllVendas(fresh.allVendas);

    localStorage.removeItem('chef_user');
    localStorage.removeItem('chef_registered_users');
    localStorage.removeItem('chef_all_insumos');
    localStorage.removeItem('chef_all_fichas');
    localStorage.removeItem('chef_all_movimentacoes');
    localStorage.removeItem('chef_all_vendas');
  };

  const exportarDados = () => JSON.stringify(buildSnapshot(), null, 2);

  const importarDados = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.currentUnit) setCurrentUnitState(data.currentUnit);
      if (data.user) setUser(data.user);
      if (Array.isArray(data.users)) setUsers(data.users);

      if (Array.isArray(data.allInsumos)) {
        setAllInsumos(data.allInsumos);
      } else if (Array.isArray(data.insumos)) {
        setAllInsumos(prev => [...prev.filter(i => i.unidade !== currentUnit), ...data.insumos.map((i: Insumo) => ({ ...i, unidade: currentUnit }))]);
      }

      if (Array.isArray(data.allFichas)) {
        setAllFichas(data.allFichas);
      } else if (Array.isArray(data.fichas)) {
        setAllFichas(prev => [...prev.filter(f => f.unidade !== currentUnit), ...data.fichas.map((f: FichaTecnica) => ({ ...f, unidade: currentUnit }))]);
      }

      if (Array.isArray(data.allMovimentacoes)) {
        setAllMovimentacoes(data.allMovimentacoes);
      } else if (Array.isArray(data.movimentacoes)) {
        setAllMovimentacoes(prev => [...prev.filter(m => m.unidade !== currentUnit), ...data.movimentacoes.map((m: Movimentacao) => ({ ...m, unidade: currentUnit }))]);
      }

      if (Array.isArray(data.allVendas)) {
        setAllVendas(data.allVendas);
      } else if (Array.isArray(data.vendas)) {
        setAllVendas(prev => [...prev.filter(v => v.unidade !== currentUnit), ...data.vendas.map((v: VendaLog) => ({ ...v, unidade: currentUnit }))]);
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return (
    <StockContext.Provider value={{
      user,
      currentUnit,
      setCurrentUnit,
      insumos,
      fichas,
      movimentacoes,
      vendas,
      updateUser,
      addInsumo,
      updateInsumo,
      deleteInsumo,
      addMovimentacao,
      updateMovimentacao,
      deleteMovimentacao,
      addFicha,
      updateFicha,
      deleteFicha,
      registrarVenda,
      updateVenda,
      deleteVenda,
      getFichaCusto,
      resetData,
      importarDados,
      exportarDados,
      users,
      registerUser,
      deleteUser
    }}>
      {children}
    </StockContext.Provider>
  );
};
