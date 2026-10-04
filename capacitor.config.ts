import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amobedae.jarvis',
  appName: 'Jarvis',
  webDir: 'dist',
  backgroundColor: '#17151f',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_jarvis',
      iconColor: '#a390f5',
    },
  },
};

export default config;
