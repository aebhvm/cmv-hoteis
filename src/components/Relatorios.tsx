import React, { useRef, useState } from 'react';
import { useStock } from '../context/StockContext';
import readExcelFile from 'read-excel-file/browser';
import writeExcelFile from 'write-excel-file/browser';
import { 
  BarChart4, 
  Download, 
  Upload, 
  Trash2, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  PieChart, 
  RefreshCw,
  TrendingUp as ShockIcon,
  CheckCircle2,
  Lock
} from 'lucide-react';

type SpreadsheetRow = Record<string, unknown>;
type SpreadsheetCell = string | number | boolean | Date | null;

const INSUMO_HEADERS = ['id', 'nome', 'categoria', 'unidadeMedida', 'custoMedio', 'valorEmbalagem', 'conteudoEmbalagem', 'estoqueAtual', 'estoqueMinimo', 'fornecedor', 'validade', 'unidade'];
const FICHA_HEADERS = ['id', 'nome', 'categoria', 'precoVenda', 'rendimentoPorcoes', 'descricao', 'unidade'];
const INGREDIENTE_HEADERS = ['fichaId', 'insumoId', 'quantidade'];
const MOVIMENTACAO_HEADERS = ['id', 'insumoId', 'insumoNome', 'tipo', 'quantidade', 'custoUnitario', 'custoTotal', 'data', 'observacao', 'unidade'];
const VENDA_HEADERS = ['id', 'fichaId', 'fichaNome', 'quantidade', 'precoVendaUnitario', 'receitaTotal', 'custoInsumosTotal', 'data', 'unidade'];
const USUARIO_HEADERS = ['id', 'nome', 'email', 'cargo', 'estabelecimento', 'metaFCP', 'senha'];

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toOptionalNumber = (value: unknown) => value === null || value === undefined || value === '' ? undefined : toNumber(value);
const toString = (value: unknown) => value === null || value === undefined ? '' : String(value);

const toCellValue = (value: unknown): SpreadsheetCell => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) return value;
  return String(value);
};

const createSheet = (name: string, rows: SpreadsheetRow[], headers: string[]) => ({
  sheet: name,
  columns: headers.map(header => ({ width: Math.min(Math.max(header.length + 3, 14), 28) })),
  data: [
    headers.map(value => ({ value, fontWeight: 'bold' as const, backgroundColor: '#EAF0F8' })),
    ...rows.map(row => headers.map(header => toCellValue(row[header])))
  ]
});

const readSheetRows = (sheets: Array<{ sheet: string; data: SpreadsheetCell[][] }>, sheetName: string): SpreadsheetRow[] => {
  const sheet = sheets.find(item => item.sheet === sheetName);
  if (!sheet) throw new Error(`A aba "${sheetName}" não foi encontrada.`);
  const [headerRow, ...dataRows] = sheet.data;
  const headers = (headerRow || []).map(value => toString(value));
  return dataRows
    .filter(row => row.some(value => value !== null && value !== undefined && value !== ''))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));
};

