'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export default function InstallApp() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true);

  useEffect(() => {
    const navigatorWithStandalone = navigator as NavigatorWithStandalone;
    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigatorWithStandalone.standalone === true;

    setIsInstalled(installed);
    setIsIos(
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsInstalled(false);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (isInstalled) {
    return null;
  }

  const install = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <aside className="mt-6 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-emerald-950">
          Install Quran Tutor for quick access
        </p>
        <p className="mt-1 text-sm leading-6 text-emerald-900/80">
          {isIos
            ? 'On iPhone or iPad, tap Share, then Add to Home Screen.'
            : installPrompt
              ? 'Add it to this device and open it like an app.'
              : 'Use your browser menu and choose Install app or Add to Home Screen.'}
        </p>
      </div>
      {installPrompt && (
        <button
          type="button"
          onClick={install}
          className="min-h-11 shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Install app
        </button>
      )}
    </aside>
  );
}
