export type SetorEstoque = 'Café da manhã' | 'Restaurante';

export interface Insumo {
  id: string;
  nome: string;
  categoria: string;
  setor?: SetorEstoque;
  unidadeMedida: 'kg' | 'g' | 'L' | 'ml' | 'un';
  custoMedio: number; // Custo médio por unidade de medida (ex: R$ por kg)
  valorEmbalagem?: number; // Valor pago pela embalagem completa
  conteudoEmbalagem?: number; // Quantidade contida na embalagem na unidade de medida do insumo
  estoqueAtual: number;
  estoqueMinimo: number;
  fornecedor?: string;
  validade?: string; // Data de vencimento no formato YYYY-MM-DD
  unidade?: string;
}

export interface IngredienteFicha {
  insumoId: string;
  quantidade: number; // Quantidade na unidade de medida do insumo (ex: 0.150 para 150g se insumo é kg)
}

export interface FichaTecnica {
  id: string;
  nome: string;
  categoria: string;
  ingredientes: IngredienteFicha[];
  precoVenda: number;
  rendimentoPorcoes: number; // Rendimento em porções (geralmente 1)
  descricao?: string;
  unidade?: string;
}

export interface Movimentacao {
  id: string;
  insumoId: string;
  insumoNome: string;
  tipo: 'entrada' | 'saida' | 'desperdicio' | 'ajuste';
  quantidade: number;
  custoUnitario?: number; // Custo unitário registrado na entrada ou ajuste
  custoTotal: number;
  data: string;
  observacao?: string;
  estoqueAnterior?: number;
  estoqueFinal?: number;
  setor?: SetorEstoque;
  unidade?: string;
}

export interface VendaLog {
  id: string;
  fichaId: string;
  fichaNome: string;
  quantidade: number;
  precoVendaUnitario: number;
  receitaTotal: number;
  custoInsumosTotal: number;
  data: string;
  unidade?: string;
}

export interface UserProfile {
  id?: string;
  nome: string;
  email: string;
  cargo: 'Gestor' | 'Colaborador' | string;
  estabelecimento: string;
  metaFCP: number; // Meta de Food Cost Percentage / CMV % (ex: 30%)
}

export interface Utensilio {
  id: string;
  nome: string;
  categoria: string;
  unidadeMedida: 'un' | 'conjunto';
  quantidadeAtual: number;
  estoqueMinimo: number;
  quantidadeContada?: number;
  perdasAcumuladas: number;
  dataUltimaContagem?: string;
  observacao?: string;
  unidade?: string;
}

export interface MovimentacaoUtensilio {
  id: string;
  utensilioId: string;
  utensilioNome: string;
  tipo: 'contagem' | 'perda' | 'entrada';
  quantidade: number;
  data: string;
  observacao?: string;
  unidade?: string;
}

export type RelatorioAnexoTipo = 'audio' | 'imagem' | 'video';

export interface RelatorioAnexo {
  id: string;
  nome: string;
  tipo: RelatorioAnexoTipo;
  mimeType: string;
  tamanho: number;
  dataUrl: string;
}

export interface RelatorioGestor {
  id: string;
  titulo: string;
  texto: string;
  anexos: RelatorioAnexo[];
  autorId: string;
  autorNome: string;
  autorEmail: string;
  criadoEm: string;
  unidade: string;
  visualizadoPor: string[];
}
