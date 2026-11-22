import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vippontopro.gestor',
  appName: 'Ponto Pro Gestor',
  webDir: 'dist',
  server: {
    url: 'https://vippontopro.app/gestor',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
