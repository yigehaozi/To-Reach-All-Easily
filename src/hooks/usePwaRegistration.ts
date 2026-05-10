import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { showToast } from '@/utils/toastBus';

export function usePwaRegistration() {
  useEffect(() => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        showToast({
          message: 'OneFour 已更新，重新打开应用后可使用最新版本',
          variant: 'info',
          duration: 2600,
        });
      },
    });
  }, []);
}