const parseExcelBackup = async (file: File) => {
  const sheets = await readExcelFile(file) as Array<{ sheet: string; data: SpreadsheetCell[][] }>;
  const metadata = readSheetRows(sheets, 'Metadados');
  const format = metadata.find(row => row.chave === 'formato')?.valor;
  const version = metadata.find(row => row.chave === 'versao')?.valor;
  if (format !== 'CMV Hoteis Backup' || String(version) !== '1') {
    throw new Error('Este arquivo não é um backup Excel válido do CMV Hotéis.');
  }

  const profile = readSheetRows(sheets, 'Perfil')[0];
  if (!profile) throw new Error('O perfil do backup não foi encontrado.');

  const fichaRows = readSheetRows(sheets, 'Fichas');
  const ingredientes = readSheetRows(sheets, 'IngredientesFicha');
  const metaCurrentUnit = toString(metadata.find(row => row.chave === 'unidadeAtiva')?.valor);

  return {
    currentUnit: metaCurrentUnit || 'AeB Villa Mayor',
    user: {
      id: toString(profile.id) || undefined,
      nome: toString(profile.nome),
      email: toString(profile.email),
      cargo: toString(profile.cargo),
      estabelecimento: toString(profile.estabelecimento),
      metaFCP: toNumber(profile.metaFCP)
    },
    users: readSheetRows(sheets, 'Usuarios').map(row => ({
      id: toString(row.id) || undefined,
      nome: toString(row.nome), email: toString(row.email), cargo: toString(row.cargo),
      estabelecimento: toString(row.estabelecimento), metaFCP: toNumber(row.metaFCP), senha: toString(row.senha) || undefined
    })),
    allInsumos: readSheetRows(sheets, 'Insumos').map(row => ({
      id: toString(row.id), nome: toString(row.nome), categoria: toString(row.categoria),
      unidadeMedida: toString(row.unidadeMedida), custoMedio: toNumber(row.custoMedio),
      valorEmbalagem: toOptionalNumber(row.valorEmbalagem), conteudoEmbalagem: toOptionalNumber(row.conteudoEmbalagem),
      estoqueAtual: toNumber(row.estoqueAtual), estoqueMinimo: toNumber(row.estoqueMinimo),
      fornecedor: toString(row.fornecedor) || undefined, validade: toString(row.validade) || undefined,
      unidade: toString(row.unidade) || undefined
    })),
    allFichas: fichaRows.map(row => ({
      id: toString(row.id), nome: toString(row.nome), categoria: toString(row.categoria),
      precoVenda: toNumber(row.precoVenda), rendimentoPorcoes: toNumber(row.rendimentoPorcoes, 1),
      descricao: toString(row.descricao) || undefined, unidade: toString(row.unidade) || undefined,
      ingredientes: ingredientes.filter(item => toString(item.fichaId) === toString(row.id)).map(item => ({
        insumoId: toString(item.insumoId), quantidade: toNumber(item.quantidade)
      }))
    })),
    allMovimentacoes: readSheetRows(sheets, 'Movimentacoes').map(row => ({
      id: toString(row.id), insumoId: toString(row.insumoId), insumoNome: toString(row.insumoNome),
      tipo: toString(row.tipo), quantidade: toNumber(row.quantidade), custoUnitario: toOptionalNumber(row.custoUnitario),
      custoTotal: toNumber(row.custoTotal), data: toString(row.data), observacao: toString(row.observacao) || undefined,
      unidade: toString(row.unidade) || undefined
    })),
    allVendas: readSheetRows(sheets, 'Vendas').map(row => ({
      id: toString(row.id), fichaId: toString(row.fichaId), fichaNome: toString(row.fichaNome),
      quantidade: toNumber(row.quantidade), precoVendaUnitario: toNumber(row.precoVendaUnitario),
      receitaTotal: toNumber(row.receitaTotal), custoInsumosTotal: toNumber(row.custoInsumosTotal),
      data: toString(row.data), unidade: toString(row.unidade) || undefined
    }))
  };
};

