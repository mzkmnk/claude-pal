import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SSHService } from './ssh.service';
import { ProfileService } from './profile.service';
import { KeyManagerService } from './key-manager.service';
import { ConnectionProfile } from '../models';
import { KeyPair } from './key-pair.interface';

describe('SSHService', () => {
  let service: SSHService;
  let profileService: jasmine.SpyObj<ProfileService>;
  let keyManagerService: jasmine.SpyObj<KeyManagerService>;

  const mockProfile: ConnectionProfile = {
    id: 'test-profile-id',
    name: 'Test Profile',
    host: '192.168.1.100',
    port: 22,
    username: 'testuser',
    authType: 'key',
    keyId: 'test-key-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockKeyPair: KeyPair = {
    name: 'Test Key',
    publicKey: 'mock-public-key',
    privateKey: 'mock-private-key',
    fingerprint: 'mock-fingerprint',
    createdAt: new Date(),
  };

  beforeEach(() => {
    const profileSpy = jasmine.createSpyObj('ProfileService', [
      'getProfile',
      'markAsUsed',
    ]);
    const keyManagerSpy = jasmine.createSpyObj('KeyManagerService', ['getKey']);

    TestBed.configureTestingModule({
      providers: [
        SSHService,
        { provide: ProfileService, useValue: profileSpy },
        { provide: KeyManagerService, useValue: keyManagerSpy },
      ],
    });

    service = TestBed.inject(SSHService);
    profileService = TestBed.inject(
      ProfileService
    ) as jasmine.SpyObj<ProfileService>;
    keyManagerService = TestBed.inject(
      KeyManagerService
    ) as jasmine.SpyObj<KeyManagerService>;
  });

  afterEach(async () => {
    await service.disconnect();
    service.ngOnDestroy();
  });

  it('サービスが作成されること', () => {
    expect(service).toBeTruthy();
  });

  describe('接続管理', () => {
    it('SSH鍵認証で接続できること', fakeAsync(() => {
      profileService.getProfile.and.returnValue(Promise.resolve(mockProfile));
      keyManagerService.getKey.and.returnValue(Promise.resolve(mockKeyPair));
      profileService.markAsUsed.and.returnValue(Promise.resolve());

      let connectionStatus = service.connectionStatus();
      expect(connectionStatus.connected).toBe(false);
      expect(connectionStatus.connecting).toBe(false);

      service.connect('test-profile-id');

      // 接続中の状態を確認
      connectionStatus = service.connectionStatus();
      expect(connectionStatus.connecting).toBe(true);
      expect(connectionStatus.connected).toBe(false);

      tick(1000); // モック接続の待機時間

      // 接続完了の状態を確認
      connectionStatus = service.connectionStatus();
      expect(connectionStatus.connected).toBe(true);
      expect(connectionStatus.connecting).toBe(false);
      expect(connectionStatus.profileId).toBe('test-profile-id');

      expect(profileService.markAsUsed).toHaveBeenCalledWith('test-profile-id');
    }));

    it('パスワード認証で接続できること', fakeAsync(() => {
      const passwordProfile: ConnectionProfile = {
        ...mockProfile,
        authType: 'password',
        password: 'test-password',
      };
      delete (passwordProfile as ConnectionProfile & { keyId?: string }).keyId;

      profileService.getProfile.and.returnValue(
        Promise.resolve(passwordProfile)
      );
      profileService.markAsUsed.and.returnValue(Promise.resolve());

      service.connect('test-profile-id');
      tick(1000);

      const connectionStatus = service.connectionStatus();
      expect(connectionStatus.connected).toBe(true);
      expect(service.isConnected()).toBe(true);
    }));

    it('プロファイルが見つからない場合エラーになること', fakeAsync(() => {
      profileService.getProfile.and.returnValue(Promise.resolve(null));

      expectAsync(service.connect('non-existent')).toBeRejectedWithError(
        /プロファイルが見つかりません/
      );

      tick(1000);

      const connectionStatus = service.connectionStatus();
      expect(connectionStatus.connected).toBe(false);
      expect(connectionStatus.error).toContain('プロファイルが見つかりません');
    }));

    it('SSH鍵が見つからない場合エラーになること', fakeAsync(() => {
      profileService.getProfile.and.returnValue(Promise.resolve(mockProfile));
      keyManagerService.getKey.and.returnValue(Promise.resolve(null));

      expectAsync(service.connect('test-profile-id')).toBeRejectedWithError(
        /SSH鍵が見つかりません/
      );

      tick(1000);

      const connectionStatus = service.connectionStatus();
      expect(connectionStatus.error).toContain('SSH鍵が見つかりません');
    }));

    it('認証情報が不完全な場合エラーになること', fakeAsync(() => {
      const incompleteProfile: ConnectionProfile = {
        ...mockProfile,
      };
      delete (
        incompleteProfile as ConnectionProfile & {
          keyId?: string;
          password?: string;
        }
      ).keyId;
      delete (
        incompleteProfile as ConnectionProfile & {
          keyId?: string;
          password?: string;
        }
      ).password;

      profileService.getProfile.and.returnValue(
        Promise.resolve(incompleteProfile)
      );

      expectAsync(service.connect('test-profile-id')).toBeRejectedWithError(
        /認証情報が不完全です/
      );

      tick(1000);
    }));

    it('切断できること', fakeAsync(() => {
      // まず接続
      profileService.getProfile.and.returnValue(Promise.resolve(mockProfile));
      keyManagerService.getKey.and.returnValue(Promise.resolve(mockKeyPair));
      profileService.markAsUsed.and.returnValue(Promise.resolve());

      service.connect('test-profile-id');
      tick(1000);

      expect(service.isConnected()).toBe(true);

      // 切断
      service.disconnect();
      tick();

      expect(service.isConnected()).toBe(false);
      const connectionStatus = service.connectionStatus();
      expect(connectionStatus.connected).toBe(false);
      expect(connectionStatus.connecting).toBe(false);
    }));
  });

  describe('シェル操作', () => {
    beforeEach(fakeAsync(() => {
      // 接続を確立
      profileService.getProfile.and.returnValue(Promise.resolve(mockProfile));
      keyManagerService.getKey.and.returnValue(Promise.resolve(mockKeyPair));
      profileService.markAsUsed.and.returnValue(Promise.resolve());

      service.connect('test-profile-id');
      tick(1000);
    }));

    it('シェルを開けること', fakeAsync(() => {
      let dataReceived = '';
      service.dataStream$.subscribe(data => {
        dataReceived += data;
      });

      service.openShell({ rows: 24, cols: 80 });
      tick(100);

      expect(dataReceived).toContain('Welcome to SSH Mock Shell');
      expect(dataReceived).toContain('$ ');
    }));

    it('接続していない状態でシェルを開こうとするとエラーになること', fakeAsync(() => {
      service.disconnect();
      tick();

      expectAsync(service.openShell()).toBeRejectedWithError(
        /SSH接続が確立されていません/
      );
    }));

    it('データを送信できること', fakeAsync(() => {
      service.openShell();
      tick(100);

      let dataReceived = '';
      service.dataStream$.subscribe(data => {
        dataReceived += data;
      });

      service.sendData('test command');
      tick();

      expect(dataReceived).toContain('test command');
    }));

    it('Enterキーでプロンプトが表示されること', fakeAsync(() => {
      service.openShell();
      tick(100);

      let dataReceived = '';
      service.dataStream$.subscribe(data => {
        dataReceived += data;
      });

      service.sendData('\r');
      tick(20);

      expect(dataReceived).toContain('\r\n$ ');
    }));

    it('シェルがアクティブでない場合データ送信でエラーになること', () => {
      expect(() => service.sendData('test')).toThrowError(
        /シェルセッションがアクティブではありません/
      );
    });

    it('ターミナルをリサイズできること', fakeAsync(() => {
      service.openShell({ rows: 24, cols: 80 });
      tick(100);

      // リサイズ実行（エラーが発生しないことを確認）
      expect(() => service.resize(30, 100)).not.toThrow();
    }));
  });

  describe('コマンド実行', () => {
    beforeEach(fakeAsync(() => {
      // 接続を確立
      profileService.getProfile.and.returnValue(Promise.resolve(mockProfile));
      keyManagerService.getKey.and.returnValue(Promise.resolve(mockKeyPair));
      profileService.markAsUsed.and.returnValue(Promise.resolve());

      service.connect('test-profile-id');
      tick(1000);
    }));

    it('コマンドを実行できること', fakeAsync(() => {
      const resultPromise = service.executeCommand('ls');
      tick(500);

      expectAsync(resultPromise).toBeResolvedTo({
        stdout: 'file1.txt\nfile2.txt\ndirectory1\n',
        stderr: '',
        code: 0,
      });
    }));

    it('pwdコマンドを実行できること', fakeAsync(() => {
      const resultPromise = service.executeCommand('pwd');
      tick(500);

      expectAsync(resultPromise).toBeResolvedTo({
        stdout: '/home/mockuser\n',
        stderr: '',
        code: 0,
      });
    }));

    it('echoコマンドを実行できること', fakeAsync(() => {
      const resultPromise = service.executeCommand('echo Hello World');
      tick(500);

      expectAsync(resultPromise).toBeResolvedTo({
        stdout: 'Hello World\n',
        stderr: '',
        code: 0,
      });
    }));

    it('存在しないコマンドでエラーが返ること', fakeAsync(() => {
      const resultPromise = service.executeCommand('invalidcommand');
      tick(500);

      expectAsync(resultPromise).toBeResolvedTo({
        stdout: '',
        stderr: 'bash: invalidcommand: command not found\n',
        code: 127,
      });
    }));

    it('接続していない状態でコマンド実行するとエラーになること', fakeAsync(() => {
      service.disconnect();
      tick();

      expectAsync(service.executeCommand('ls')).toBeRejectedWithError(
        /SSH接続が確立されていません/
      );
    }));
  });

  describe('再接続', () => {
    beforeEach(fakeAsync(() => {
      // 接続を確立
      profileService.getProfile.and.returnValue(Promise.resolve(mockProfile));
      keyManagerService.getKey.and.returnValue(Promise.resolve(mockKeyPair));
      profileService.markAsUsed.and.returnValue(Promise.resolve());

      service.connect('test-profile-id');
      tick(1000);
    }));

    it('再接続できること', fakeAsync(() => {
      expect(service.isConnected()).toBe(true);

      service.reconnect();
      tick(); // 切断

      expect(service.isConnected()).toBe(false);

      tick(1000); // 再接続

      expect(service.isConnected()).toBe(true);
      expect(profileService.getProfile).toHaveBeenCalledTimes(2);
    }));

    it('プロファイルIDがない場合再接続でエラーになること', fakeAsync(() => {
      service.disconnect();
      tick();

      expectAsync(service.reconnect()).toBeRejectedWithError(
        /再接続するプロファイルがありません/
      );
    }));
  });

  describe('接続状態の監視', () => {
    it('connection$が接続状態を通知すること', fakeAsync(() => {
      const states: boolean[] = [];
      service.connection$.subscribe(connected => states.push(connected));

      // 初期状態
      expect(states).toEqual([false]);

      // 接続
      profileService.getProfile.and.returnValue(Promise.resolve(mockProfile));
      keyManagerService.getKey.and.returnValue(Promise.resolve(mockKeyPair));
      profileService.markAsUsed.and.returnValue(Promise.resolve());

      service.connect('test-profile-id');
      tick(1000);

      expect(states).toEqual([false, true]);

      // 切断
      service.disconnect();
      tick();

      expect(states).toEqual([false, true, false]);
    }));
  });

  describe('Keep-alive機能', () => {
    it('接続時にKeep-aliveが開始されること', fakeAsync(() => {
      spyOn(console, 'log');

      profileService.getProfile.and.returnValue(Promise.resolve(mockProfile));
      keyManagerService.getKey.and.returnValue(Promise.resolve(mockKeyPair));
      profileService.markAsUsed.and.returnValue(Promise.resolve());

      service.connect('test-profile-id');
      tick(1000);

      // Mock connection logのカウントをリセット
      (console.log as jasmine.Spy).calls.reset();

      // 60秒後にKeep-aliveが送信される
      tick(60000);
      expect(console.log).toHaveBeenCalledWith('Sending keep-alive signal');
      expect(console.log).toHaveBeenCalledTimes(1);

      // さらに60秒後
      tick(60000);
      expect(console.log).toHaveBeenCalledTimes(2);
    }));

    it('切断時にKeep-aliveが停止されること', fakeAsync(() => {
      spyOn(console, 'log');

      profileService.getProfile.and.returnValue(Promise.resolve(mockProfile));
      keyManagerService.getKey.and.returnValue(Promise.resolve(mockKeyPair));
      profileService.markAsUsed.and.returnValue(Promise.resolve());

      service.connect('test-profile-id');
      tick(1000);

      service.disconnect();
      tick();

      // Mock connection logのカウントをリセット
      (console.log as jasmine.Spy).calls.reset();

      // 60秒待ってもKeep-aliveが送信されない
      tick(60000);
      expect(console.log).not.toHaveBeenCalled();
    }));
  });
});
