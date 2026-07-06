import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { Shield, Lock, Eye, EyeOff, LogIn, User, Building, Mail, CheckCircle } from 'lucide-react';

interface AuthSimProps {
  onLoginSuccess: () => void;
}

export const AuthSim: React.FC<AuthSimProps> = ({ onLoginSuccess }) => {
  const { users, registerUser, updateUser } = useStock();
  const [email, setEmail] = useState('gerenteataide@gmail.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState<'Gestor' | 'Colaborador'>('Gestor');
  const [estabelecimento, setEstabelecimento] = useState('AeB Villa Mayor');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (isRegister) {
      if (!nome || !email || !password || !estabelecimento) {
        setError('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      // Check if email already exists
      const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        setError('Este e-mail de usuário já está cadastrado.');
        return;
      }

      // Register new user
      registerUser({
        nome,
        email,
        cargo,
        estabelecimento,
        metaFCP: 30, // Default target FCP
        senha: password
      });

      setSuccessMsg('Usuário cadastrado com sucesso! Faça login abaixo.');
      setIsRegister(false);
      setPassword('');
      return;
    }

    // Login process
    if (!email || !password) {
      setError('Por favor, preencha usuário (e-mail) e senha.');
      return;
    }

    const foundUser = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.senha === password
    );

    if (foundUser) {
      updateUser(foundUser);
      onLoginSuccess();
    } else {
      setError('Usuário (e-mail) ou senha inválidos.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 sm:p-6 md:p-12 selection:bg-brand-navy selection:text-white" id="auth-screen">
      {/* Ambient background glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(22,46,91,0.04),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(194,164,92,0.03),transparent_50%)] pointer-events-none" />
      
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-[0_12px_40px_rgba(22,46,91,0.04)] p-8 sm:p-10 space-y-7 z-10 relative overflow-hidden" id="auth-card">
        {/* Premium Gold/Navy header indicator */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-navy via-brand-gold to-brand-navy" />
        
        {/* Logo VM Hotéis */}
        <div className="text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-brand-navy rounded-2xl flex items-center justify-center shadow-md relative overflow-hidden p-2.5">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* M em Branco */}
              <path 
                d="M 18,15 L 18,48 L 28,40 L 50,65 L 72,40 L 82,48 L 82,15 L 50,38 Z" 
                fill="#FFFFFF" 
              />
              {/* Triângulo Dourado */}
              <path 
                d="M 23,13 L 77,13 L 50,34 Z" 
                fill="#C2A45C" 
              />
            </svg>
          </div>
          
          <h1 className="mt-4 text-2xl font-black tracking-tight text-brand-navy font-sans leading-none">
            VM Hotéis
          </h1>
          <p className="text-xs text-slate-500 mt-2.5 font-semibold uppercase tracking-wider">
            Gestão Integrada de A&B / CMV
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              {isRegister ? 'Criar Nova Credencial' : 'Entrar na Plataforma'}
            </h2>
            <p className="text-[11px] text-slate-400 leading-normal">
              {isRegister 
                ? 'Preencha os dados operacionais abaixo para criar uma conta.' 
                : 'Insira o e-mail cadastrado e senha para acessar os painéis.'
              }
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-700 text-xs font-semibold" id="auth-error">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2" id="auth-success">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-3.5">
            {isRegister && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Completo</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-navy focus:border-brand-navy transition-all"
                      placeholder="ex: João da Silva"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nível de Acesso / Cargo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCargo('Gestor')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        cargo === 'Gestor'
                          ? 'bg-brand-navy text-white border-brand-navy shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Gestor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCargo('Colaborador')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        cargo === 'Colaborador'
                          ? 'bg-brand-navy text-white border-brand-navy shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Colaborador</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unidade F&B do Hotel</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Building className="w-4 h-4" />
                    </span>
                    <select
                      value={estabelecimento}
                      onChange={(e) => setEstabelecimento(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-navy focus:border-brand-navy transition-all appearance-none cursor-pointer"
                    >
                      <option value="AeB Villa Mayor">🏨 AeB Villa Mayor</option>
                      <option value="VM Cumbuco">🏖️ VM Cumbuco</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Usuário (E-mail)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-navy focus:border-brand-navy transition-all placeholder-slate-400"
                  placeholder="gerente@vmhoteis.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Senha</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-navy focus:border-brand-navy transition-all"
                  placeholder="******"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-2.5 px-4 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-md shadow-brand-navy/10 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            id="auth-submit-btn"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>{isRegister ? 'Cadastrar e Salvar' : 'Entrar no Sistema'}</span>
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs text-brand-navy hover:text-brand-navy/85 font-bold transition-colors cursor-pointer"
            >
              {isRegister ? 'Já tenho conta? Entrar' : 'Precisa de outro usuário? Cadastrar Novo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
