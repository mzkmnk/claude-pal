import { TestBed } from '@angular/core/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EncryptionService);
  });

  describe('暗号化と復号', () => {
    it('文字列を暗号化して復号できること', async () => {
      const plainText = 'This is a secret message';
      const password = 'strong-password';

      const encrypted = await service.encrypt(plainText, password);
      expect(encrypted).not.toBe(plainText);
      expect(encrypted.length).toBeGreaterThan(0);

      const decrypted = await service.decrypt(encrypted, password);
      expect(decrypted).toBe(plainText);
    });

    it('オブジェクトを暗号化して復号できること', async () => {
      const data = {
        username: 'testuser',
        apiKey: 'secret-api-key',
        settings: {
          enabled: true,
          value: 42,
        },
      };
      const password = 'encryption-key';

      const encrypted = await service.encryptObject(data, password);
      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');

      const decrypted = await service.decryptObject<typeof data>(
        encrypted,
        password
      );
      expect(decrypted).toEqual(data);
    });

    it('空文字列を暗号化できること', async () => {
      const plainText = '';
      const password = 'password';

      const encrypted = await service.encrypt(plainText, password);
      const decrypted = await service.decrypt(encrypted, password);

      expect(decrypted).toBe(plainText);
    });

    it('特殊文字を含む文字列を暗号化できること', async () => {
      const plainText = '日本語テキスト 🔐 Special!@#$%^&*()';
      const password = 'パスワード';

      const encrypted = await service.encrypt(plainText, password);
      const decrypted = await service.decrypt(encrypted, password);

      expect(decrypted).toBe(plainText);
    });
  });

  describe('エラーハンドリング', () => {
    it('間違ったパスワードで復号するとエラーになること', async () => {
      const plainText = 'Secret data';
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';

      const encrypted = await service.encrypt(plainText, correctPassword);

      await expectAsync(
        service.decrypt(encrypted, wrongPassword)
      ).toBeRejected();
    });

    it('不正な暗号化データを復号するとエラーになること', async () => {
      const invalidData = 'not-encrypted-data';
      const password = 'password';

      await expectAsync(service.decrypt(invalidData, password)).toBeRejected();
    });

    it('不正なJSONを復号オブジェクトとして扱うとエラーになること', async () => {
      const plainText = 'not a json string';
      const password = 'password';

      const encrypted = await service.encrypt(plainText, password);

      await expectAsync(
        service.decryptObject(encrypted, password)
      ).toBeRejected();
    });
  });

  describe('パスワード生成', () => {
    it('ランダムなパスワードを生成できること', () => {
      const password1 = service.generatePassword();
      const password2 = service.generatePassword();

      expect(password1.length).toBeGreaterThanOrEqual(32);
      expect(password2.length).toBeGreaterThanOrEqual(32);
      expect(password1).not.toBe(password2);
    });

    it('指定した長さのパスワードを生成できること', () => {
      const length = 64;
      const password = service.generatePassword(length);

      expect(password.length).toBe(length);
    });
  });

  describe('ハッシュ生成', () => {
    it('同じ入力から同じハッシュが生成されること', async () => {
      const input = 'test-input';

      const hash1 = await service.hash(input);
      const hash2 = await service.hash(input);

      expect(hash1).toBe(hash2);
    });

    it('異なる入力から異なるハッシュが生成されること', async () => {
      const input1 = 'test-input-1';
      const input2 = 'test-input-2';

      const hash1 = await service.hash(input1);
      const hash2 = await service.hash(input2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
