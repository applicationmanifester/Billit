import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const initAndroidNative = (callbacks = {}) => {
  const { onBack, theme } = callbacks;

  // Handle Hardware Back Button
  const backListener = App.addListener('backButton', (data) => {
    if (onBack) {
      onBack(data);
    }
  });

  // Sync StatusBar with Theme
  const updateStatusBar = async (isDark) => {
    try {
      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light,
      });
      await StatusBar.setBackgroundColor({
        color: '#00000000',
      });
      // Ensure the webview extends under the transparent status bar
      await StatusBar.setOverlaysWebView({
        overlay: true,
      });
    } catch (e) {
      console.warn('StatusBar plugin not available', e);
    }
  };

  if (theme) {
    updateStatusBar(theme === 'dark');
  }

  const vibrate = async (type = 'click') => {
    try {
      if (type === 'error') {
        await Haptics.vibrate();
      } else {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (e) {
      // Fallback
      if (navigator.vibrate) navigator.vibrate(type === 'error' ? [50, 50, 50] : 10);
    }
  };

  return { updateStatusBar, vibrate, backListener };
};
