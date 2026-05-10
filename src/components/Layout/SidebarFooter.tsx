import { LogIn, Download } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { showToast } from '@/utils/toastBus';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export default function SidebarFooter() {
  const { setLoginModalOpen } = useAppStore();
  const { isInstalled, promptInstall } = usePwaInstall();

  const handleInstallPwa = async () => {
    const result = await promptInstall();

    switch (result) {
      case 'accepted':
        showToast({ message: '安装提示已打开，请按系统提示完成安装', variant: 'success' });
        break;
      case 'dismissed':
        showToast({ message: '已取消安装', variant: 'info' });
        break;
      case 'ios-guide':
        showToast({
          message: '请在浏览器菜单中选择“添加到主屏幕”完成安装',
          variant: 'info',
          duration: 3600,
        });
        break;
      case 'already-installed':
        showToast({ message: 'OneFour 已安装到设备', variant: 'success' });
        break;
      case 'unsupported':
      default:
        showToast({ message: '当前环境暂不支持直接安装 PWA', variant: 'info' });
        break;
    }
  };

  return (
    <div className="px-3 py-3 shrink-0 flex flex-col gap-1">
      <button
        onClick={() => setLoginModalOpen(true)}
        className="flex items-center justify-center gap-1 w-full h-7 rounded-[4px] bg-[var(--bg-invert)] text-[var(--bg-base)] text-[13px] font-medium hover:opacity-90 transition-opacity duration-[var(--transition-fast)]"
      >
        <LogIn size={14} />
        <span>登录</span>
      </button>
      <button
        onClick={() => {
          void handleInstallPwa();
        }}
        className="flex items-center justify-center gap-1 w-full h-7 rounded-[4px] bg-[var(--bg-overlay)] text-[var(--text-primary)] text-[13px] font-medium hover:bg-[var(--bg-overlay-hover)] transition-colors duration-[var(--transition-fast)]"
      >
        <Download size={14} />
        <span>{isInstalled ? '已安装' : '安装 PWA'}</span>
      </button>
    </div>
  );
}
