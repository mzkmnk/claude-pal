import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';

interface Migration {
  version: string;
  migrate: () => Promise<void>;
}

@Injectable({
  providedIn: 'root',
})
export class MigrationService {
  private readonly VERSION_KEY = 'app_version';
  private readonly INITIAL_VERSION = '0.0.0';
  private migrations: Migration[] = [];
  private storageService = inject(StorageService);

  async getCurrentVersion(): Promise<string> {
    const version = await this.storageService.get<string>(this.VERSION_KEY);
    return version || this.INITIAL_VERSION;
  }

  async setVersion(version: string): Promise<void> {
    await this.storageService.set(this.VERSION_KEY, version);
  }

  registerMigration(version: string, migrate: () => Promise<void>): void {
    this.migrations.push({ version, migrate });
    // バージョン順にソート
    this.migrations.sort((a, b) => this.compareVersions(a.version, b.version));
  }

  async migrate(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const pendingMigrations = this.migrations.filter(
      m => this.compareVersions(m.version, currentVersion) > 0
    );

    if (pendingMigrations.length === 0) {
      return;
    }

    for (const migration of pendingMigrations) {
      try {
        await migration.migrate();
      } catch (error) {
        throw new Error(
          `Migration to version ${migration.version} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // 最新バージョンに更新
    const latestVersion =
      pendingMigrations[pendingMigrations.length - 1].version;
    await this.setVersion(latestVersion);
  }

  compareVersions(version1: string, version2: string): number {
    const parts1 = this.parseVersion(version1);
    const parts2 = this.parseVersion(version2);

    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
  }

  async getAllStorageData(): Promise<Record<string, unknown>> {
    const keys = await this.storageService.keys();
    const data: Record<string, unknown> = {};

    for (const key of keys) {
      data[key] = await this.storageService.get(key);
    }

    return data;
  }

  async renameKey(oldKey: string, newKey: string): Promise<void> {
    const value = await this.storageService.get(oldKey);
    if (value !== null) {
      await this.storageService.set(newKey, value);
      await this.storageService.remove(oldKey);
    }
  }

  private parseVersion(version: string): [number, number, number] {
    const parts = version.split('.').map(p => parseInt(p, 10) || 0);
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  }
}
