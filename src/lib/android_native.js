import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

export const initAndroidNative = (callbacks = {}) => {
  const { onBack, theme } = callbacks;

  // Handle Hardware Back Button
  App.addListener('backButton', (data) => {
    if (onBack) {
      onBack(data);
    } else {
      // Default behavior: go back in history or exit
      if (window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    }
  });

  // Sync StatusBar with Theme
  const updateStatusBar = async (isDark) => {
    try {
      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light,
      });
      await StatusBar.setBackgroundColor({
        color: isDark ? '#0a0a0f' : '#ffffff',
      });
    } catch (e) {
      console.warn('StatusBar plugin not available', e);
    }
  };

  if (theme) {
    updateStatusBar(theme === 'dark');
  }

  return { updateStatusBar };
};
