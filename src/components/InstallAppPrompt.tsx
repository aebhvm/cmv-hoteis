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

  useEffect(() => {
    const mobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      || window.matchMedia('(max-width: 768px)').matches;
    const iosDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (!mobileDevice || isStandalone() || localStorage.getItem(DISMISSED_KEY) === 'true') return undefined;

    setIsIos(iosDevice);
    if (iosDevice) setVisible(true);

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
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setVisible(false);
    setInstallEvent(null);
  };

  if (!visible) return null;

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-[100] rounded-2xl border border-brand-navy/15 bg-white p-4 shadow-2xl sm:left-auto sm:right-5 sm:max-w-sm dark:border-slate-600 dark:bg-slate-900"
      role="dialog"
      aria-label="Instalar aplicativo VM Hoteis"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
        aria-label="Fechar aviso de instalacao"
        title="Fechar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white">
          {isIos ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div>
          <strong className="block text-sm font-bold text-slate-900 dark:text-white">Instale o VM Hoteis</strong>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
            {isIos
              ? 'Toque em Compartilhar e depois em Adicionar a Tela de Inicio.'
              : 'Acesse o estoque mais rapido instalando o aplicativo no celular.'}
          </p>
        </div>
      </div>

      {installEvent && (
        <button
          type="button"
          onClick={() => void install()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-navy/90"
        >
          <Download className="h-4 w-4" />
          Instalar aplicativo
        </button>
      )}
    </aside>
  );
};
