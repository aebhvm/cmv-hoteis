import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { UserProfile } from '../types';
import { 
  Users, 
  UserPlus, 
  Shield, 
  User, 
  Trash2, 
  Lock, 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  Building,
  X,
  Mail,
  Eye,
  EyeOff
} from 'lucide-react';

export const Usuarios: React.FC = () => {
  const { user, users, registerUser, deleteUser, currentUnit } = useStock();
  const isColaborador = user.cargo === 'Colaborador';

  // Estados do Formulário de Cadastro
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState<'Gestor' | 'Colaborador'>('Colaborador');
  const [metaFCP, setMetaFCP] = useState('30');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Estados de feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtragem dos usuários da unidade atual
  const filteredUsers = users.filter(u => u.estabelecimento === currentUnit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isColaborador) {
      setErrorMsg('Apenas gestores podem cadastrar usuários.');
      return;
    }

    if (!nome || !email || !senha || !metaFCP) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    // Validar se e-mail já existe
    const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      setErrorMsg('Este e-mail de usuário já está cadastrado.');
      return;
    }

    registerUser({
      nome,
      email,
      cargo,
      estabelecimento: currentUnit,
      metaFCP: Number(metaFCP),
      senha
    });

    // Resetar campos e dar sucesso
    setNome('');
    setEmail('');
    setCargo('Colaborador');
    setMetaFCP('30');
    setSenha('');
    setShowForm(false);
    setErrorMsg('');
    setSuccessMsg('Usuário cadastrado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDelete = (u: UserProfile & { senha?: string }) => {
    if (isColaborador) return;
    
    if (u.email.toLowerCase() === user.email.toLowerCase()) {
      setErrorMsg('Você não pode excluir o usuário com o qual está logado atualmente.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o usuário "${u.nome}"?`)) {
      deleteUser(u.email);
      setSuccessMsg('Usuário removido com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-6" id="usuarios-view">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-navy" />
            Usuários & Equipe do Restaurante
          </h2>
          <p className="text-xs text-slate-500">
            Cadastre novos colaboradores, audite permissões e troque de perfil para simulação na unidade <strong className="text-slate-700">{currentUnit}</strong>
          </p>
        </div>
        {!isColaborador && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all hover:scale-[1.01] cursor-pointer self-start sm:self-auto"
            id="btn-novo-usuario"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            Criar Novo Usuário
          </button>
        )}
      </div>

      {/* Feedbacks */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 shadow-sm" id="usr-success">
          <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 shadow-sm" id="usr-error">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-600" />
          {errorMsg}
        </div>
      )}

      {/* Formulário de Registro de Usuário */}
      {showForm && !isColaborador && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-md animate-fadeIn" id="usr-form">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-brand-navy" />
              Cadastrar Novo Usuário na Unidade {currentUnit}
            </h3>
            <button 
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Completo *</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                placeholder="ex: Carlos Souza"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Usuário / E-mail *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                  placeholder="carlos@vmhoteis.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Senha de Acesso *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                  placeholder="Mínimo 6 dígitos"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nível de Acesso / Cargo *</label>
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10 cursor-pointer"
              >
                <option value="Colaborador">Colaborador (Permissões de Leitura e Lançamentos simples)</option>
                <option value="Gestor">Gestor (Acesso Total de Administrador)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Meta Individual CMV (%) *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Target className="w-3.5 h-3.5" />
                </span>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={metaFCP}
                  onChange={(e) => setMetaFCP(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
                  placeholder="ex: 30"
                  required
                />
              </div>
            </div>

            <div className="flex items-end justify-end gap-2 md:col-span-1 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm"
              >
                Salvar Usuário
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Painel do Usuário Atual de Sessão */}
      <div className="p-4 bg-gradient-to-r from-brand-navy to-[#1a386d] text-white rounded-2xl shadow-sm border border-brand-navy/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white/10 rounded-xl text-brand-gold border border-white/10 shrink-0">
            {user.cargo === 'Gestor' ? <Shield className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block">Sessão Ativa no Navegador</span>
            <h3 className="text-base font-black flex items-center gap-1.5 mt-0.5">
              {user.nome} 
              <span className="text-xs font-bold bg-brand-gold/20 text-brand-gold px-2.5 py-0.5 rounded-full border border-brand-gold/10">
                {user.cargo}
              </span>
            </h3>
            <span className="text-xs text-slate-300 block">{user.email}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono border-l sm:border-l border-white/10 pl-0 sm:pl-6 pt-2 sm:pt-0">
          <div>
            <span className="text-[10px] text-slate-300 uppercase font-semibold block">Meta Individual CMV</span>
            <span className="text-lg font-black text-brand-gold">{user.metaFCP}%</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-300 uppercase font-semibold block">Restaurante Operando</span>
            <span className="text-xs font-bold block">{currentUnit}</span>
          </div>
        </div>
      </div>

      {/* Lista de Equipe / Usuários */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="usuarios-table-box">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800">Equipe Cadastrada para {currentUnit}</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Gerenciamento direto de colaboradores autorizados para o restaurante atual</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Nome / Colaborador</th>
                <th className="py-3.5 px-4">Usuário / E-mail</th>
                <th className="py-3.5 px-4">Cargo / Nível</th>
                <th className="py-3.5 px-4 text-center">Meta CMV</th>
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Nenhum usuário cadastrado para esta unidade.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isCurrentUser = u.email.toLowerCase() === user.email.toLowerCase();

                  return (
                    <tr key={u.email} className={`hover:bg-slate-50/30 transition-colors ${isCurrentUser ? 'bg-slate-50/70 font-medium' : ''}`}>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            u.cargo === 'Gestor' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/50' 
                              : 'bg-brand-navy/5 text-brand-navy border border-brand-navy/10'
                          }`}>
                            {u.nome.charAt(0)}
                          </div>
                          <div>
                            <span className="text-slate-800 font-bold block">
                              {u.nome} {isCurrentUser && <span className="text-[9px] font-bold text-brand-navy bg-brand-navy/10 px-1.5 py-0.5 rounded ml-1">Atual</span>}
                            </span>
                            <span className="text-[10px] text-slate-400">ID: {u.id || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                          u.cargo === 'Gestor'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {u.cargo === 'Gestor' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {u.cargo}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                        {u.metaFCP}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {!isColaborador ? (
                          <button
                            onClick={() => handleDelete(u)}
                            className={`p-1.5 rounded-lg border text-slate-400 transition-colors ${
                              isCurrentUser
                                ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                                : 'border-slate-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/50 cursor-pointer'
                            }`}
                            disabled={isCurrentUser}
                            title="Remover Usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">Restrito</span>
                        )}
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
