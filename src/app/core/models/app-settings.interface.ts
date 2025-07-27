export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  terminalSettings: {
    fontSize: number;
    fontFamily: string;
    cursorStyle: 'block' | 'underline' | 'bar';
    cursorBlink: boolean;
    scrollback: number;
  };
  connectionSettings: {
    timeout: number; // seconds
    keepAliveInterval: number; // seconds
    defaultPort: number;
  };
  security: {
    biometricAuthEnabled: boolean;
    autoLockTimeout: number; // minutes, 0 = disabled
    requireAuthOnAppResume: boolean;
  };
  ui: {
    showWelcomeScreen: boolean;
    defaultTab: string;
  };
}
