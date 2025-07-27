import { TestBed } from '@angular/core/testing';
import { WebStorageService } from './web-storage.service';

describe('WebStorageService', () => {
  let service: WebStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebStorageService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('データの保存と取得', () => {
    it('オブジェクトを保存して取得できること', async () => {
      const testData = { id: 1, name: 'test' };

      await service.set('test_key', testData);
      const result = await service.get<typeof testData>('test_key');

      expect(result).toEqual(testData);
    });

    it('文字列を保存して取得できること', async () => {
      const testData = 'Hello, Storage!';

      await service.set('test_key', testData);
      const result = await service.get<string>('test_key');

      expect(result).toBe(testData);
    });

    it('数値を保存して取得できること', async () => {
      const testData = 42;

      await service.set('test_key', testData);
      const result = await service.get<number>('test_key');

      expect(result).toBe(testData);
    });

    it('配列を保存して取得できること', async () => {
      const testData = [1, 2, 3, 'four', { five: 5 }];

      await service.set('test_key', testData);
      const result = await service.get<typeof testData>('test_key');

      expect(result).toEqual(testData);
    });

    it('存在しないキーを取得するとnullが返ること', async () => {
      const result = await service.get('non_existent_key');

      expect(result).toBeNull();
    });
  });

  describe('データの更新', () => {
    it('既存のキーの値を更新できること', async () => {
      await service.set('test_key', 'initial value');
      await service.set('test_key', 'updated value');

      const result = await service.get<string>('test_key');

      expect(result).toBe('updated value');
    });
  });

  describe('データの削除', () => {
    it('保存したデータを削除できること', async () => {
      await service.set('test_key', { data: 'to be deleted' });

      await service.remove('test_key');

      const result = await service.get('test_key');
      expect(result).toBeNull();
    });

    it('存在しないキーを削除してもエラーにならないこと', async () => {
      await expectAsync(service.remove('non_existent_key')).toBeResolved();
    });
  });

  describe('全データのクリア', () => {
    it('複数のデータを一括削除できること', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');

      await service.clear();

      const result1 = await service.get('key1');
      const result2 = await service.get('key2');
      const result3 = await service.get('key3');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });
  });

  describe('キーの一覧取得', () => {
    it('保存されているすべてのキーを取得できること', async () => {
      await service.clear(); // 他のテストの影響を排除

      await service.set('alpha', 'a');
      await service.set('beta', 'b');
      await service.set('gamma', 'c');

      const keys = await service.keys();

      expect(keys).toContain('alpha');
      expect(keys).toContain('beta');
      expect(keys).toContain('gamma');
      expect(keys.length).toBeGreaterThanOrEqual(3);
    });

    it('データがない場合は空配列が返ること', async () => {
      await service.clear();

      const keys = await service.keys();

      expect(keys).toEqual([]);
    });
  });

  describe('エラーハンドリング', () => {
    it('localStorageが破損したデータを含む場合でもnullを返すこと', async () => {
      localStorage.setItem('corrupted_key', 'not a valid json');
      spyOn(console, 'error'); // エラーログを抑制

      const result = await service.get('corrupted_key');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('localStorageが利用できない場合でもエラーをスローすること', async () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jasmine
        .createSpy('setItem')
        .and.throwError('Storage quota exceeded');
      spyOn(console, 'error'); // エラーログを抑制

      await expectAsync(service.set('test_key', 'value')).toBeRejectedWithError(
        'Failed to store data for key: test_key'
      );

      expect(console.error).toHaveBeenCalled();
      localStorage.setItem = originalSetItem;
    });
  });
});
