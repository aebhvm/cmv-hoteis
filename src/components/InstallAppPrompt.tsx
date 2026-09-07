import React, { useEffect, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISSED_KEY = 'cmv_pwa_install_dismissed';

const isStandalone = () => (
  window.matchMedia('(display-mode: standalone)').matches
  || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
);

export const InstallAppPrompt: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY) === 'true') return undefined;

    const iosDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIos(iosDevice);
    setVisible(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) {
      setShowInstructions(true);
      return;
    }

    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') {
        localStorage.setItem(DISMISSED_KEY, 'true');
        setVisible(false);
      }
    } catch {
      setShowInstructions(true);
    } finally {
      setInstallEvent(null);
    }
  };

  if (!visible) return null;

  const browserInstructions = isIos
    ? 'Toque em Compartilhar e depois em Adicionar à Tela de Início.'
    : 'Toque no menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.';

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-[100] rounded-2xl border border-brand-navy/15 bg-white p-4 shadow-2xl sm:left-auto sm:right-5 sm:max-w-sm dark:border-slate-600 dark:bg-slate-900"
      role="dialog"
      aria-label="Baixar aplicativo VM Hotéis"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
        aria-label="Fechar aviso de instalação"
        title="Fechar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <img
          src="/icon-192.png"
          alt="Logo VM Hotéis"
          className="h-11 w-11 shrink-0 rounded-xl shadow-sm"
        />
        <div>
          <strong className="block text-sm font-bold text-slate-900 dark:text-white">Baixe o app VM Hotéis</strong>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
            Tenha acesso rápido ao estoque e às movimentações pela tela inicial do seu dispositivo.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void install()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-navy/90"
      >
        {isIos ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {installEvent ? 'Baixar e instalar' : 'Como instalar o app'}
      </button>

      {(isIos || showInstructions || !installEvent) && (
        <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{browserInstructions}</p>
      )}
    </aside>
  );
};
