import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EncryptionService {
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  async encrypt(plainText: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await this.deriveKey(password, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      this.encoder.encode(plainText)
    );

    const combined = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  }

  async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      const combined = Uint8Array.from(atob(encryptedData), c =>
        c.charCodeAt(0)
      );

      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const data = combined.slice(28);

      const key = await this.deriveKey(password, salt);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        data
      );

      return this.decoder.decode(decrypted);
    } catch (error) {
      throw new Error('Decryption failed: Invalid password or corrupted data');
    }
  }

  async encryptObject<T>(data: T, password: string): Promise<string> {
    const jsonString = JSON.stringify(data);
    return this.encrypt(jsonString, password);
  }

  async decryptObject<T>(encryptedData: string, password: string): Promise<T> {
    const jsonString = await this.decrypt(encryptedData, password);
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error('Failed to parse decrypted data as JSON');
    }
  }

  generatePassword(length: number = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const randomValues = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomValues, byte => chars[byte % chars.length]).join(
      ''
    );
  }

  async hash(input: string): Promise<string> {
    const data = this.encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}
