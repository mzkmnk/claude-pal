import { TestBed } from '@angular/core/testing';
import { MigrationService } from './migration.service';
import { StorageService } from './storage.service';

describe('MigrationService', () => {
  let service: MigrationService;
  let storageService: jasmine.SpyObj<StorageService>;

  beforeEach(() => {
    const storageSpy = jasmine.createSpyObj('StorageService', [
      'get',
      'set',
      'keys',
    ]);

    TestBed.configureTestingModule({
      providers: [
        MigrationService,
        { provide: StorageService, useValue: storageSpy },
      ],
    });

    service = TestBed.inject(MigrationService);
    storageService = TestBed.inject(
      StorageService
    ) as jasmine.SpyObj<StorageService>;
  });

  describe('バージョン管理', () => {
    it('現在のバージョンを取得できること', async () => {
      storageService.get.and.returnValue(Promise.resolve('1.2.0'));

      const version = await service.getCurrentVersion();

      expect(version).toBe('1.2.0');
      expect(storageService.get).toHaveBeenCalledWith('app_version');
    });

    it('バージョンが存在しない場合は初期バージョンを返すこと', async () => {
      storageService.get.and.returnValue(Promise.resolve(null));

      const version = await service.getCurrentVersion();

      expect(version).toBe('0.0.0');
    });

    it('バージョンを保存できること', async () => {
      storageService.set.and.returnValue(Promise.resolve());

      await service.setVersion('2.0.0');

      expect(storageService.set).toHaveBeenCalledWith('app_version', '2.0.0');
    });
  });

  describe('マイグレーションの実行', () => {
    it('必要なマイグレーションを順番に実行すること', async () => {
      storageService.get.and.returnValue(Promise.resolve('1.0.0'));
      storageService.set.and.returnValue(Promise.resolve());

      const migration1 = jasmine
        .createSpy('migration1')
        .and.returnValue(Promise.resolve());
      const migration2 = jasmine
        .createSpy('migration2')
        .and.returnValue(Promise.resolve());
      const migration3 = jasmine
        .createSpy('migration3')
        .and.returnValue(Promise.resolve());

      service.registerMigration('1.0.1', migration1);
      service.registerMigration('1.1.0', migration2);
      service.registerMigration('2.0.0', migration3);

      await service.migrate();

      expect(migration1).toHaveBeenCalled();
      expect(migration2).toHaveBeenCalled();
      expect(migration3).toHaveBeenCalled();
      expect(storageService.set).toHaveBeenCalledWith('app_version', '2.0.0');
    });

    it('現在のバージョンより古いマイグレーションはスキップすること', async () => {
      storageService.get.and.returnValue(Promise.resolve('1.5.0'));
      storageService.set.and.returnValue(Promise.resolve());

      const migration1 = jasmine
        .createSpy('migration1')
        .and.returnValue(Promise.resolve());
      const migration2 = jasmine
        .createSpy('migration2')
        .and.returnValue(Promise.resolve());
      const migration3 = jasmine
        .createSpy('migration3')
        .and.returnValue(Promise.resolve());

      service.registerMigration('1.0.0', migration1);
      service.registerMigration('1.2.0', migration2);
      service.registerMigration('2.0.0', migration3);

      await service.migrate();

      expect(migration1).not.toHaveBeenCalled();
      expect(migration2).not.toHaveBeenCalled();
      expect(migration3).toHaveBeenCalled();
    });

    it('マイグレーションがない場合は何もしないこと', async () => {
      storageService.get.and.returnValue(Promise.resolve('1.0.0'));

      await service.migrate();

      expect(storageService.set).not.toHaveBeenCalled();
    });

    it('マイグレーションエラー時は途中で停止すること', async () => {
      storageService.get.and.returnValue(Promise.resolve('1.0.0'));

      const migration1 = jasmine
        .createSpy('migration1')
        .and.returnValue(Promise.resolve());
      const migration2 = jasmine
        .createSpy('migration2')
        .and.returnValue(Promise.reject(new Error('Migration failed')));
      const migration3 = jasmine
        .createSpy('migration3')
        .and.returnValue(Promise.resolve());

      service.registerMigration('1.1.0', migration1);
      service.registerMigration('1.2.0', migration2);
      service.registerMigration('1.3.0', migration3);

      await expectAsync(service.migrate()).toBeRejectedWith(
        new Error('Migration to version 1.2.0 failed: Migration failed')
      );

      expect(migration1).toHaveBeenCalled();
      expect(migration2).toHaveBeenCalled();
      expect(migration3).not.toHaveBeenCalled();
      expect(storageService.set).not.toHaveBeenCalled();
    });
  });

  describe('バージョン比較', () => {
    it('バージョンを正しく比較できること', () => {
      expect(service.compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(service.compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
      expect(service.compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
      expect(service.compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(service.compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
    });

    it('不正なバージョン形式でもエラーにならないこと', () => {
      expect(service.compareVersions('1.0', '1.0.0')).toBe(0);
      expect(service.compareVersions('1', '1.0.0')).toBe(0);
      expect(service.compareVersions('invalid', '1.0.0')).toBeLessThan(0);
    });
  });

  describe('データ変換ヘルパー', () => {
    it('ストレージの全データを取得できること', async () => {
      const mockData = {
        key1: 'value1',
        key2: { nested: 'value' },
        key3: ['array', 'values'],
      };

      storageService.keys.and.returnValue(
        Promise.resolve(['key1', 'key2', 'key3'])
      );
      storageService.get.and.callFake(<T>(key: string) =>
        Promise.resolve(mockData[key as keyof typeof mockData] as T)
      );

      const allData = await service.getAllStorageData();

      expect(allData).toEqual(mockData);
    });

    it('特定のキーをリネームできること', async () => {
      storageService.get.and.returnValue(Promise.resolve('oldValue'));
      storageService.set.and.returnValue(Promise.resolve());
      storageService.remove = jasmine
        .createSpy('remove')
        .and.returnValue(Promise.resolve());

      await service.renameKey('oldKey', 'newKey');

      expect(storageService.get).toHaveBeenCalledWith('oldKey');
      expect(storageService.set).toHaveBeenCalledWith('newKey', 'oldValue');
      expect(storageService.remove).toHaveBeenCalledWith('oldKey');
    });

    it('存在しないキーのリネームは何もしないこと', async () => {
      storageService.get.and.returnValue(Promise.resolve(null));

      await service.renameKey('nonExistentKey', 'newKey');

      expect(storageService.set).not.toHaveBeenCalled();
    });
  });
});
