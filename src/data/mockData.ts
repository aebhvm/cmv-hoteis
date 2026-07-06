import { Insumo, FichaTecnica, Movimentacao, VendaLog, UserProfile } from '../types';

export const INITIAL_USER: UserProfile = {
  nome: "Ataíde Silveira",
  email: "gerenteataide@gmail.com",
  cargo: "Gestor",
  estabelecimento: "AeB Villa Mayor",
  metaFCP: 30, // 30% meta de custo de insumos (FCP)
};

export const INITIAL_INSUMOS: Insumo[] = [
  {
    id: "ins-1",
    nome: "Filé Mignon (Limpo)",
    categoria: "Carnes e Peixes",
    unidadeMedida: "kg",
    custoMedio: 78.00,
    estoqueAtual: 14.5,
    estoqueMinimo: 5.0,
    fornecedor: "Frigorífico Boi Nobre"
  },
  {
    id: "ins-2",
    nome: "Salmão Fresco Inteiro",
    categoria: "Carnes e Peixes",
    unidadeMedida: "kg",
    custoMedio: 95.00,
    estoqueAtual: 4.2,
    estoqueMinimo: 6.0, // Alerta ativo de estoque mínimo!
    fornecedor: "Mariscos e Cia"
  },
  {
    id: "ins-3",
    nome: "Peito de Frango",
    categoria: "Carnes e Peixes",
    unidadeMedida: "kg",
    custoMedio: 22.50,
    estoqueAtual: 22.0,
    estoqueMinimo: 8.0,
    fornecedor: "Frigorífico Boi Nobre"
  },
  {
    id: "ins-4",
    nome: "Queijo Muçarela",
    categoria: "Laticínios",
    unidadeMedida: "kg",
    custoMedio: 38.00,
    estoqueAtual: 9.8,
    estoqueMinimo: 4.0,
    fornecedor: "Laticínios Serra de Minas"
  },
  {
    id: "ins-5",
    nome: "Azeite de Oliva Extra Virgem",
    categoria: "Secos e Mercearia",
    unidadeMedida: "L",
    custoMedio: 45.00,
    estoqueAtual: 6.0,
    estoqueMinimo: 2.0,
    fornecedor: "Distribuidora D'Ouro"
  },
  {
    id: "ins-6",
    nome: "Tomate Italiano",
    categoria: "Hortifruti",
    unidadeMedida: "kg",
    custoMedio: 8.50,
    estoqueAtual: 3.5,
    estoqueMinimo: 5.0, // Alerta ativo!
    fornecedor: "Ceasa Box 14"
  },
  {
    id: "ins-7",
    nome: "Farinha de Trigo Especial",
    categoria: "Secos e Mercearia",
    unidadeMedida: "kg",
    custoMedio: 6.20,
    estoqueAtual: 45.0,
    estoqueMinimo: 15.0,
    fornecedor: "Distribuidora D'Ouro"
  },
  {
    id: "ins-8",
    nome: "Limão Siciliano",
    categoria: "Hortifruti",
    unidadeMedida: "kg",
    custoMedio: 12.00,
    estoqueAtual: 8.0,
    estoqueMinimo: 3.0,
    fornecedor: "Ceasa Box 14"
  },
  {
    id: "ins-9",
    nome: "Creme de Leite Fresco",
    categoria: "Laticínios",
    unidadeMedida: "L",
    custoMedio: 26.00,
    estoqueAtual: 3.1, // Próximo ao mínimo
    estoqueMinimo: 3.0,
    fornecedor: "Laticínios Serra de Minas"
  },
  {
    id: "ins-10",
    nome: "Refrigerante Cola Lata 350ml",
    categoria: "Bebidas",
    unidadeMedida: "un",
    custoMedio: 2.40,
    estoqueAtual: 120.0,
    estoqueMinimo: 36.0,
    fornecedor: "Atacadão Bebidas Rápido"
  },
  {
    id: "ins-11",
    nome: "Cerveja Artesanal IPA 500ml",
    categoria: "Bebidas",
    unidadeMedida: "un",
    custoMedio: 7.90,
    estoqueAtual: 48.0,
    estoqueMinimo: 12.0,
    fornecedor: "Atacadão Bebidas Rápido"
  }
];

