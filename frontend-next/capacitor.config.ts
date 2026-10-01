import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syncsphere.app',
  appName: 'SyncSphere',
  webDir: 'out',
  server: {
    url: 'https://syncsphere-frontend-next.vercel.app',
    cleartext: false,
  },
};

export default config;