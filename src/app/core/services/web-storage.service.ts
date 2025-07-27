import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class WebStorageService extends StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Failed to get item from localStorage: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Failed to set item in localStorage: ${key}`, error);
      throw new Error(`Failed to store data for key: ${key}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item from localStorage: ${key}`, error);
      throw new Error(`Failed to remove data for key: ${key}`);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage', error);
      throw new Error('Failed to clear storage');
    }
  }

  async keys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error('Failed to get keys from localStorage', error);
      return [];
    }
  }
}
