import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Insumo, FichaTecnica, Movimentacao, VendaLog, UserProfile, Utensilio, MovimentacaoUtensilio, SetorEstoque, RelatorioGestor } from '../types';
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
  utensilios: Utensilio[];
  movimentacoesUtensilios: MovimentacaoUtensilio[];
  relatorios: RelatorioGestor[];
  relatoriosPendentes: RelatorioGestor[];
  updateUser: (profile: Partial<UserProfile>) => void;
  addUtensilio: (utensilio: Omit<Utensilio, 'id' | 'unidade' | 'perdasAcumuladas' | 'quantidadeContada' | 'dataUltimaContagem'>) => void;
  updateUtensilio: (id: string, utensilio: Partial<Utensilio>) => void;
  deleteUtensilio: (id: string) => boolean;
  registrarContagemUtensilio: (id: string, quantidade: number, observacao?: string) => { success: boolean; error?: string };
  registrarPerdaUtensilio: (id: string, quantidade: number, observacao?: string) => { success: boolean; error?: string };
  registrarEntradaUtensilio: (id: string, quantidade: number, observacao?: string) => { success: boolean; error?: string };
  addInsumo: (insumo: Omit<Insumo, 'id'>) => void;
  updateInsumo: (id: string, insumo: Partial<Insumo>) => void;
  deleteInsumo: (id: string) => boolean;
  addMovimentacao: (mov: {
    insumoId: string;
    tipo: 'entrada' | 'saida' | 'desperdicio' | 'ajuste';
    quantidade: number;
    custoUnitario?: number;
    observacao?: string;
    data?: string;
    estoqueFisico?: number;
  }) => void;
  updateMovimentacao: (id: string, mov: {
    insumoId: string;
    tipo: 'entrada' | 'saida' | 'desperdicio' | 'ajuste';
    quantidade: number;
    custoUnitario?: number;
    observacao?: string;
    data?: string;
    estoqueFisico?: number;
  }) => { success: boolean; error?: string };
  deleteMovimentacao: (id: string) => { success: boolean; error?: string };
  addFicha: (ficha: Omit<FichaTecnica, 'id'>) => void;
  criarFichasDePicole: () => { created: number; skipped: number };
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
  addRelatorio: (report: Pick<RelatorioGestor, 'titulo' | 'texto' | 'anexos'>) => { success: boolean; error?: string };
  marcarRelatorioVerificado: (id: string) => { success: boolean; error?: string };
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) throw new Error('useStock deve ser usado dentro de um StockProvider');
  return context;
};


type Unidade = 'AeB Villa Mayor' | 'VM Cumbuco';

const SETOR_CAFE: SetorEstoque = 'Café da manhã';
const SETOR_RESTAURANTE: SetorEstoque = 'Restaurante';

const getInsumoSetor = (insumo: Insumo): SetorEstoque => {
  if (insumo.setor === SETOR_CAFE || insumo.setor === SETOR_RESTAURANTE) return insumo.setor;
  return insumo.categoria === SETOR_CAFE ? SETOR_CAFE : SETOR_RESTAURANTE;
};