export const Relatorios: React.FC = () => {
  const { insumos, vendas, movimentacoes, user, getFichaCusto, fichas, resetData, importarDados, exportarDados } = useStock();
  const isColaborador = user.cargo === 'Colaborador';

  // Estado para simulação de choque de preços de insumos
  const [shockedInsumoId, setShockedInsumoId] = useState('');
  const [shockPercentage, setShockPercentage] = useState('20'); // ex: +20% no custo do insumo

  // Estado do importador
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportArea, setShowImportArea] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  // 1. Cálculos de CMV Geral
  const receitaAcumulada = vendas.reduce((acc, v) => acc + v.receitaTotal, 0);
  const custoTeoricoAcumulado = vendas.reduce((acc, v) => acc + v.custoInsumosTotal, 0);
  
  const totalDesperdicioAcumulado = movimentacoes
    .filter(m => m.tipo === 'desperdicio')
    .reduce((acc, m) => acc + m.custoTotal, 0);

  const totalQuebrasAjustes = movimentacoes
    .filter(m => m.tipo === 'ajuste' && m.quantidade < 0)
    .reduce((acc, m) => acc + Math.abs(m.custoTotal), 0);

  const cmvOperacionalReal = custoTeoricoAcumulado + totalDesperdicioAcumulado + totalQuebrasAjustes;

  // Porcentagens
  const cmvTeoricoPerc = receitaAcumulada > 0 ? (custoTeoricoAcumulado / receitaAcumulada) * 100 : 0;
  const cmvRealPerc = receitaAcumulada > 0 ? (cmvOperacionalReal / receitaAcumulada) * 100 : 0;
  const desperdicioFaturamentoPerc = receitaAcumulada > 0 ? (totalDesperdicioAcumulado / receitaAcumulada) * 100 : 0;

  // 2. Exportar o backup completo em abas Excel para auditoria e restauração.
  const handleExportData = async () => {
    const backup = JSON.parse(exportarDados());

    const sheets = [
      createSheet('Metadados', [
      { chave: 'formato', valor: 'CMV Hoteis Backup' },
      { chave: 'versao', valor: 1 },
      { chave: 'exportadoEm', valor: new Date().toISOString() },
      { chave: 'unidadeAtiva', valor: backup.currentUnit }
      ], ['chave', 'valor']),
      createSheet('Perfil', [backup.user], USUARIO_HEADERS.filter(header => header !== 'senha')),
      createSheet('Usuarios', backup.users || [], USUARIO_HEADERS),
      createSheet('Insumos', backup.allInsumos || [], INSUMO_HEADERS),
      createSheet('Fichas', (backup.allFichas || []).map(({ ingredientes, ...ficha }: SpreadsheetRow & { ingredientes?: unknown[] }) => ficha), FICHA_HEADERS),
      createSheet('IngredientesFicha', (backup.allFichas || []).flatMap((ficha: SpreadsheetRow & { ingredientes?: Array<{ insumoId: string; quantidade: number }> }) =>
      (ficha.ingredientes || []).map(ingrediente => ({ fichaId: ficha.id, ...ingrediente }))
      ), INGREDIENTE_HEADERS),
      createSheet('Movimentacoes', backup.allMovimentacoes || [], MOVIMENTACAO_HEADERS),
      createSheet('Vendas', backup.allVendas || [], VENDA_HEADERS)
    ];

    await writeExcelFile(sheets).toFile(`cmv-hoteis-backup-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 3. Importar um backup Excel gerado pelo próprio sistema.
  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isColaborador) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    let success = false;
    try {
      const backup = await parseExcelBackup(file);
      success = importarDados(JSON.stringify(backup));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Não foi possível ler este arquivo Excel.');
      setImportSuccess('');
      return;
    }

    if (success) {
      setImportSuccess('Dados importados com sucesso! O sistema foi atualizado.');
      setImportError('');
      setShowImportArea(false);
      setTimeout(() => setImportSuccess(''), 4000);
    } else {
      setImportError('Não foi possível restaurar os dados deste backup Excel.');
      setImportSuccess('');
    }
  };

  const handleReset = () => {
    if (isColaborador) return;

    if (window.confirm('ATENÇÃO: Isso apagará todas as suas alterações e redefinirá o sistema para os dados de exemplo padrão. Deseja continuar?')) {
      resetData();
      alert('Sistema reinicializado para os valores originais.');
    }
  };

  // 4. Analítica de Simulação de Choque de Preços
  // Retorna receitas afetadas pelo insumo selecionado
  const getFichasAfetadasPeloInsumo = () => {
    if (!shockedInsumoId) return [];

    const ins = insumos.find(i => i.id === shockedInsumoId);
    if (!ins) return [];

    const percMultiplier = 1 + (Number(shockPercentage) / 100);
    const simulatedInsumoCost = ins.custoMedio * percMultiplier;

    return fichas
      .filter(f => f.ingredientes.some(ing => ing.insumoId === shockedInsumoId))
      .map(f => {
        // Calcular o custo normal do prato
        const custoOriginal = getFichaCusto(f);
        
        // Calcular o custo simulado
        let custoSimulado = 0;
        f.ingredientes.forEach(ing => {
          const ingredientInsumo = insumos.find(i => i.id === ing.insumoId);
          if (ingredientInsumo) {
            const costOfIng = ing.insumoId === shockedInsumoId 
              ? ing.quantidade * simulatedInsumoCost 
              : ing.quantidade * ingredientInsumo.custoMedio;
            custoSimulado += costOfIng;
          }
        });
        custoSimulado = Number((custoSimulado / (f.rendimentoPorcoes || 1)).toFixed(2));

        // Calcular FCPs
        const fcpOriginal = f.precoVenda > 0 ? (custoOriginal / f.precoVenda) * 100 : 0;
        const fcpSimulado = f.precoVenda > 0 ? (custoSimulado / f.precoVenda) * 100 : 0;

        return {
          id: f.id,
          nome: f.nome,
          custoOriginal,
          custoSimulado,
          precoVenda: f.precoVenda,
          fcpOriginal,
          fcpSimulado,
          diferencaCusto: custoSimulado - custoOriginal
        };
      });
  };

  const fichasAfetadasSimuladas = getFichasAfetadasPeloInsumo();

  return (
    <div className="space-y-6" id="relatorios-view">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Relatórios & Visão de Custos</h2>
          <p className="text-xs text-slate-500">Audite discrepâncias operacionais, faça simulações de flutuação de custos de mercadoria e administre backups de dados</p>
        </div>
      </div>

      {/* Feedbacks */}
      {importSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
          {importSuccess}
        </div>
      )}

      {importError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 shadow-sm animate-fadeIn">
          <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
          {importError}
        </div>
      )}

      {/* Visão de Auditoria de CMV (Teórico vs Real) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel do CMV Operacional */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <span className="text-[10px] font-bold text-brand-navy uppercase tracking-widest block">Análise Comparativa de Perdas</span>
            <h3 className="text-lg font-black text-slate-800 mt-1">Visão Geral do CMV (Custo de Mercadoria Vendida)</h3>
            <p className="text-xs text-slate-500">Entenda a diferença entre o CMV Teórico de Vendas e o CMV Real incluindo Desperdícios</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CMV Teórico */}
            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase">CMV Teórico de Venda (Limpo)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-800 font-mono">{cmvTeoricoPerc.toFixed(1)}%</span>
                <span className="text-xs text-slate-400 font-mono">de faturamento</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Representa o custo ideal de insumos se as receitas fossem executadas sem desperdícios, perdas ou erros na cozinha.
              </p>
              <div className="border-t border-slate-100 mt-3 pt-2 text-xs font-mono flex justify-between text-slate-600">
                <span>Custo Teórico Acumulado:</span>
                <strong className="text-slate-800 font-bold">R$ {custoTeoricoAcumulado.toFixed(2)}</strong>
              </div>
            </div>

            {/* CMV Real Operacional */}
            <div className="p-4 bg-slate-50/50 rounded-xl border border-rose-200">
              <span className="text-[10px] text-rose-600 font-bold uppercase">CMV Real / Operacional (Com Perdas)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-rose-600 font-mono">{cmvRealPerc.toFixed(1)}%</span>
                <span className="text-xs text-rose-500/80 font-mono">de faturamento</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Representa o custo total real gasto, somando as receitas vendidas com o desperdício físico e quebras apuradas em inventário.
              </p>
              <div className="border-t border-slate-100 mt-3 pt-2 text-xs font-mono flex justify-between text-slate-600">
                <span>Custo Real Acumulado:</span>
                <strong className="text-slate-800 font-bold">R$ {cmvOperacionalReal.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Gráfico Analítico Simples ou Caixa de Informações */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Info className="w-4 h-4 text-brand-navy" />
              Impacto do Desperdício Financeiro
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Do total faturado de <strong className="text-slate-800 font-bold">R$ {receitaAcumulada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, você gastou <strong className="text-slate-800 font-bold">R$ {totalDesperdicioAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> em desperdícios e descarte direto na cozinha. 
              Esse vazamento financeiro consome exatamente <strong className="text-rose-600 font-bold">{desperdicioFaturamentoPerc.toFixed(1)}%</strong> do seu faturamento bruto, reduzindo a sua margem líquida final.
            </p>
          </div>
        </div>

        {/* Simulador Inteligente de Flutuação de Custos (Choque de Preços) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-bold text-brand-navy uppercase tracking-widest block">Simulador de Engenharia de Custo</span>
            <h3 className="text-base font-bold text-slate-800">Flutuação de Preço do Insumo</h3>
            <p className="text-xs text-slate-500">Simule inflação no preço de um ingrediente e veja o impacto instantâneo nas margens do cardápio</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Selecione o Insumo para Simular Choque</label>
              <select
                value={shockedInsumoId}
                onChange={(e) => setShockedInsumoId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs cursor-pointer focus:outline-none"
              >
                <option value="">-- Escolha o Insumo --</option>
                {insumos.map(ins => (
                  <option key={ins.id} value={ins.id}>{ins.nome} (R$ {ins.custoMedio.toFixed(2)}/{ins.unidadeMedida})</option>
                ))}
              </select>
            </div>

            {shockedInsumoId && (
              <>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Flutuação no Preço:</span>
                    <span className="font-bold text-rose-600">+{shockPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={shockPercentage}
                    onChange={(e) => setShockPercentage(e.target.value)}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Pratos Impactados */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold text-slate-800 uppercase block font-semibold">Fichas Técnicas Afetadas:</span>
                  
                  {fichasAfetadasSimuladas.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Nenhum prato utiliza este ingrediente.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {fichasAfetadasSimuladas.map(f => (
                        <div key={f.id} className="p-2.5 bg-slate-50 rounded-lg text-[11px] space-y-1 border border-slate-100">
                          <strong className="text-slate-800 block">{f.nome}</strong>
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>Original: R$ {f.custoOriginal.toFixed(2)} ({f.fcpOriginal.toFixed(0)}%)</span>
                            <span>→ Simulado: R$ {f.custoSimulado.toFixed(2)} ({f.fcpSimulado.toFixed(0)}%)</span>
                          </div>
                          <span className="text-[10px] font-bold text-rose-600 block text-right">
                            CMV Sobe { (f.fcpSimulado - f.fcpOriginal).toFixed(1) }%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Caixa de Configurações, Importação e Exportação (Backup de Segurança) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Administração de Dados & Segurança</span>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Download className="w-4.5 h-4.5 text-brand-navy" />
              Exportar Backup Excel
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Baixe receitas, ingredientes e histórico de movimentações em um arquivo Excel organizado por abas.
            </p>
            <button
              onClick={handleExportData}
              className="mt-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-brand-navy border border-slate-200 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              Fazer Download de Segurança
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Upload className="w-4.5 h-4.5 text-brand-navy" />
              Importar Backup Excel
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Restaure um arquivo Excel gerado pelo download de segurança para recompor o estoque.
            </p>
            
            {!isColaborador ? (
              <button
                onClick={() => setShowImportArea(!showImportArea)}
                className="mt-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all border border-slate-200 shadow-sm"
              >
                Abrir Caixa de Importação
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-2.5 py-1.5 rounded-lg mt-2">
                <Lock className="w-3.5 h-3.5" />
                <span>Exclusivo do Gestor</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <RefreshCw className="w-4.5 h-4.5 text-brand-navy" />
              Zerar Dados / Fábrica
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Deseja limpar todo o histórico e iniciar o cadastro de ingredientes e fichas técnicas do absoluto zero?
            </p>
            
            {!isColaborador ? (
              <button
                onClick={handleReset}
                className="mt-2 px-4 py-2 bg-slate-50 hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-300 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                Resetar para Padrão de Fábrica
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-2.5 py-1.5 rounded-lg mt-2">
                <Lock className="w-3.5 h-3.5" />
                <span>Exclusivo do Gestor</span>
              </div>
            )}
          </div>
        </div>

        {showImportArea && !isColaborador && (
          <div className="mt-6 border-t border-slate-100 pt-4 space-y-3 animate-fadeIn">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleImportFile}
            />
            <p className="text-xs text-slate-500">Selecione o arquivo <strong className="text-slate-700">.xlsx</strong> gerado pelo backup do CMV Hotéis.</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowImportArea(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-1.5 bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm"
              >
                Selecionar Arquivo Excel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
