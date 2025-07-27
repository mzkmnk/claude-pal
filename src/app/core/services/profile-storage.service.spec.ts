import { TestBed } from '@angular/core/testing';
import { ProfileStorageService } from './profile-storage.service';
import { StorageService } from './storage.service';
import { ConnectionProfile } from '../models';

describe('ProfileStorageService', () => {
  let service: ProfileStorageService;
  let storageService: jasmine.SpyObj<StorageService>;

  beforeEach(() => {
    const storageSpy = jasmine.createSpyObj('StorageService', [
      'get',
      'set',
      'remove',
      'clear',
      'keys',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ProfileStorageService,
        { provide: StorageService, useValue: storageSpy },
      ],
    });

    service = TestBed.inject(ProfileStorageService);
    storageService = TestBed.inject(
      StorageService
    ) as jasmine.SpyObj<StorageService>;
  });

  describe('プロファイルの保存', () => {
    it('新しいプロファイルを保存できること', async () => {
      const profile: Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt'> =
        {
          name: 'Test Server',
          host: 'example.com',
          port: 22,
          username: 'user',
          authType: 'key',
          keyId: 'key-123',
        };

      storageService.get.and.returnValue(Promise.resolve([]));
      storageService.set.and.returnValue(Promise.resolve());

      const savedProfile = await service.saveProfile(profile);

      expect(savedProfile.id).toBeDefined();
      expect(savedProfile.name).toBe(profile.name);
      expect(savedProfile.createdAt).toBeDefined();
      expect(savedProfile.updatedAt).toBeDefined();
      expect(storageService.set).toHaveBeenCalled();
    });

    it('既存のプロファイルを更新できること', async () => {
      const existingProfile: ConnectionProfile = {
        id: 'existing-id',
        name: 'Existing Server',
        host: 'old.example.com',
        port: 22,
        username: 'user',
        authType: 'key',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedData = {
        ...existingProfile,
        host: 'new.example.com',
      };

      storageService.get.and.returnValue(Promise.resolve([existingProfile]));
      storageService.set.and.returnValue(Promise.resolve());

      const updatedProfile = await service.saveProfile(updatedData);

      expect(updatedProfile.id).toBe(existingProfile.id);
      expect(updatedProfile.host).toBe('new.example.com');
      expect(updatedProfile.updatedAt.getTime()).toBeGreaterThan(
        existingProfile.updatedAt.getTime()
      );
    });
  });

  describe('プロファイルの取得', () => {
    it('すべてのプロファイルを取得できること', async () => {
      const profiles: ConnectionProfile[] = [
        {
          id: '1',
          name: 'Server 1',
          host: 'server1.com',
          port: 22,
          username: 'user1',
          authType: 'key',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Server 2',
          host: 'server2.com',
          port: 2222,
          username: 'user2',
          authType: 'password',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      storageService.get.and.returnValue(Promise.resolve(profiles));

      const result = await service.getAllProfiles();

      expect(result).toEqual(profiles);
      expect(storageService.get).toHaveBeenCalledWith('connection_profiles');
    });

    it('IDでプロファイルを取得できること', async () => {
      const profile: ConnectionProfile = {
        id: 'test-id',
        name: 'Test Server',
        host: 'test.com',
        port: 22,
        username: 'test',
        authType: 'key',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      storageService.get.and.returnValue(Promise.resolve([profile]));

      const result = await service.getProfile('test-id');

      expect(result).toEqual(profile);
    });

    it('存在しないIDの場合nullを返すこと', async () => {
      storageService.get.and.returnValue(Promise.resolve([]));

      const result = await service.getProfile('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('プロファイルの削除', () => {
    it('指定したプロファイルを削除できること', async () => {
      const profiles: ConnectionProfile[] = [
        {
          id: '1',
          name: 'Server 1',
          host: 'server1.com',
          port: 22,
          username: 'user1',
          authType: 'key',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Server 2',
          host: 'server2.com',
          port: 22,
          username: 'user2',
          authType: 'key',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      storageService.get.and.returnValue(Promise.resolve(profiles));
      storageService.set.and.returnValue(Promise.resolve());

      await service.deleteProfile('1');

      expect(storageService.set).toHaveBeenCalledWith('connection_profiles', [
        profiles[1],
      ]);
    });
  });

  describe('最近使用したプロファイル', () => {
    it('プロファイル使用時にlastUsedが更新されること', async () => {
      const profile: ConnectionProfile = {
        id: 'test-id',
        name: 'Test Server',
        host: 'test.com',
        port: 22,
        username: 'test',
        authType: 'key',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      storageService.get.and.returnValue(Promise.resolve([profile]));
      storageService.set.and.returnValue(Promise.resolve());

      await service.markAsUsed('test-id');

      const savedProfiles = storageService.set.calls.mostRecent()
        .args[1] as ConnectionProfile[];
      expect(savedProfiles[0].lastUsed).toBeDefined();
    });

    it('最近使用したプロファイルを取得できること', async () => {
      const now = new Date();
      const profiles: ConnectionProfile[] = [
        {
          id: '1',
          name: 'Recently Used',
          host: 'recent.com',
          port: 22,
          username: 'user',
          authType: 'key',
          lastUsed: new Date(now.getTime() - 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Most Recent',
          host: 'mostrecent.com',
          port: 22,
          username: 'user',
          authType: 'key',
          lastUsed: now,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          name: 'Never Used',
          host: 'never.com',
          port: 22,
          username: 'user',
          authType: 'key',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      storageService.get.and.returnValue(Promise.resolve(profiles));

      const recent = await service.getRecentProfiles(2);

      expect(recent.length).toBe(2);
      expect(recent[0].id).toBe('2');
      expect(recent[1].id).toBe('1');
    });
  });
});
