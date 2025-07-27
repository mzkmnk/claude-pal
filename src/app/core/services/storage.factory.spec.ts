import { TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular';
import { StorageService } from './storage.service';
import { WebStorageService } from './web-storage.service';
import { NativeStorageService } from './native-storage.service';
import { storageServiceFactory } from './storage.factory';

describe('storageServiceFactory', () => {
  let mockPlatform: jasmine.SpyObj<Platform>;

  beforeEach(() => {
    mockPlatform = jasmine.createSpyObj('Platform', ['is']);
  });

  it('モバイルプラットフォームの場合NativeStorageServiceを返すこと', () => {
    mockPlatform.is.and.returnValue(true);

    const service = storageServiceFactory(mockPlatform);

    expect(service).toBeInstanceOf(NativeStorageService);
  });

  it('Webプラットフォームの場合WebStorageServiceを返すこと', () => {
    mockPlatform.is.and.returnValue(false);

    const service = storageServiceFactory(mockPlatform);

    expect(service).toBeInstanceOf(WebStorageService);
  });

  describe('StorageService統合テスト', () => {
    let service: StorageService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: StorageService,
            useFactory: storageServiceFactory,
            deps: [Platform],
          },
          {
            provide: Platform,
            useValue: { is: () => false },
          },
        ],
      });
      service = TestBed.inject(StorageService);
      // LocalStorageをクリア
      localStorage.clear();
    });

    afterEach(() => {
      // テスト後もLocalStorageをクリア
      localStorage.clear();
    });

    it('DIコンテナから正しくStorageServiceが取得できること', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(WebStorageService);
    });

    it('基本的なCRUD操作が正しく動作すること', async () => {
      const testData = { id: 1, name: 'integration test' };

      await service.set('test_key', testData);
      const retrieved = await service.get<typeof testData>('test_key');
      expect(retrieved).toEqual(testData);

      await service.remove('test_key');
      const afterRemove = await service.get('test_key');
      expect(afterRemove).toBeNull();
    });
  });
});
