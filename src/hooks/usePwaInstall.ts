import { useCallback, useEffect, useMemo, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export type PwaInstallActionResult =
  | 'accepted'
  | 'dismissed'
  | 'ios-guide'
  | 'unsupported'
  | 'already-installed';

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const mediaMatch = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const navigatorStandalone =
    typeof navigator !== 'undefined' &&
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return mediaMatch || navigatorStandalone;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandaloneMode());
  const isIos = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalledStateChange = () => {
      setIsInstalled(isStandaloneMode());
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalledStateChange);
    mediaQuery?.addEventListener?.('change', handleInstalledStateChange);
    mediaQuery?.addListener?.(handleInstalledStateChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalledStateChange);
      mediaQuery?.removeEventListener?.('change', handleInstalledStateChange);
      mediaQuery?.removeListener?.(handleInstalledStateChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<PwaInstallActionResult> => {
    if (isStandaloneMode() || isInstalled) {
      return 'already-installed';
    }

    if (deferredPrompt) {
      const promptEvent = deferredPrompt;
      setDeferredPrompt(null);
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      return outcome === 'accepted' ? 'accepted' : 'dismissed';
    }

    if (isIos) {
      return 'ios-guide';
    }

    return 'unsupported';
  }, [deferredPrompt, isInstalled, isIos]);

  return {
    canInstall: Boolean(deferredPrompt) || isIos,
    hasNativePrompt: Boolean(deferredPrompt),
    isInstalled,
    isIos,
    promptInstall,
  };
}
