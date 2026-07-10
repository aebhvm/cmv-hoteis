import React, { useEffect, useMemo, useState } from 'react';
import { StockProvider, useStock } from './context/StockContext';
import { AuthSim } from './components/AuthSim';
import { Dashboard } from './components/Dashboard';
import { Insumos } from './components/Insumos';
import { FichasTecnicas } from './components/FichasTecnicas';
import { Movimentacoes } from './components/Movimentacoes';
import { Inventario } from './components/Inventario';
import { Vendas } from './components/Vendas';
import { Relatorios } from './components/Relatorios';
import { Usuarios } from './components/Usuarios';
import { 
  LayoutDashboard, 
  Boxes, 
  BookOpen, 
  ArrowUpDown, 
  ClipboardCheck, 
  ShoppingCart, 
  BarChart4, 
  LogOut, 
  User, 
  Bell, 
  Menu, 
  X,
  Target,
  Moon,
  Sun
} from 'lucide-react';

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('chef_is_logged_in') === 'true');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('chef_dark_mode') === 'true');
  
  const { user, insumos, currentUnit, setCurrentUnit } = useStock();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('chef_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Alertas de estoque mínimos ativos para exibir na barra de notificações
  const alertasAtivos = insumos.filter(ins => ins.estoqueAtual < ins.estoqueMinimo).length;

  const allTabs = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'insumos', label: 'Insumos', icon: Boxes },
    { id: 'fichas', label: 'Fichas Técnicas', icon: BookOpen },
    { id: 'movimentacoes', label: 'Movimentações', icon: ArrowUpDown },
    { id: 'inventario', label: 'Inventário / Auditoria', icon: ClipboardCheck },
    { id: 'vendas', label: 'Faturamento / PDV', icon: ShoppingCart },
    { id: 'relatorios', label: 'Relatórios & Simulações', icon: BarChart4 },
    { id: 'usuarios', label: 'Usuários', icon: User },
  ];

  const tabs = useMemo(() => {
    if (user.cargo !== 'Colaborador') return allTabs;
    const colaboradorTabs = ['movimentacoes', 'inventario', 'vendas'];
    return allTabs.filter(tab => colaboradorTabs.includes(tab.id));
  }, [user.cargo]);

  useEffect(() => {
    if (!tabs.some(tab => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id || 'movimentacoes');
    }
  }, [activeTab, tabs]);

  const handleLoginSuccess = () => {
    sessionStorage.setItem('chef_is_logged_in', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('chef_is_logged_in');
    setIsMobileMenuOpen(false);
    setActiveTab('dashboard');
    setIsLoggedIn(false);
  };

  // Se nao estiver logado, exibe a tela de login/configuracao inicial
  if (!isLoggedIn) {
    return <AuthSim onLoginSuccess={handleLoginSuccess} />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
      case 'insumos':
        if (user.cargo === 'Colaborador') return <Movimentacoes />;
        return <Insumos />;
      case 'fichas':
        if (user.cargo === 'Colaborador') return <Movimentacoes />;
        return <FichasTecnicas />;
      case 'movimentacoes':
        return <Movimentacoes />;
      case 'inventario':
        return <Inventario />;
      case 'vendas':
        return <Vendas />;
      case 'relatorios':
        if (user.cargo === 'Colaborador') return <Movimentacoes />;
        return <Relatorios />;
      case 'usuarios':
        if (user.cargo === 'Colaborador') return <Movimentacoes />;
        return <Usuarios />;
      default:
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col md:flex-row font-sans selection:bg-brand-navy selection:text-white" id="app-shell">
      {/* 1. Sidebar do Menu (Desktop) */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 relative z-20" id="app-sidebar">
        {/* Logo do Sistema */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5 shadow-sm shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* M em Azul Marinho */}
                <path 
                  d="M 18,15 L 18,48 L 28,40 L 50,65 L 72,40 L 82,48 L 82,15 L 50,38 Z" 
                  fill="#162E5B" 
                />
                {/* Triângulo Dourado */}
                <path 
                  d="M 23,13 L 77,13 L 50,34 Z" 
                  fill="#C2A45C" 
                />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-brand-navy leading-none">VM Hotéis</h1>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 block font-bold">Gestão Integrada</span>
            </div>
          </div>

          {/* Botão Hambúrguer Mobile */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-slate-500 hover:text-slate-800 transition-colors p-1"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Seletor de Unidade / Restaurante */}
        <div className={`p-4 bg-slate-50 border-b border-slate-100 md:block ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`} id="unit-switcher-widget">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Unidade Ativa F&B
          </label>
          <div className="relative">
            <select
              value={currentUnit}
              onChange={(e) => {
                setCurrentUnit(e.target.value as 'AeB Villa Mayor' | 'VM Cumbuco');
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-navy/20 cursor-pointer appearance-none pr-8 shadow-sm transition-all"
            >
              <option value="AeB Villa Mayor">🏨 AeB Villa Mayor</option>
              <option value="VM Cumbuco">🏖️ VM Cumbuco</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Informações da Sessão do Usuário */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 hidden md:block" id="user-profile-widget">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
              <User className="w-5 h-5 text-brand-navy" />
            </div>
            <div className="truncate max-w-[140px]">
              <span className="font-bold text-xs text-slate-800 block truncate">{user.nome}</span>
              <span className="text-[10px] text-slate-500 block truncate">{user.cargo}</span>
            </div>
          </div>
          {/* Badge de Meta CMV */}
          <div className="mt-3 py-1 px-2.5 bg-slate-100/80 rounded-lg border border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3 text-brand-navy" />
              Meta CMV:
            </span>
            <strong className="text-slate-800 font-mono">{user.metaFCP}%</strong>
          </div>
        </div>

        {/* Navegação Principal */}
        <nav className={`flex-1 p-4 space-y-1.5 md:block ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`} id="app-nav">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false); // fechar menu mobile ao navegar
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-brand-navy/5 text-brand-navy font-bold border border-brand-navy/10' 
                    : 'text-slate-600 hover:text-brand-navy hover:bg-slate-50'
                }`}
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.id === 'insumos' && alertasAtivos > 0 && (
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-black ${
                    isSelected ? 'bg-rose-100 text-rose-700' : 'bg-rose-50 text-rose-700 border border-rose-100/50'
                  }`}>
                    {alertasAtivos}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar - Log Out */}
        <div className={`p-4 border-t border-slate-100 md:block ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
          <button
            onClick={() => {
              if (window.confirm('Deseja realmente sair da sessão gerencial?')) {
                handleLogout();
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* 2. Área Principal de Conteúdo */}
      <main className="flex-1 flex flex-col min-w-0" id="app-main-content">
        {/* Barra Superior de Notificações / Status */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Unidade:</span>
            <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              {user.estabelecimento}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsDarkMode(current => !current)}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
              title={isDarkMode ? 'Usar tela clara' : 'Usar tela escura'}
              aria-label={isDarkMode ? 'Usar tela clara' : 'Usar tela escura'}
              aria-pressed={isDarkMode}
            >
              {isDarkMode
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />}
            </button>

            {/* Notificações rápidas de estoque */}
            <div className="relative group">
              <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 transition-colors relative">
                <Bell className="w-4 h-4" />
                {alertasAtivos > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>
              {alertasAtivos > 0 && (
                <div className="absolute right-0 top-11 bg-white border border-slate-200 rounded-xl p-3 shadow-xl w-64 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all text-xs z-50">
                  <span className="font-bold text-slate-900 block mb-1">Avisos Importantes</span>
                  <p className="text-slate-600">Existem <strong className="text-rose-600">{alertasAtivos} insumos</strong> com nível de estoque abaixo do mínimo necessário.</p>
                </div>
              )}
            </div>

            {/* Avatar no Header */}
            <div className="flex items-center gap-2 bg-slate-50 pl-2.5 pr-3 py-1 rounded-xl border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-brand-navy/5 flex items-center justify-center border border-brand-navy/15 text-brand-navy text-[10px] font-bold">
                {user.nome.charAt(0)}
              </div>
              <span className="text-[11px] font-bold text-slate-700 hidden sm:block">{user.nome}</span>
            </div>
          </div>
        </header>

        {/* Corpo da Visão Ativa */}
        <div className="flex-1 overflow-y-auto p-6" id="view-container">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StockProvider>
      <AppContent />
    </StockProvider>
  );
}
