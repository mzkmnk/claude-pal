import { TestBed } from '@angular/core/testing';
import { NativeStorageService } from './native-storage.service';
import { StorageService } from './storage.service';

describe('NativeStorageService', () => {
  let service: NativeStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NativeStorageService],
    });
    service = TestBed.inject(NativeStorageService);
  });

  it('インスタンスが作成できること', () => {
    expect(service).toBeTruthy();
  });

  it('StorageServiceを継承していること', () => {
    expect(service instanceof StorageService).toBe(true);
  });

  it('必要なメソッドが定義されていること', () => {
    expect(service.get).toBeDefined();
    expect(service.set).toBeDefined();
    expect(service.remove).toBeDefined();
    expect(service.clear).toBeDefined();
    expect(service.keys).toBeDefined();
  });
});
