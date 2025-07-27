import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { AppSettings } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AppSettingsService {
  private readonly SETTINGS_KEY = 'app_settings';
  private storageService = inject(StorageService);

  async getSettings(): Promise<AppSettings> {
    const settings = await this.storageService.get<AppSettings>(
      this.SETTINGS_KEY
    );
    return settings || this.getDefaultSettings();
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.storageService.set(this.SETTINGS_KEY, settings);
  }

  async updateSettings(partialSettings: Partial<AppSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const updatedSettings = this.deepMerge(currentSettings, partialSettings);
    await this.saveSettings(updatedSettings);
  }

  async resetSettings(): Promise<void> {
    await this.saveSettings(this.getDefaultSettings());
  }

  async getTheme(): Promise<AppSettings['theme']> {
    const settings = await this.getSettings();
    return settings.theme;
  }

  async getTerminalSettings(): Promise<AppSettings['terminalSettings']> {
    const settings = await this.getSettings();
    return settings.terminalSettings;
  }

  async getConnectionSettings(): Promise<AppSettings['connectionSettings']> {
    const settings = await this.getSettings();
    return settings.connectionSettings;
  }

  async getSecuritySettings(): Promise<AppSettings['security']> {
    const settings = await this.getSettings();
    return settings.security;
  }

  async getUISettings(): Promise<AppSettings['ui']> {
    const settings = await this.getSettings();
    return settings.ui;
  }

  getDefaultSettings(): AppSettings {
    return {
      theme: 'system',
      terminalSettings: {
        fontSize: 14,
        fontFamily: 'Courier New, monospace',
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
        biometricAuthEnabled: false,
        autoLockTimeout: 0,
        requireAuthOnAppResume: false,
      },
      ui: {
        showWelcomeScreen: true,
        defaultTab: 'tab1',
      },
    };
  }

  private deepMerge<T extends Record<string, any>>(
    target: T,
    source: Partial<T>
  ): T {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (
          sourceValue !== null &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue) &&
          targetValue !== null &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
        ) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue as T[Extract<keyof T, string>];
        }
      }
    }

    return result;
  }
}
