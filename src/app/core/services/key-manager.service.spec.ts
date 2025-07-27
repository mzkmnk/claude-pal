import { TestBed } from '@angular/core/testing';
import { KeyManagerService } from './key-manager.service';

describe('KeyManagerService', () => {
  let service: KeyManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KeyManagerService);
  });

  it('サービスが作成されること', () => {
    expect(service).toBeTruthy();
  });

  describe('generateKeyPair', () => {
    it('RSA 4096bitの鍵ペアを生成すること', async () => {
      const keyPair = await service.generateKeyPair('test-key');

      expect(keyPair).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.name).toBe('test-key');
      expect(keyPair.fingerprint).toBeDefined();
    });

    it('公開鍵がOpenSSH形式であること', async () => {
      const keyPair = await service.generateKeyPair('test-key');

      expect(keyPair.publicKey).toMatch(/^ssh-rsa\s+[A-Za-z0-9+/]+=*\s+.*$/);
    });
  });

  describe('saveKey', () => {
    it('鍵をKeychainに保存できること', async () => {
      const keyPair = await service.generateKeyPair('test-key');
      const result = await service.saveKey(keyPair);

      expect(result).toBe(true);
    });

    it('同じ名前の鍵を保存しようとするとエラーになること', async () => {
      const keyPair1 = await service.generateKeyPair('duplicate-key');
      await service.saveKey(keyPair1);

      const keyPair2 = await service.generateKeyPair('duplicate-key');
      await expectAsync(service.saveKey(keyPair2)).toBeRejectedWithError(
        'Key with this name already exists'
      );
    });
  });

  describe('getKey', () => {
    it('保存した鍵を取得できること', async () => {
      const originalKeyPair = await service.generateKeyPair('get-test-key');
      await service.saveKey(originalKeyPair);

      const retrievedKey = await service.getKey('get-test-key');

      expect(retrievedKey).toBeDefined();
      expect(retrievedKey).not.toBeNull();
      expect(retrievedKey!.name).toBe('get-test-key');
      expect(retrievedKey!.privateKey).toBe(originalKeyPair.privateKey);
    });

    it('存在しない鍵を取得しようとするとnullを返すこと', async () => {
      const result = await service.getKey('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('getAllKeys', () => {
    it('すべての鍵の一覧を取得できること', async () => {
      // テスト前にクリア
      const existingKeys = await service.getAllKeys();
      for (const key of existingKeys) {
        await service.deleteKey(key.name);
      }

      const keyPair1 = await service.generateKeyPair('key1');
      const keyPair2 = await service.generateKeyPair('key2');
      await service.saveKey(keyPair1);
      await service.saveKey(keyPair2);

      const keys = await service.getAllKeys();

      expect(keys.length).toBe(2);
      expect(keys.map(k => k.name)).toContain('key1');
      expect(keys.map(k => k.name)).toContain('key2');
    });

    it('鍵が存在しない場合は空配列を返すこと', async () => {
      // すべての鍵を削除
      const existingKeys = await service.getAllKeys();
      for (const key of existingKeys) {
        await service.deleteKey(key.name);
      }

      const keys = await service.getAllKeys();

      expect(keys).toEqual([]);
    });
  });

  describe('deleteKey', () => {
    it('鍵を削除できること', async () => {
      const keyPair = await service.generateKeyPair('delete-test-key');
      await service.saveKey(keyPair);

      const result = await service.deleteKey('delete-test-key');

      expect(result).toBe(true);

      const retrievedKey = await service.getKey('delete-test-key');
      expect(retrievedKey).toBeNull();
    });

    it('存在しない鍵を削除しようとするとfalseを返すこと', async () => {
      const result = await service.deleteKey('non-existent-key');

      expect(result).toBe(false);
    });
  });
});
