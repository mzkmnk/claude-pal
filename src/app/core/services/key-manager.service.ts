import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { KeyPair } from './key-pair.interface';

@Injectable({
  providedIn: 'root',
})
export class KeyManagerService {
  private readonly keyPrefix = 'ssh_key_';
  private readonly platform = Capacitor.getPlatform();

  constructor() {}

  async generateKeyPair(name: string): Promise<KeyPair> {
    // 実際の実装では node-forge を使用しますが、
    // まずはモックデータで実装します
    const mockPrivateKey = this.generateMockPrivateKey();
    const mockPublicKey = this.generateMockPublicKey();

    return {
      name,
      privateKey: mockPrivateKey,
      publicKey: mockPublicKey,
      fingerprint: this.generateFingerprint(mockPublicKey),
      createdAt: new Date(),
    };
  }

  async saveKey(keyPair: KeyPair): Promise<boolean> {
    try {
      // 既存の鍵をチェック
      const existingKey = await this.getKey(keyPair.name);
      if (existingKey) {
        throw new Error('Key with this name already exists');
      }

      if (this.platform === 'ios') {
        // iOSの場合はKeychainに保存（後で実装）
        await this.saveToKeychain(keyPair);
      } else {
        // Web版のフォールバック
        await this.saveToLocalStorage(keyPair);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  async getKey(name: string): Promise<KeyPair | null> {
    try {
      if (this.platform === 'ios') {
        return await this.getFromKeychain(name);
      } else {
        return await this.getFromLocalStorage(name);
      }
    } catch (error) {
      return null;
    }
  }

  async getAllKeys(): Promise<KeyPair[]> {
    if (this.platform === 'ios') {
      return await this.getAllFromKeychain();
    } else {
      return await this.getAllFromLocalStorage();
    }
  }

  async deleteKey(name: string): Promise<boolean> {
    try {
      const key = await this.getKey(name);
      if (!key) {
        return false;
      }

      if (this.platform === 'ios') {
        await this.deleteFromKeychain(name);
      } else {
        await this.deleteFromLocalStorage(name);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Private methods for iOS Keychain
  private async saveToKeychain(keyPair: KeyPair): Promise<void> {
    // TODO: 実際のKeychainアクセスはCapacitorプラグインが必要
    // 現在はLocalStorageで代用
    await this.saveToLocalStorage(keyPair);
  }

  private async getFromKeychain(name: string): Promise<KeyPair | null> {
    // TODO: 実際のKeychainアクセスはCapacitorプラグインが必要
    return await this.getFromLocalStorage(name);
  }

  private async getAllFromKeychain(): Promise<KeyPair[]> {
    // TODO: 実際のKeychainアクセスはCapacitorプラグインが必要
    return await this.getAllFromLocalStorage();
  }

  private async deleteFromKeychain(name: string): Promise<void> {
    // TODO: 実際のKeychainアクセスはCapacitorプラグインが必要
    await this.deleteFromLocalStorage(name);
  }

  // Private methods for LocalStorage (Web fallback)
  private async saveToLocalStorage(keyPair: KeyPair): Promise<void> {
    const keys = await this.getAllFromLocalStorage();
    keys.push(keyPair);
    localStorage.setItem(this.keyPrefix + 'list', JSON.stringify(keys));
  }

  private async getFromLocalStorage(name: string): Promise<KeyPair | null> {
    const keys = await this.getAllFromLocalStorage();
    return keys.find(k => k.name === name) || null;
  }

  private async getAllFromLocalStorage(): Promise<KeyPair[]> {
    const keysJson = localStorage.getItem(this.keyPrefix + 'list');
    if (!keysJson) {
      return [];
    }

    try {
      return JSON.parse(keysJson);
    } catch {
      return [];
    }
  }

  private async deleteFromLocalStorage(name: string): Promise<void> {
    const keys = await this.getAllFromLocalStorage();
    const filteredKeys = keys.filter(k => k.name !== name);
    localStorage.setItem(this.keyPrefix + 'list', JSON.stringify(filteredKeys));
  }

  // Mock data generators
  private generateMockPrivateKey(): string {
    return `-----BEGIN RSA PRIVATE KEY-----
MIIJKQIBAAKCAgEA1234567890abcdefghijklmnopqrstuvwxyz...
...mock private key content...
-----END RSA PRIVATE KEY-----`;
  }

  private generateMockPublicKey(): string {
    const mockKey =
      'AAAAB3NzaC1yc2EAAAADAQABAAACAQDV' +
      Math.random().toString(36).substring(2, 15);
    return `ssh-rsa ${mockKey} claude-pal@ionic`;
  }

  private generateFingerprint(publicKey: string): string {
    // 簡易的なフィンガープリント生成（実際はSHA256ハッシュを使用）
    const hash = publicKey.split(' ')[1].substring(0, 16);
    return `SHA256:${hash}`;
  }
}
