import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { KeyPair } from './key-pair.interface';
import * as forge from 'node-forge';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

@Injectable({
  providedIn: 'root',
})
export class KeyManagerService {
  private readonly keyPrefix = 'ssh_key_';
  private readonly platform = Capacitor.getPlatform();
  private biometricAuthAvailable = false;
  private biometricInitialized = false;

  constructor() {
    this.initializeBiometricAuth();
  }

  private async initializeBiometricAuth(): Promise<void> {
    await this.checkBiometricAvailability();
    this.biometricInitialized = true;
  }

  // 生体認証の利用可能性をチェック
  private async checkBiometricAvailability(): Promise<void> {
    try {
      const result = await BiometricAuth.checkBiometry();
      this.biometricAuthAvailable = result.isAvailable;
    } catch (error) {
      this.biometricAuthAvailable = false;
    }
  }

  async generateKeyPair(name: string): Promise<KeyPair> {
    return new Promise((resolve, reject) => {
      try {
        // RSA 4096bit 鍵ペアの生成
        forge.pki.rsa.generateKeyPair(
          { bits: 4096, workers: -1 },
          (err, keypair) => {
            if (err) {
              reject(err);
              return;
            }

            // 秘密鍵をPEM形式に変換
            const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

            // 公開鍵をOpenSSH形式に変換
            const publicKeyOpenSSH = this.convertToOpenSSH(
              keypair.publicKey,
              name
            );

            // フィンガープリントの生成
            const fingerprint = this.generateFingerprint(keypair.publicKey);

            resolve({
              name,
              privateKey: privateKeyPem,
              publicKey: publicKeyOpenSSH,
              fingerprint,
              createdAt: new Date(),
            });
          }
        );
      } catch (error) {
        reject(error);
      }
    });
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
      // 生体認証の初期化を待つ
      if (!this.biometricInitialized) {
        await this.initializeBiometricAuth();
      }

      // 生体認証が利用可能な場合は認証を要求
      if (this.biometricAuthAvailable && this.platform === 'ios') {
        await this.authenticateWithBiometric();
      }

      if (this.platform === 'ios') {
        return await this.getFromKeychain(name);
      } else {
        return await this.getFromLocalStorage(name);
      }
    } catch (error) {
      throw error;
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
    try {
      // メタデータを保存（鍵名のリストを管理）
      const keysList = await this.getKeysListFromKeychain();
      keysList.push(keyPair.name);
      await SecureStorage.set(
        `${this.keyPrefix}list`,
        JSON.stringify(keysList)
      );

      // 鍵ペアを個別に保存
      const keyData = {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        fingerprint: keyPair.fingerprint,
        createdAt: keyPair.createdAt.toISOString(),
      };
      await SecureStorage.set(
        `${this.keyPrefix}${keyPair.name}`,
        JSON.stringify(keyData)
      );
    } catch (error) {
      // フォールバック: LocalStorageを使用
      await this.saveToLocalStorage(keyPair);
    }
  }

  private async getFromKeychain(name: string): Promise<KeyPair | null> {
    try {
      const result = await SecureStorage.get(`${this.keyPrefix}${name}`);

      if (!result) {
        return null;
      }

      const keyData = JSON.parse(result as string);
      return {
        name,
        publicKey: keyData.publicKey,
        privateKey: keyData.privateKey,
        fingerprint: keyData.fingerprint,
        createdAt: new Date(keyData.createdAt),
      };
    } catch (error) {
      // フォールバック: LocalStorageを使用
      return await this.getFromLocalStorage(name);
    }
  }

  private async getAllFromKeychain(): Promise<KeyPair[]> {
    try {
      const keysList = await this.getKeysListFromKeychain();
      const keys: KeyPair[] = [];

      for (const name of keysList) {
        const key = await this.getFromKeychain(name);
        if (key) {
          keys.push(key);
        }
      }

      return keys;
    } catch (error) {
      // フォールバック: LocalStorageを使用
      return await this.getAllFromLocalStorage();
    }
  }

  private async deleteFromKeychain(name: string): Promise<void> {
    try {
      // メタデータから削除
      const keysList = await this.getKeysListFromKeychain();
      const filteredList = keysList.filter(k => k !== name);
      await SecureStorage.set(
        `${this.keyPrefix}list`,
        JSON.stringify(filteredList)
      );

      // 鍵データを削除
      await SecureStorage.remove(`${this.keyPrefix}${name}`);
    } catch (error) {
      // フォールバック: LocalStorageを使用
      await this.deleteFromLocalStorage(name);
    }
  }

  // Keychainから鍵名リストを取得
  private async getKeysListFromKeychain(): Promise<string[]> {
    try {
      const result = await SecureStorage.get(`${this.keyPrefix}list`);

      if (!result) {
        return [];
      }

      return JSON.parse(result as string);
    } catch (error) {
      return [];
    }
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

  // OpenSSH形式への変換
  private convertToOpenSSH(
    publicKey: forge.pki.rsa.PublicKey,
    comment: string
  ): string {
    // RSA公開鍵の各コンポーネントを取得
    const n = publicKey.n.toByteArray();
    const e = publicKey.e.toByteArray();

    // OpenSSH形式のバイト配列を構築
    const type = 'ssh-rsa';
    const typeBytes = this.stringToBytes(type);

    // 各フィールドの長さとデータを結合
    const data = [
      ...this.uint32ToBytes(typeBytes.length),
      ...typeBytes,
      ...this.uint32ToBytes(e.length),
      ...e,
      ...this.uint32ToBytes(n.length),
      ...n,
    ];

    // Base64エンコード
    const base64 = forge.util.encode64(String.fromCharCode(...data));

    return `${type} ${base64} ${comment}`;
  }

  // SHA256フィンガープリントの生成
  private generateFingerprint(publicKey: forge.pki.rsa.PublicKey): string {
    // 公開鍵をDER形式でエンコード
    const der = forge.asn1
      .toDer(forge.pki.publicKeyToAsn1(publicKey))
      .getBytes();

    // SHA256ハッシュを計算
    const md = forge.md.sha256.create();
    md.update(der);
    const hash = md.digest();

    // Base64エンコード
    const base64 = forge.util.encode64(hash.getBytes());

    return `SHA256:${base64}`;
  }

  // ヘルパー関数：文字列をバイト配列に変換
  private stringToBytes(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    return bytes;
  }

  // ヘルパー関数：32ビット整数をバイト配列に変換（ビッグエンディアン）
  private uint32ToBytes(value: number): number[] {
    return [
      (value >> 24) & 0xff,
      (value >> 16) & 0xff,
      (value >> 8) & 0xff,
      value & 0xff,
    ];
  }

  // 生体認証を実行
  private async authenticateWithBiometric(): Promise<void> {
    try {
      await BiometricAuth.authenticate({
        reason: 'SSH鍵にアクセスするために認証が必要です',
        cancelTitle: 'キャンセル',
        allowDeviceCredential: true,
        iosFallbackTitle: 'パスコードを使用',
      });
    } catch (error) {
      throw new Error('生体認証に失敗しました');
    }
  }
}
