import { TestBed } from '@angular/core/testing';
import { AppSettingsService } from './app-settings.service';
import { StorageService } from './storage.service';
import { AppSettings } from '../models';

describe('AppSettingsService', () => {
  let service: AppSettingsService;
  let storageService: jasmine.SpyObj<StorageService>;

  beforeEach(() => {
    const storageSpy = jasmine.createSpyObj('StorageService', ['get', 'set']);

    TestBed.configureTestingModule({
      providers: [
        AppSettingsService,
        { provide: StorageService, useValue: storageSpy },
      ],
    });

    service = TestBed.inject(AppSettingsService);
    storageService = TestBed.inject(
      StorageService
    ) as jasmine.SpyObj<StorageService>;
  });

  describe('設定の取得', () => {
    it('保存された設定を取得できること', async () => {
      const savedSettings: AppSettings = {
        theme: 'dark',
        terminalSettings: {
          fontSize: 14,
          fontFamily: 'monospace',
          cursorStyle: 'block',
          cursorBlink: true,
          scrollback: 1000,
        },
        connectionSettings: {
          timeout: 30,
          keepAliveInterval: 60,
          defaultPort: 22,
        },
        security: {
          biometricAuthEnabled: true,
          autoLockTimeout: 5,
          requireAuthOnAppResume: true,
        },
        ui: {
          showWelcomeScreen: false,
          defaultTab: 'tab1',
        },
      };

      storageService.get.and.returnValue(Promise.resolve(savedSettings));

      const settings = await service.getSettings();

      expect(settings).toEqual(savedSettings);
      expect(storageService.get).toHaveBeenCalledWith('app_settings');
    });

    it('設定が存在しない場合はデフォルト設定を返すこと', async () => {
      storageService.get.and.returnValue(Promise.resolve(null));

      const settings = await service.getSettings();

      expect(settings.theme).toBe('system');
      expect(settings.terminalSettings.fontSize).toBe(14);
      expect(settings.connectionSettings.defaultPort).toBe(22);
      expect(settings.security.biometricAuthEnabled).toBe(false);
      expect(settings.ui.showWelcomeScreen).toBe(true);
    });
  });

  describe('設定の保存', () => {
    it('設定を保存できること', async () => {
      const newSettings: AppSettings = {
        theme: 'light',
        terminalSettings: {
          fontSize: 16,
          fontFamily: 'Consolas',
          cursorStyle: 'underline',
          cursorBlink: false,
          scrollback: 2000,
        },
        connectionSettings: {
          timeout: 60,
          keepAliveInterval: 30,
          defaultPort: 2222,
        },
        security: {
          biometricAuthEnabled: true,
          autoLockTimeout: 10,
          requireAuthOnAppResume: false,
        },
        ui: {
          showWelcomeScreen: false,
          defaultTab: 'tab2',
        },
      };

      storageService.set.and.returnValue(Promise.resolve());

      await service.saveSettings(newSettings);

      expect(storageService.set).toHaveBeenCalledWith(
        'app_settings',
        newSettings
      );
    });
  });

  describe('部分的な設定の更新', () => {
    it('特定の設定のみを更新できること', async () => {
      const currentSettings = await service.getDefaultSettings();
      storageService.get.and.returnValue(Promise.resolve(currentSettings));
      storageService.set.and.returnValue(Promise.resolve());

      await service.updateSettings({ theme: 'dark' });

      const savedSettings = storageService.set.calls.mostRecent()
        .args[1] as AppSettings;
      expect(savedSettings.theme).toBe('dark');
      expect(savedSettings.terminalSettings).toEqual(
        currentSettings.terminalSettings
      );
    });

    it('ネストされた設定を更新できること', async () => {
      const currentSettings = await service.getDefaultSettings();
      storageService.get.and.returnValue(Promise.resolve(currentSettings));
      storageService.set.and.returnValue(Promise.resolve());

      await service.updateSettings({
        terminalSettings: {
          ...currentSettings.terminalSettings,
          fontSize: 18,
        },
      });

      const savedSettings = storageService.set.calls.mostRecent()
        .args[1] as AppSettings;
      expect(savedSettings.terminalSettings.fontSize).toBe(18);
      expect(savedSettings.terminalSettings.fontFamily).toBe(
        currentSettings.terminalSettings.fontFamily
      );
    });
  });

  describe('設定のリセット', () => {
    it('デフォルト設定にリセットできること', async () => {
      storageService.set.and.returnValue(Promise.resolve());

      await service.resetSettings();

      const defaultSettings = await service.getDefaultSettings();
      expect(storageService.set).toHaveBeenCalledWith(
        'app_settings',
        defaultSettings
      );
    });
  });

  describe('個別設定の取得', () => {
    it('テーマ設定を取得できること', async () => {
      const settings: AppSettings = {
        ...(await service.getDefaultSettings()),
        theme: 'dark',
      };
      storageService.get.and.returnValue(Promise.resolve(settings));

      const theme = await service.getTheme();

      expect(theme).toBe('dark');
    });

    it('セキュリティ設定を取得できること', async () => {
      const settings: AppSettings = {
        ...(await service.getDefaultSettings()),
        security: {
          biometricAuthEnabled: true,
          autoLockTimeout: 15,
          requireAuthOnAppResume: true,
        },
      };
      storageService.get.and.returnValue(Promise.resolve(settings));

      const security = await service.getSecuritySettings();

      expect(security.biometricAuthEnabled).toBe(true);
      expect(security.autoLockTimeout).toBe(15);
    });
  });
});
