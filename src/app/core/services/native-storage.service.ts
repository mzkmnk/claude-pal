import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class NativeStorageService extends StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await Preferences.get({ key });
      if (result.value === null) {
        return null;
      }
      return JSON.parse(result.value) as T;
    } catch (error) {
      console.error(`Failed to get item from native storage: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await Preferences.set({
        key,
        value: serialized,
      });
    } catch (error) {
      console.error(`Failed to set item in native storage: ${key}`, error);
      throw new Error(`Failed to store data for key: ${key}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error(`Failed to remove item from native storage: ${key}`, error);
      throw new Error(`Failed to remove data for key: ${key}`);
    }
  }

  async clear(): Promise<void> {
    try {
      await Preferences.clear();
    } catch (error) {
      console.error('Failed to clear native storage', error);
      throw new Error('Failed to clear storage');
    }
  }

  async keys(): Promise<string[]> {
    try {
      const result = await Preferences.keys();
      return result.keys;
    } catch (error) {
      console.error('Failed to get keys from native storage', error);
      return [];
    }
  }
}