export const INITIAL_FICHAS: FichaTecnica[] = [
  {
    id: "fic-1",
    nome: "Strogonoff de Mignon Premium",
    categoria: "Pratos Principais",
    precoVenda: 64.90,
    rendimentoPorcoes: 1,
    descricao: "Strogonoff clássico com filé mignon macio, creme de leite fresco, cogumelos e batata palha caseira.",
    ingredientes: [
      { insumoId: "ins-1", quantidade: 0.200 }, // 200g de mignon
      { insumoId: "ins-9", quantidade: 0.100 }, // 100ml de creme de leite
      { insumoId: "ins-5", quantidade: 0.015 }, // 15ml de azeite
      { insumoId: "ins-7", quantidade: 0.010 }  // 10g de farinha
    ]
  },
  {
    id: "fic-2",
    nome: "Salmão com Crosta e Azeite de Ervas",
    categoria: "Pratos Principais",
    precoVenda: 79.00,
    rendimentoPorcoes: 1,
    descricao: "Posta de salmão grelhado regado com azeite de oliva extra virgem de ervas e tomates italianos assados.",
    ingredientes: [
      { insumoId: "ins-2", quantidade: 0.220 }, // 220g de salmão
      { insumoId: "ins-5", quantidade: 0.030 }, // 30ml de azeite
      { insumoId: "ins-6", quantidade: 0.120 }, // 120g de tomate italiano
      { insumoId: "ins-8", quantidade: 0.050 }  // 50g de limão siciliano
    ]
  },
  {
    id: "fic-3",
    nome: "Hambúrguer de Frango & Muçarela",
    categoria: "Pratos Principais",
    precoVenda: 34.00,
    rendimentoPorcoes: 1,
    descricao: "Blend artesanal de peito de frango grelhado com muçarela derretida, fatias de tomate italiano e molho verde.",
    ingredientes: [
      { insumoId: "ins-3", quantidade: 0.180 }, // 180g de frango
      { insumoId: "ins-4", quantidade: 0.050 }, // 50g de muçarela
      { insumoId: "ins-6", quantidade: 0.060 }, // 60g de tomate
      { insumoId: "ins-5", quantidade: 0.010 }  // 10ml de azeite
    ]
  },
  {
    id: "fic-4",
    nome: "Limonada Suíça Imperial",
    categoria: "Bebidas",
    precoVenda: 14.00,
    rendimentoPorcoes: 1,
    descricao: "Limonada refrescante batida com casca de limão siciliano, gelo e um toque especial.",
    ingredientes: [
      { insumoId: "ins-8", quantidade: 0.150 } // 150g de limão
    ]
  }
];

export const INITIAL_MOVIMENTACOES: Movimentacao[] = [
  {
    id: "mov-1",
    insumoId: "ins-1",
    insumoNome: "Filé Mignon (Limpo)",
    tipo: "entrada",
    quantidade: 10,
    custoUnitario: 78.00,
    custoTotal: 780.00,
    data: "2026-06-25T10:00:00Z",
    observacao: "Compra Semanal - Nota Fiscal 4589"
  },
  {
    id: "mov-2",
    insumoId: "ins-6",
    insumoNome: "Tomate Italiano",
    tipo: "entrada",
    quantidade: 15,
    custoUnitario: 8.50,
    custoTotal: 127.50,
    data: "2026-06-28T08:30:00Z",
    observacao: "Reposição Feira Ceasa"
  },
  {
    id: "mov-3",
    insumoId: "ins-1",
    insumoNome: "Filé Mignon (Limpo)",
    tipo: "desperdicio",
    quantidade: 0.8,
    custoTotal: 62.40,
    data: "2026-06-29T21:00:00Z",
    observacao: "Peça com descarte excessivo na limpeza da gordura"
  },
  {
    id: "mov-4",
    insumoId: "ins-9",
    insumoNome: "Creme de Leite Fresco",
    tipo: "desperdicio",
    quantidade: 1.0,
    custoTotal: 26.00,
    data: "2026-06-30T15:00:00Z",
    observacao: "Produto azedou por falha de refrigeração"
  },
  {
    id: "mov-5",
    insumoId: "ins-2",
    insumoNome: "Salmão Fresco Inteiro",
    tipo: "ajuste",
    quantidade: -0.5,
    custoTotal: 47.50,
    data: "2026-07-01T17:00:00Z",
    observacao: "Ajuste de inventário físico mensal (quebra)"
  }
];

export const INITIAL_VENDAS: VendaLog[] = [
  {
    id: "ven-1",
    fichaId: "fic-1",
    fichaNome: "Strogonoff de Mignon Premium",
    quantidade: 25,
    precoVendaUnitario: 64.90,
    receitaTotal: 1622.50,
    custoInsumosTotal: 467.25, // 25 * (15.6 + 2.6 + 0.675 + 0.062) = 25 * 18.937
    data: "2026-06-30T23:00:00Z"
  },
  {
    id: "ven-2",
    fichaId: "fic-3",
    fichaNome: "Hambúrguer de Frango & Muçarela",
    quantidade: 42,
    precoVendaUnitario: 34.00,
    receitaTotal: 1428.00,
    custoInsumosTotal: 290.22, // 42 * (4.05 + 1.9 + 0.51 + 0.45) = 42 * 6.91 = 290.22
    data: "2026-07-01T22:30:00Z"
  },
  {
    id: "ven-3",
    fichaId: "fic-4",
    fichaNome: "Limonada Suíça Imperial",
    quantidade: 50,
    precoVendaUnitario: 14.00,
    receitaTotal: 700.00,
    custoInsumosTotal: 90.00, // 50 * 1.8 = 90.00
    data: "2026-07-01T23:00:00Z"
  }
];