type AppStateSnapshot = {
  currentUnit: Unidade;
  user: UserProfile;
  users: Array<UserProfile & { senha?: string }>;
  allInsumos: Insumo[];
  allFichas: FichaTecnica[];
  allMovimentacoes: Movimentacao[];
  allVendas: VendaLog[];
  allUtensilios: Utensilio[];
  allMovimentacoesUtensilios: MovimentacaoUtensilio[];
  allRelatorios: RelatorioGestor[];
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
    allVendas: [...villaMayorVendas, ...cumbucoVendas],
    allUtensilios: [],
    allMovimentacoesUtensilios: [],
    allRelatorios: []
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

const dedupeInsumosById = (items: Insumo[]) => {
  const seen = new Set<string>();
  return items.filter(ins => {
    if (!ins.id) return true;
    if (seen.has(ins.id)) return false;
    seen.add(ins.id);
    return true;
  });
};
const dedupeAutomaticPicoleFichas = (items: FichaTecnica[]) => {
  const seen = new Set<string>();
  return items.filter(ficha => {
    if (!ficha.id.startsWith('fic-picole-')) return true;
    const key = `${ficha.unidade || ''}::${ficha.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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


type CollectionPatch = { upserts: any[]; deleted: string[] };
type StatePatch = Partial<Pick<AppStateSnapshot, 'currentUnit' | 'user'>> & {
  users?: CollectionPatch;
  allInsumos?: CollectionPatch;
  allFichas?: CollectionPatch;
  allMovimentacoes?: CollectionPatch;
  allVendas?: CollectionPatch;
  allUtensilios?: CollectionPatch;
  allMovimentacoesUtensilios?: CollectionPatch;
  allRelatorios?: CollectionPatch;
};

const statesMatch = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const entityKey = (item: any) => String(item?.id || item?.email || '');

const buildCollectionPatch = (base: any[], next: any[]): CollectionPatch | undefined => {
  const baseByKey = new Map(base.map(item => [entityKey(item), item]));
  const nextByKey = new Map(next.map(item => [entityKey(item), item]));
  const upserts = next.filter(item => !statesMatch(baseByKey.get(entityKey(item)), item));
  const deleted = base.filter(item => !nextByKey.has(entityKey(item))).map(entityKey).filter(Boolean);
  return upserts.length || deleted.length ? { upserts, deleted } : undefined;
};

const buildStatePatch = (base: AppStateSnapshot, next: AppStateSnapshot): StatePatch => {
  const users = buildCollectionPatch(base.users, next.users);
  const allInsumos = buildCollectionPatch(base.allInsumos, next.allInsumos);
  const allFichas = buildCollectionPatch(base.allFichas, next.allFichas);
  const allMovimentacoes = buildCollectionPatch(base.allMovimentacoes, next.allMovimentacoes);
  const allVendas = buildCollectionPatch(base.allVendas, next.allVendas);
  const allUtensilios = buildCollectionPatch(base.allUtensilios, next.allUtensilios);
  const allMovimentacoesUtensilios = buildCollectionPatch(base.allMovimentacoesUtensilios, next.allMovimentacoesUtensilios);
  const allRelatorios = buildCollectionPatch(base.allRelatorios, next.allRelatorios);
  return {
    ...(statesMatch(base.currentUnit, next.currentUnit) ? {} : { currentUnit: next.currentUnit }),
    ...(statesMatch(base.user, next.user) ? {} : { user: next.user }),
    ...(users ? { users } : {}),
    ...(allInsumos ? { allInsumos } : {}),
    ...(allFichas ? { allFichas } : {}),
    ...(allMovimentacoes ? { allMovimentacoes } : {}),
    ...(allVendas ? { allVendas } : {}),
    ...(allUtensilios ? { allUtensilios } : {}),
    ...(allMovimentacoesUtensilios ? { allMovimentacoesUtensilios } : {}),
    ...(allRelatorios ? { allRelatorios } : {}),
  };
};

const hasPatchChanges = (patch: StatePatch) => Object.keys(patch).length > 0;

const snapshotFromRemote = (state: any): AppStateSnapshot => ({
  currentUnit: state.currentUnit,
  user: state.user,
  users: state.users,
  allInsumos: dedupeInsumosById(state.allInsumos || []),
  allFichas: state.allFichas || [],
  allMovimentacoes: state.allMovimentacoes || [],
  allVendas: state.allVendas || [],
  allUtensilios: state.allUtensilios || [],
  allMovimentacoesUtensilios: state.allMovimentacoesUtensilios || [],
  allRelatorios: state.allRelatorios || [],
});

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const remoteStateReadyRef = useRef(false);
  const remoteRevisionRef = useRef<string | null>(null);
  const remoteBaseStateRef = useRef<AppStateSnapshot | null>(null);
  const latestSnapshotRef = useRef<AppStateSnapshot | null>(null);
  const syncInFlightRef = useRef(false);
  const syncQueuedRef = useRef(false);

  const picoleGenerationPendingRef = useRef(false);
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
    dedupeInsumosById(readJsonStorage<Insumo[]>('chef_all_insumos', initialCollections.allInsumos))
  );

  const [allFichas, setAllFichas] = useState<FichaTecnica[]>(() =>
    dedupeAutomaticPicoleFichas(readJsonStorage<FichaTecnica[]>('chef_all_fichas', initialCollections.allFichas))
  );

  const [allMovimentacoes, setAllMovimentacoes] = useState<Movimentacao[]>(() =>
    readJsonStorage<Movimentacao[]>('chef_all_movimentacoes', initialCollections.allMovimentacoes)
  );

  const [allVendas, setAllVendas] = useState<VendaLog[]>(() =>
    readJsonStorage<VendaLog[]>('chef_all_vendas', initialCollections.allVendas)
  );

  const [allUtensilios, setAllUtensilios] = useState<Utensilio[]>(() =>
    readJsonStorage<Utensilio[]>('chef_all_utensilios', initialCollections.allUtensilios)
  );

  const [allMovimentacoesUtensilios, setAllMovimentacoesUtensilios] = useState<MovimentacaoUtensilio[]>(() =>
    readJsonStorage<MovimentacaoUtensilio[]>('chef_all_movimentacoes_utensilios', initialCollections.allMovimentacoesUtensilios)
  );

  const [allRelatorios, setAllRelatorios] = useState<RelatorioGestor[]>(() =>
    readJsonStorage<RelatorioGestor[]>('chef_all_relatorios', initialCollections.allRelatorios)
  );

  // Persist master states
  useEffect(() => {
    localStorage.setItem('chef_current_unit', currentUnit);
  }, [currentUnit]);

  useEffect(() => {
    if (user.cargo !== 'Colaborador') return;
    const assignedUnit: Unidade = user.estabelecimento === 'VM Cumbuco' ? 'VM Cumbuco' : 'AeB Villa Mayor';
    if (currentUnit !== assignedUnit) setCurrentUnitState(assignedUnit);
  }, [user.cargo, user.estabelecimento, currentUnit]);

  useEffect(() => {
    localStorage.setItem('chef_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('chef_all_insumos', JSON.stringify(dedupeInsumosById(allInsumos)));
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

  useEffect(() => {
    localStorage.setItem('chef_all_utensilios', JSON.stringify(allUtensilios));
  }, [allUtensilios]);

  useEffect(() => {
    localStorage.setItem('chef_all_movimentacoes_utensilios', JSON.stringify(allMovimentacoesUtensilios));
  }, [allMovimentacoesUtensilios]);

  useEffect(() => {
    localStorage.setItem('chef_all_relatorios', JSON.stringify(allRelatorios));
  }, [allRelatorios]);


  const buildSnapshot = (): AppStateSnapshot => ({
    currentUnit,
    user,
    users,
    allInsumos: dedupeInsumosById(allInsumos),
    allFichas: dedupeAutomaticPicoleFichas(allFichas),
    allMovimentacoes,
    allVendas,
    allUtensilios,
    allMovimentacoesUtensilios,
    allRelatorios
  });

useEffect(() => {
    let active = true;

    fetch('/api/state')
      .then(async response => {
        if (!response.ok) throw new Error('Remote state unavailable');
        return response.json() as Promise<Partial<AppStateSnapshot> & { _revision?: string }>;
      })
      .then(data => {
        if (!active) return;
        const remoteSnapshot = snapshotFromRemote(data);
        remoteBaseStateRef.current = remoteSnapshot;
        latestSnapshotRef.current = remoteSnapshot;
        remoteRevisionRef.current = data._revision || null;
        const hasActiveSession = sessionStorage.getItem('chef_is_logged_in') === 'true';
        if (!hasActiveSession && data.currentUnit) setCurrentUnitState(data.currentUnit);
        if (!hasActiveSession && data.user) setUser(data.user);
        if (Array.isArray(data.users)) setUsers(data.users);
        if (Array.isArray(data.allInsumos)) setAllInsumos(dedupeInsumosById(data.allInsumos));
        if (Array.isArray(data.allFichas)) setAllFichas(dedupeAutomaticPicoleFichas(data.allFichas));
        if (Array.isArray(data.allMovimentacoes)) setAllMovimentacoes(data.allMovimentacoes);
        if (Array.isArray(data.allVendas)) setAllVendas(data.allVendas);
        if (Array.isArray(data.allUtensilios)) setAllUtensilios(data.allUtensilios);
        if (Array.isArray(data.allMovimentacoesUtensilios)) setAllMovimentacoesUtensilios(data.allMovimentacoesUtensilios);
        if (Array.isArray(data.allRelatorios)) setAllRelatorios(data.allRelatorios);
        remoteStateReadyRef.current = true;
      })
      .catch(() => {
        // Keep local data for offline use. It must not overwrite the remote state.
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    latestSnapshotRef.current = buildSnapshot();
  }, [currentUnit, user, users, allInsumos, allFichas, allMovimentacoes, allVendas, allUtensilios, allMovimentacoesUtensilios, allRelatorios]);

  useEffect(() => {
    if (!remoteStateReadyRef.current) return;

    const syncChanges = async () => {
      if (syncInFlightRef.current) {
        syncQueuedRef.current = true;
        return;
      }

      const snapshot = latestSnapshotRef.current;
      const base = remoteBaseStateRef.current;
      if (!snapshot || !base) return;

      const patch = buildStatePatch(base, snapshot);
      if (!hasPatchChanges(patch)) return;

      syncInFlightRef.current = true;
      let saved = false;
      try {
        let response = await fetch('/api/state', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch, revision: remoteRevisionRef.current })
        });
        if (response.status === 409) {
          const conflict = await response.json();
          remoteRevisionRef.current = conflict.state?._revision || null;
          remoteBaseStateRef.current = snapshotFromRemote(conflict.state);
          response = await fetch('/api/state', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patch, revision: remoteRevisionRef.current })
          });
        }

        if (!response.ok) throw new Error('Remote state unavailable');

        const result = await response.json();
        remoteRevisionRef.current = result.state?._revision || remoteRevisionRef.current;
        remoteBaseStateRef.current = snapshotFromRemote(result.state);
        saved = true;
      } catch (error) {
        console.error('Unable to save changes.', error);
      } finally {
        syncInFlightRef.current = false;
        if (saved && syncQueuedRef.current) {
          syncQueuedRef.current = false;
          void syncChanges();
        }
      }
    };

    const timer = window.setTimeout(() => {
      void syncChanges();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [currentUnit, user, users, allInsumos, allFichas, allMovimentacoes, allVendas, allUtensilios, allMovimentacoesUtensilios, allRelatorios]);

  // Derived filtered state for current unit
  const insumos = allInsumos.filter(i => i.unidade === currentUnit);
  const fichas = allFichas.filter(f => f.unidade === currentUnit);
  const movimentacoes = allMovimentacoes.filter(m => m.unidade === currentUnit);
  const vendas = allVendas.filter(v => v.unidade === currentUnit);
  const utensilios = allUtensilios.filter(u => u.unidade === currentUnit);
  const movimentacoesUtensilios = allMovimentacoesUtensilios.filter(m => m.unidade === currentUnit);
  const relatorios = allRelatorios.filter(report => report.unidade === currentUnit);
  const viewerKey = user.id || user.email;
  const relatoriosPendentes = relatorios.filter(report => (
    report.autorId !== viewerKey && !report.visualizadoPor.includes(viewerKey)
  ));

  const setCurrentUnit = (unit: 'AeB Villa Mayor' | 'VM Cumbuco') => {
    setCurrentUnitState(unit);
  };

  const addRelatorio = (report: Pick<RelatorioGestor, 'titulo' | 'texto' | 'anexos'>) => {
    if (user.cargo === 'Colaborador') return { success: false, error: 'Apenas gestores podem enviar relatórios.' };
    if (!report.titulo.trim() || !report.texto.trim()) return { success: false, error: 'Informe o título e o relato escrito.' };
    if (report.anexos.length > 8) return { success: false, error: 'Adicione no máximo 8 arquivos por relatório.' };
    if (report.anexos.some(attachment => attachment.dataUrl.length > 1_500_000)) {
      return { success: false, error: 'Um dos anexos ultrapassa o limite permitido.' };
    }

    const newReport: RelatorioGestor = {
      id: `rel-${Date.now()}`,
      titulo: report.titulo.trim(),
      texto: report.texto.trim(),
      anexos: report.anexos,
      autorId: viewerKey,
      autorNome: user.nome,
      autorEmail: user.email,
      criadoEm: new Date().toISOString(),
      unidade: currentUnit,
      visualizadoPor: []
    };
    setAllRelatorios(previous => [newReport, ...previous]);
    return { success: true };
  };

  const marcarRelatorioVerificado = (id: string) => {
    if (user.cargo === 'Colaborador') return { success: false, error: 'Apenas gestores podem verificar relatórios.' };
    const report = allRelatorios.find(item => item.id === id && item.unidade === currentUnit);
    if (!report) return { success: false, error: 'Relatório não encontrado.' };
    if (report.visualizadoPor.includes(viewerKey)) return { success: true };
    setAllRelatorios(previous => previous.map(item => (
      item.id === id
        ? { ...item, visualizadoPor: [...new Set([...item.visualizadoPor, viewerKey])] }
        : item
    )));
    return { success: true };
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
        setor: getInsumoSetor(newInsumo),
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
    data?: string;
    estoqueFisico?: number;
  }) => {
    const insumo = allInsumos.find(i => i.id === movData.insumoId);
    if (!insumo) return;

    const qty = Number(movData.quantidade);
    const costUnit = movData.custoUnitario !== undefined ? Number(movData.custoUnitario) : insumo.custoMedio;
    const estoqueAnterior = insumo.estoqueAtual;
    const estoqueFinal = movData.tipo === 'ajuste'
      ? Math.max(0, Number(movData.estoqueFisico ?? (estoqueAnterior + qty)))
      : undefined;
    const quantidadeMovimentada = movData.tipo === 'ajuste'
      ? Number(((estoqueFinal ?? estoqueAnterior) - estoqueAnterior).toFixed(5))
      : qty;
    const totalCost = Number((Math.abs(quantidadeMovimentada) * costUnit).toFixed(2));

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
      novoEstoque = estoqueFinal ?? estoqueAnterior;
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
      quantidade: quantidadeMovimentada,
      custoUnitario: costUnit,
      custoTotal: totalCost,
      data: movData.data || new Date().toISOString(),
      observacao: movData.observacao || '',
      estoqueAnterior: movData.tipo === 'ajuste' ? estoqueAnterior : undefined,
      estoqueFinal: movData.tipo === 'ajuste' ? novoEstoque : undefined,
      setor: getInsumoSetor(insumo),
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
    data?: string;
    estoqueFisico?: number;
  }) => {
    const original = allMovimentacoes.find(m => m.id === id);
    const insumoNovo = allInsumos.find(i => i.id === movData.insumoId);
    if (!original || !insumoNovo) return { success: false, error: 'Registro ou insumo nao encontrado.' };

    const qty = Number(movData.quantidade);
    const costUnit = movData.custoUnitario !== undefined ? Number(movData.custoUnitario) : insumoNovo.custoMedio;
    const mesmoInsumo = original.insumoId === movData.insumoId;
    const estoqueSemMovimentoOriginal = mesmoInsumo
      ? insumoNovo.estoqueAtual + getMovimentoEstoqueDelta(original, true)
      : insumoNovo.estoqueAtual;
    const estoqueAntesDoAjuste = mesmoInsumo && original.tipo === 'ajuste'
      ? Number(original.estoqueAnterior ?? (insumoNovo.estoqueAtual - original.quantidade))
      : estoqueSemMovimentoOriginal;
    const estoqueFinalAjustado = movData.tipo === 'ajuste'
      ? Math.max(0, Number(movData.estoqueFisico ?? (estoqueAntesDoAjuste + qty)))
      : undefined;
    const quantidadeAtualizada = movData.tipo === 'ajuste'
      ? Number(((estoqueFinalAjustado ?? estoqueAntesDoAjuste) - estoqueAntesDoAjuste).toFixed(5))
      : qty;
    const updatedMov: Movimentacao = {
      ...original,
      insumoId: movData.insumoId,
      insumoNome: insumoNovo.nome,
      tipo: movData.tipo,
      quantidade: quantidadeAtualizada,
      custoUnitario: costUnit,
      custoTotal: Number((Math.abs(quantidadeAtualizada) * costUnit).toFixed(2)),
      data: movData.data || original.data,
      observacao: movData.observacao || '',
      setor: getInsumoSetor(insumoNovo),
      estoqueAnterior: movData.tipo === 'ajuste' ? estoqueAntesDoAjuste : undefined,
      estoqueFinal: movData.tipo === 'ajuste' ? estoqueFinalAjustado : undefined,
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

  const addUtensilio = (utensilioData: Omit<Utensilio, 'id' | 'unidade' | 'perdasAcumuladas' | 'quantidadeContada' | 'dataUltimaContagem'>) => {
    const newUtensilio: Utensilio = {
      ...utensilioData,
      id: `utensilio-${Date.now()}`,
      perdasAcumuladas: 0,
      unidade: currentUnit
    };
    setAllUtensilios(prev => [...prev, newUtensilio]);
  };

  const updateUtensilio = (id: string, updatedFields: Partial<Utensilio>) => {
    setAllUtensilios(prev => prev.map(utensilio => (
      utensilio.id === id && utensilio.unidade === currentUnit
        ? { ...utensilio, ...updatedFields, id: utensilio.id, unidade: currentUnit }
        : utensilio
    )));
  };

  const deleteUtensilio = (id: string): boolean => {
    const exists = allUtensilios.some(utensilio => utensilio.id === id && utensilio.unidade === currentUnit);
    if (!exists) return false;
    setAllUtensilios(prev => prev.filter(utensilio => utensilio.id !== id || utensilio.unidade !== currentUnit));
    setAllMovimentacoesUtensilios(prev => prev.filter(mov => mov.utensilioId !== id || mov.unidade !== currentUnit));
    return true;
  };

  const registrarContagemUtensilio = (id: string, quantidade: number, observacao?: string) => {
    const utensilio = allUtensilios.find(item => item.id === id && item.unidade === currentUnit);
    const qty = Number(quantidade);
    if (!utensilio) return { success: false, error: 'Utensilio nao encontrado.' };
    if (!Number.isFinite(qty) || qty < 0) return { success: false, error: 'Informe uma quantidade valida.' };

    const data = new Date().toISOString();
    const diferencaPerda = Math.max(0, utensilio.quantidadeAtual - qty);
    const timestamp = Date.now();
    const movimentoContagem: MovimentacaoUtensilio = {
      id: `mov-utensilio-${timestamp}`,
      utensilioId: id,
      utensilioNome: utensilio.nome,
      tipo: 'contagem',
      quantidade: qty,
      data,
      observacao: observacao || 'Contagem fisica',
      unidade: currentUnit
    };
    const movimentoPerda: MovimentacaoUtensilio | null = diferencaPerda > 0 ? {
      id: `mov-utensilio-${timestamp}-perda`,
      utensilioId: id,
      utensilioNome: utensilio.nome,
      tipo: 'perda',
      quantidade: diferencaPerda,
      data,
      observacao: observacao ? `Perda identificada na contagem fisica - ${observacao}` : 'Perda identificada na contagem fisica',
      unidade: currentUnit
    } : null;

    setAllUtensilios(prev => prev.map(item => item.id === id && item.unidade === currentUnit
      ? {
        ...item,
        quantidadeAtual: qty,
        quantidadeContada: qty,
        perdasAcumuladas: item.perdasAcumuladas + diferencaPerda,
        dataUltimaContagem: data,
        observacao: observacao || item.observacao
      }
      : item
    ));
    setAllMovimentacoesUtensilios(prev => [
      movimentoContagem,
      ...(movimentoPerda ? [movimentoPerda] : []),
      ...prev
    ]);
    return { success: true };
  };

  const registrarPerdaUtensilio = (id: string, quantidade: number, observacao?: string) => {
    const utensilio = allUtensilios.find(item => item.id === id && item.unidade === currentUnit);
    const qty = Number(quantidade);
    if (!utensilio) return { success: false, error: 'Utensilio nao encontrado.' };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'Informe uma quantidade maior que zero.' };
    if (qty > utensilio.quantidadeAtual) return { success: false, error: 'A perda nao pode ser maior que a quantidade disponivel.' };

    const data = new Date().toISOString();
    setAllUtensilios(prev => prev.map(item => item.id === id && item.unidade === currentUnit
      ? { ...item, quantidadeAtual: item.quantidadeAtual - qty, perdasAcumuladas: item.perdasAcumuladas + qty }
      : item
    ));
    setAllMovimentacoesUtensilios(prev => [{
      id: `mov-utensilio-${Date.now()}`,
      utensilioId: id,
      utensilioNome: utensilio.nome,
      tipo: 'perda',
      quantidade: qty,
      data,
      observacao: observacao || 'Perda registrada',
      unidade: currentUnit
    }, ...prev]);
    return { success: true };
  };

  const registrarEntradaUtensilio = (id: string, quantidade: number, observacao?: string) => {
    const utensilio = allUtensilios.find(item => item.id === id && item.unidade === currentUnit);
    const qty = Number(quantidade);
    if (!utensilio) return { success: false, error: 'Utensilio nao encontrado.' };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'Informe uma quantidade maior que zero.' };

    const data = new Date().toISOString();
    setAllUtensilios(prev => prev.map(item => item.id === id && item.unidade === currentUnit
      ? { ...item, quantidadeAtual: item.quantidadeAtual + qty }
      : item
    ));
    setAllMovimentacoesUtensilios(prev => [{
      id: `mov-utensilio-${Date.now()}`,
      utensilioId: id,
      utensilioNome: utensilio.nome,
      tipo: 'entrada',
      quantidade: qty,
      data,
      observacao: observacao || 'Entrada de compra',
      unidade: currentUnit
    }, ...prev]);
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

  const criarFichasDePicole = () => {
    if (picoleGenerationPendingRef.current) return { created: 0, skipped: 0 };
    picoleGenerationPendingRef.current = true;
    setTimeout(() => { picoleGenerationPendingRef.current = false; }, 0);
    const normalizeKey = (value: string) =>
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const fichasSemDuplicatas = dedupeAutomaticPicoleFichas(allFichas);
    const fichaKeys = new Set(
      fichasSemDuplicatas.map(ficha => `${ficha.unidade || ''}::${normalizeKey(ficha.nome)}`)
    );
    const picoleInsumos = allInsumos.filter(insumo =>
      Boolean(insumo.unidade) && normalizeKey(insumo.categoria) === 'picole'
    );
    const novosPicoles = picoleInsumos.filter(insumo => {
      const key = `${insumo.unidade || ''}::${normalizeKey(insumo.nome)}`;
      if (fichaKeys.has(key)) return false;
      fichaKeys.add(key);
      return true;
    });
    const baseId = Date.now();
    const novasFichas: FichaTecnica[] = novosPicoles.map((insumo, index) => ({
      id: `fic-picole-${baseId}-${index}`,
      nome: insumo.nome,
      categoria: 'Picolé',
      ingredientes: [{ insumoId: insumo.id, quantidade: 1 }],
      precoVenda: 0,
      rendimentoPorcoes: 1,
      descricao: 'Ficha automática de 1 unidade',
      unidade: insumo.unidade
    }));
    if (novasFichas.length > 0 || fichasSemDuplicatas.length !== allFichas.length) {
      setAllFichas(prev => {
        const semDuplicatas = dedupeAutomaticPicoleFichas(prev);
        const keys = new Set(semDuplicatas.map(ficha => `${ficha.unidade || ''}::${normalizeKey(ficha.nome)}`));
        const novasSeguras = novasFichas.filter(ficha => {
          const key = `${ficha.unidade || ''}::${normalizeKey(ficha.nome)}`;
          if (keys.has(key)) return false;
          keys.add(key);
          return true;
        });
        return [...semDuplicatas, ...novasSeguras];
      });
    }
    return { created: novasFichas.length, skipped: picoleInsumos.length - novasFichas.length };
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
          setor: getInsumoSetor(ins),
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
        setor: getInsumoSetor(ins),
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
    setAllUtensilios(fresh.allUtensilios);
    setAllMovimentacoesUtensilios(fresh.allMovimentacoesUtensilios);
    setAllRelatorios(fresh.allRelatorios);

    localStorage.removeItem('chef_user');
    localStorage.removeItem('chef_registered_users');
    localStorage.removeItem('chef_all_insumos');
    localStorage.removeItem('chef_all_fichas');
    localStorage.removeItem('chef_all_movimentacoes');
    localStorage.removeItem('chef_all_vendas');
    localStorage.removeItem('chef_all_utensilios');
    localStorage.removeItem('chef_all_movimentacoes_utensilios');
    localStorage.removeItem('chef_all_relatorios');
  };

  const exportarDados = () => JSON.stringify(buildSnapshot(), null, 2);

  const importarDados = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.currentUnit) setCurrentUnitState(data.currentUnit);
      if (data.user) setUser(data.user);
      if (Array.isArray(data.users)) setUsers(data.users);

      if (Array.isArray(data.allInsumos)) {
        setAllInsumos(dedupeInsumosById(data.allInsumos));
      } else if (Array.isArray(data.insumos)) {
        setAllInsumos(prev => dedupeInsumosById([...prev.filter(i => i.unidade !== currentUnit), ...data.insumos.map((i: Insumo) => ({ ...i, unidade: currentUnit }))]));
      }

      if (Array.isArray(data.allFichas)) {
        setAllFichas(dedupeAutomaticPicoleFichas(data.allFichas));
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

      if (Array.isArray(data.allUtensilios)) {
        setAllUtensilios(data.allUtensilios);
      } else if (Array.isArray(data.utensilios)) {
        setAllUtensilios(prev => [...prev.filter(item => item.unidade !== currentUnit), ...data.utensilios.map((item: Utensilio) => ({ ...item, unidade: currentUnit }))]);
      }

      if (Array.isArray(data.allMovimentacoesUtensilios)) {
        setAllMovimentacoesUtensilios(data.allMovimentacoesUtensilios);
      } else if (Array.isArray(data.movimentacoesUtensilios)) {
        setAllMovimentacoesUtensilios(prev => [...prev.filter(item => item.unidade !== currentUnit), ...data.movimentacoesUtensilios.map((item: MovimentacaoUtensilio) => ({ ...item, unidade: currentUnit }))]);
      }

      if (Array.isArray(data.allRelatorios)) {
        setAllRelatorios(data.allRelatorios);
      } else if (Array.isArray(data.relatorios)) {
        setAllRelatorios(prev => [...prev.filter(item => item.unidade !== currentUnit), ...data.relatorios.map((item: RelatorioGestor) => ({ ...item, unidade: currentUnit }))]);
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
      utensilios,
      movimentacoesUtensilios,
      relatorios,
      relatoriosPendentes,
      updateUser,
      addUtensilio,
      updateUtensilio,
      deleteUtensilio,
      registrarContagemUtensilio,
      registrarPerdaUtensilio,
      registrarEntradaUtensilio,
      addInsumo,
      updateInsumo,
      deleteInsumo,
      addMovimentacao,
      updateMovimentacao,
      deleteMovimentacao,
      criarFichasDePicole,
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
      deleteUser,
      addRelatorio,
      marcarRelatorioVerificado
    }}>
      {children}
    </StockContext.Provider>
  );
};
