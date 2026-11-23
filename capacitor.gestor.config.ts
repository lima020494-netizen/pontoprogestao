import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pontoprogestao.gestor',
  appName: 'Ponto Pro Gestor',
  webDir: 'capacitor-shell',
  server: {
    url: 'https://vippontopro.app/',
    cleartext: false,
  },
};

export default config;
