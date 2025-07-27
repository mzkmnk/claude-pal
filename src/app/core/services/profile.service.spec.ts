import { TestBed } from '@angular/core/testing';
import { ProfileService } from './profile.service';
import { ProfileStorageService } from './profile-storage.service';
import { AppSettingsService } from './app-settings.service';
import { ConnectionProfile, AppSettings } from '../models';

describe('ProfileService', () => {
  let service: ProfileService;
  let profileStorageService: jasmine.SpyObj<ProfileStorageService>;
  let appSettingsService: jasmine.SpyObj<AppSettingsService>;

  const mockProfile: ConnectionProfile = {
    id: 'test-id',
    name: 'Test Profile',
    host: '192.168.1.1',
    port: 22,
    username: 'testuser',
    authType: 'key',
    keyId: 'key-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSettings: AppSettings = {
    theme: 'dark',
    terminalSettings: {
      fontSize: 14,
      fontFamily: 'monospace',
      cursorStyle: 'block',
      cursorBlink: true,
      scrollback: 1000,
    },
    connectionSettings: {
      timeout: 30,
      keepAliveInterval: 60,
      defaultPort: 22,
    },
    security: {
      biometricAuthEnabled: true,
      autoLockTimeout: 5,
      requireAuthOnAppResume: true,
    },
    ui: {
      showWelcomeScreen: true,
      defaultTab: 'tab1',
    },
    defaultProfileId: 'test-id',
  };

  beforeEach(() => {
    const profileStorageSpy = jasmine.createSpyObj('ProfileStorageService', [
      'getAllProfiles',
      'getProfile',
      'saveProfile',
      'deleteProfile',
      'markAsUsed',
      'getRecentProfiles',
    ]);

    const appSettingsSpy = jasmine.createSpyObj('AppSettingsService', [
      'getSettings',
      'updateSettings',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: ProfileStorageService, useValue: profileStorageSpy },
        { provide: AppSettingsService, useValue: appSettingsSpy },
      ],
    });

    service = TestBed.inject(ProfileService);
    profileStorageService = TestBed.inject(
      ProfileStorageService
    ) as jasmine.SpyObj<ProfileStorageService>;
    appSettingsService = TestBed.inject(
      AppSettingsService
    ) as jasmine.SpyObj<AppSettingsService>;

    // デフォルトのモック設定
    profileStorageService.getAllProfiles.and.returnValue(
      Promise.resolve([mockProfile])
    );
    profileStorageService.getRecentProfiles.and.returnValue(
      Promise.resolve([mockProfile])
    );
    appSettingsService.getSettings.and.returnValue(
      Promise.resolve(mockSettings)
    );
  });

  it('サービスが作成されること', () => {
    expect(service).toBeTruthy();
  });

  describe('プロファイルの作成', () => {
    it('有効なプロファイルを作成できること', async () => {
      const newProfile = {
        name: 'New Profile',
        host: 'example.com',
        port: 22,
        username: 'user',
        authType: 'key' as const,
        keyId: 'key-456',
      };

      const savedProfile = { ...newProfile, ...mockProfile };
      profileStorageService.saveProfile.and.returnValue(
        Promise.resolve(savedProfile)
      );

      // getAllProfilesが2つ以上のプロファイルを返すように設定（デフォルト設定を避ける）
      profileStorageService.getAllProfiles.and.returnValues(
        Promise.resolve([mockProfile, savedProfile]), // 最初の呼び出し
        Promise.resolve([mockProfile, savedProfile]) // loadProfiles内の呼び出し
      );

      const result = await service.createProfile(newProfile);

      expect(result).toEqual(savedProfile);
      expect(profileStorageService.saveProfile).toHaveBeenCalledWith(
        newProfile
      );
    });

    it('無効なプロファイルの場合エラーをスローすること', async () => {
      const invalidProfile = {
        name: '',
        host: 'example.com',
        port: 22,
        username: 'user',
        authType: 'key' as const,
        keyId: 'key-456',
      };

      await expectAsync(
        service.createProfile(invalidProfile)
      ).toBeRejectedWithError(/プロファイル名は必須です/);
    });

    it('最初のプロファイルの場合、デフォルトに設定されること', async () => {
      profileStorageService.getAllProfiles.and.returnValue(Promise.resolve([]));
      appSettingsService.updateSettings.and.returnValue(Promise.resolve());

      const newProfile = {
        name: 'First Profile',
        host: 'example.com',
        port: 22,
        username: 'user',
        authType: 'key' as const,
        keyId: 'key-456',
      };

      const savedProfile = { ...mockProfile, ...newProfile, id: 'new-id' };
      profileStorageService.saveProfile.and.returnValue(
        Promise.resolve(savedProfile)
      );

      // setDefaultProfileで呼ばれるgetProfileの設定
      profileStorageService.getProfile.and.returnValue(
        Promise.resolve(savedProfile)
      );

      // createProfile実行後、getAllProfilesが再度呼ばれて1つのプロファイルを返すよう設定
      profileStorageService.getAllProfiles.and.returnValues(
        Promise.resolve([]), // 最初の呼び出し
        Promise.resolve([savedProfile]) // loadProfiles内の呼び出し
      );

      await service.createProfile(newProfile);

      expect(appSettingsService.updateSettings).toHaveBeenCalledWith(
        jasmine.objectContaining({
          defaultProfileId: 'new-id',
        })
      );
    });
  });

  describe('プロファイルの更新', () => {
    it('既存のプロファイルを更新できること', async () => {
      profileStorageService.getProfile.and.returnValue(
        Promise.resolve(mockProfile)
      );
      profileStorageService.saveProfile.and.returnValue(
        Promise.resolve({ ...mockProfile, name: 'Updated Profile' })
      );

      const result = await service.updateProfile('test-id', {
        name: 'Updated Profile',
      });

      expect(result.name).toBe('Updated Profile');
      expect(profileStorageService.saveProfile).toHaveBeenCalledWith(
        jasmine.objectContaining({
          id: 'test-id',
          name: 'Updated Profile',
        })
      );
    });

    it('存在しないプロファイルの場合エラーをスローすること', async () => {
      profileStorageService.getProfile.and.returnValue(Promise.resolve(null));

      await expectAsync(
        service.updateProfile('non-existent', { name: 'New Name' })
      ).toBeRejectedWithError(/プロファイルが見つかりません/);
    });

    it('無効な更新の場合エラーをスローすること', async () => {
      profileStorageService.getProfile.and.returnValue(
        Promise.resolve(mockProfile)
      );

      await expectAsync(
        service.updateProfile('test-id', { name: '' })
      ).toBeRejectedWithError(/プロファイル名は必須です/);
    });
  });

  describe('プロファイルの削除', () => {
    it('プロファイルを削除できること', async () => {
      profileStorageService.deleteProfile.and.returnValue(Promise.resolve());

      await service.deleteProfile('test-id');

      expect(profileStorageService.deleteProfile).toHaveBeenCalledWith(
        'test-id'
      );
    });

    it('デフォルトプロファイルを削除した場合、デフォルトがクリアされること', async () => {
      appSettingsService.updateSettings.and.returnValue(Promise.resolve());
      profileStorageService.deleteProfile.and.returnValue(Promise.resolve());
      profileStorageService.getProfile.and.returnValue(
        Promise.resolve(mockProfile)
      );

      // デフォルトプロファイルをtest-idに設定
      await service.setDefaultProfile('test-id');

      // updateSettingsをリセットして削除のテストに備える
      appSettingsService.updateSettings.calls.reset();

      await service.deleteProfile('test-id');

      expect(appSettingsService.updateSettings).toHaveBeenCalled();
      if (appSettingsService.updateSettings.calls.mostRecent()) {
        const updateCall =
          appSettingsService.updateSettings.calls.mostRecent().args[0];
        expect('defaultProfileId' in updateCall).toBe(false);
      }
    });
  });

  describe('デフォルトプロファイルの管理', () => {
    it('デフォルトプロファイルを設定できること', async () => {
      profileStorageService.getProfile.and.returnValue(
        Promise.resolve(mockProfile)
      );
      appSettingsService.updateSettings.and.returnValue(Promise.resolve());

      await service.setDefaultProfile('test-id');

      expect(appSettingsService.updateSettings).toHaveBeenCalledWith(
        jasmine.objectContaining({
          defaultProfileId: 'test-id',
        })
      );
    });

    it('存在しないプロファイルをデフォルトに設定した場合エラーをスローすること', async () => {
      profileStorageService.getProfile.and.returnValue(Promise.resolve(null));

      await expectAsync(
        service.setDefaultProfile('non-existent')
      ).toBeRejectedWithError(/プロファイルが見つかりません/);
    });

    it('デフォルトプロファイルをクリアできること', async () => {
      appSettingsService.updateSettings.and.returnValue(Promise.resolve());

      await service.clearDefaultProfile();

      expect(appSettingsService.updateSettings).toHaveBeenCalled();
      if (appSettingsService.updateSettings.calls.mostRecent()) {
        const updateCall =
          appSettingsService.updateSettings.calls.mostRecent().args[0];
        expect('defaultProfileId' in updateCall).toBe(false);
      }
    });
  });

  describe('プロファイルのバリデーション', () => {
    it('有効なプロファイルの場合、エラーが返されないこと', () => {
      const validProfile = {
        name: 'Valid Profile',
        host: '192.168.1.1',
        port: 22,
        username: 'user',
        authType: 'key' as const,
        keyId: 'key-123',
      };

      const errors = service.validateProfile(validProfile);
      expect(errors.length).toBe(0);
    });

    it('必須フィールドが不足している場合、エラーが返されること', () => {
      const invalidProfile = {
        name: '',
        host: '',
        port: undefined as unknown as number,
        username: '',
        authType: undefined as unknown as 'key' | 'password',
      };

      const errors = service.validateProfile(invalidProfile);

      expect(errors).toContain(
        jasmine.objectContaining({
          field: 'name',
          message: 'プロファイル名は必須です',
        })
      );
      expect(errors).toContain(
        jasmine.objectContaining({
          field: 'host',
          message: 'ホストは必須です',
        })
      );
      expect(errors).toContain(
        jasmine.objectContaining({
          field: 'port',
          message: 'ポートは必須です',
        })
      );
      expect(errors).toContain(
        jasmine.objectContaining({
          field: 'username',
          message: 'ユーザー名は必須です',
        })
      );
    });

    it('無効なホスト形式の場合、エラーが返されること', () => {
      const invalidProfile = {
        name: 'Test',
        host: 'invalid..host',
        port: 22,
        username: 'user',
        authType: 'key' as const,
        keyId: 'key-123',
      };

      const errors = service.validateProfile(invalidProfile);

      expect(errors).toContain(
        jasmine.objectContaining({
          field: 'host',
          message: 'ホストの形式が正しくありません',
        })
      );
    });

    it('ポートが範囲外の場合、エラーが返されること', () => {
      const invalidProfile = {
        name: 'Test',
        host: '192.168.1.1',
        port: 70000,
        username: 'user',
        authType: 'key' as const,
        keyId: 'key-123',
      };

      const errors = service.validateProfile(invalidProfile);

      expect(errors).toContain(
        jasmine.objectContaining({
          field: 'port',
          message: 'ポートは1〜65535の範囲で入力してください',
        })
      );
    });

    it('鍵認証でkeyIdがない場合、エラーが返されること', () => {
      const invalidProfile = {
        name: 'Test',
        host: '192.168.1.1',
        port: 22,
        username: 'user',
        authType: 'key' as const,
        keyId: '',
      };

      const errors = service.validateProfile(invalidProfile);

      expect(errors).toContain(
        jasmine.objectContaining({
          field: 'keyId',
          message: '鍵認証の場合、SSH鍵を選択してください',
        })
      );
    });

    it('パスワード認証でパスワードがない場合、エラーが返されること', () => {
      const invalidProfile = {
        name: 'Test',
        host: '192.168.1.1',
        port: 22,
        username: 'user',
        authType: 'password' as const,
        password: '',
      };

      const errors = service.validateProfile(invalidProfile);

      expect(errors).toContain(
        jasmine.objectContaining({
          field: 'password',
          message: 'パスワード認証の場合、パスワードを入力してください',
        })
      );
    });
  });

  describe('プロファイルの複製', () => {
    it('既存のプロファイルを複製できること', async () => {
      const { lastUsed, ...mockProfileWithoutLastUsed } = mockProfile;
      const duplicatedProfile: ConnectionProfile = {
        ...mockProfileWithoutLastUsed,
        id: 'duplicated-id',
        name: 'Duplicated Profile',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      profileStorageService.getProfile.and.returnValue(
        Promise.resolve(mockProfile)
      );
      profileStorageService.saveProfile.and.returnValue(
        Promise.resolve(duplicatedProfile)
      );

      const result = await service.duplicateProfile(
        'test-id',
        'Duplicated Profile'
      );

      expect(result.name).toBe('Duplicated Profile');
      expect('lastUsed' in result).toBe(false);
    });

    it('存在しないプロファイルの複製はエラーをスローすること', async () => {
      profileStorageService.getProfile.and.returnValue(Promise.resolve(null));

      await expectAsync(
        service.duplicateProfile('non-existent', 'New Name')
      ).toBeRejectedWithError(/プロファイルが見つかりません/);
    });
  });

  describe('プロファイルのエクスポート/インポート', () => {
    it('プロファイルをエクスポートできること', async () => {
      profileStorageService.getProfile.and.returnValue(
        Promise.resolve(mockProfile)
      );

      const exported = await service.exportProfile('test-id');
      const parsed = JSON.parse(exported);

      expect(parsed.name).toBe('Test Profile');
      expect(parsed.host).toBe('192.168.1.1');
      expect(parsed.password).toBeUndefined();
      expect(parsed.keyId).toBeUndefined();
    });

    it('プロファイルをインポートできること', async () => {
      const importData = JSON.stringify({
        name: 'Imported Profile',
        host: 'imported.example.com',
        port: 2222,
        username: 'importuser',
        authType: 'key',
        keyId: 'imported-key-id',
      });

      const importedProfile = {
        id: 'imported-id',
        name: 'Imported Profile',
        host: 'imported.example.com',
        port: 2222,
        username: 'importuser',
        authType: 'key' as const,
        keyId: 'imported-key-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      profileStorageService.saveProfile.and.returnValue(
        Promise.resolve(importedProfile)
      );

      // getAllProfilesが呼ばれることを考慮
      profileStorageService.getAllProfiles.and.returnValues(
        Promise.resolve([mockProfile]), // 最初の呼び出し
        Promise.resolve([mockProfile, importedProfile]) // loadProfiles内の呼び出し
      );

      const result = await service.importProfile(importData);

      expect(result.name).toBe('Imported Profile');
      expect(result.host).toBe('imported.example.com');
    });

    it('無効なJSONのインポートはエラーをスローすること', async () => {
      await expectAsync(
        service.importProfile('invalid json')
      ).toBeRejectedWithError(/プロファイルのインポートに失敗しました/);
    });

    it('必須フィールドが不足したインポートはエラーをスローすること', async () => {
      const incompleteData = JSON.stringify({
        name: 'Incomplete Profile',
      });

      await expectAsync(
        service.importProfile(incompleteData)
      ).toBeRejectedWithError(/必須フィールドが不足しています/);
    });
  });

  describe('使用履歴の管理', () => {
    it('プロファイルを使用済みとしてマークできること', async () => {
      profileStorageService.markAsUsed.and.returnValue(Promise.resolve());

      await service.markAsUsed('test-id');

      expect(profileStorageService.markAsUsed).toHaveBeenCalledWith('test-id');
      expect(profileStorageService.getRecentProfiles).toHaveBeenCalled();
    });
  });
});
