import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export abstract class StorageService {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T): Promise<void>;
  abstract remove(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  abstract keys(): Promise<string[]>;
}
