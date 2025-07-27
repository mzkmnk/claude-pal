import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { ProfileService } from './profile.service';
import { KeyManagerService } from './key-manager.service';
import { ConnectionProfile } from '../models';
import { Subject, BehaviorSubject } from 'rxjs';

export interface SSHConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  profileId?: string;
}

export interface SSHShellOptions {
  rows?: number;
  cols?: number;
  term?: string;
}

export interface SSHCommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

@Injectable({
  providedIn: 'root',
})
export class SSHService implements OnDestroy {
  private profileService = inject(ProfileService);
  private keyManager = inject(KeyManagerService);

  private connectionStatusSignal = signal<SSHConnectionStatus>({
    connected: false,
    connecting: false,
  });

  private dataStreamSubject = new Subject<string>();
  private connectionSubject = new BehaviorSubject<boolean>(false);

  readonly connectionStatus = computed(() => this.connectionStatusSignal());
  readonly isConnected = computed(
    () => this.connectionStatusSignal().connected
  );
  readonly isConnecting = computed(
    () => this.connectionStatusSignal().connecting
  );
  readonly dataStream$ = this.dataStreamSubject.asObservable();
  readonly connection$ = this.connectionSubject.asObservable();

  private activeConnection: unknown | null = null;
  private activeShell: unknown | null = null;
  private reconnectTimeout: number | undefined;
  private keepAliveInterval: number | undefined;

  async connect(profileId: string): Promise<void> {
    try {
      this.connectionStatusSignal.set({
        connected: false,
        connecting: true,
        profileId,
      });

      const profile = await this.profileService.getProfile(profileId);
      if (!profile) {
        throw new Error(`プロファイルが見つかりません: ${profileId}`);
      }

      // 認証情報の取得
      let authData: { type: 'key' | 'password'; data: string };
      if (profile.authType === 'key' && profile.keyId) {
        const keyPair = await this.keyManager.getKey(profile.keyId);
        if (!keyPair) {
          throw new Error(`SSH鍵が見つかりません: ${profile.keyId}`);
        }
        authData = { type: 'key', data: keyPair.privateKey };
      } else if (profile.authType === 'password' && profile.password) {
        authData = { type: 'password', data: profile.password };
      } else {
        throw new Error('認証情報が不完全です');
      }

      // TODO: 実際のSSH接続実装
      // 現在はモック実装
      await this.mockConnect(profile, authData);

      // 接続成功
      this.connectionStatusSignal.set({
        connected: true,
        connecting: false,
        profileId,
      });
      this.connectionSubject.next(true);

      // プロファイルの使用記録
      await this.profileService.markAsUsed(profileId);

      // Keep-aliveの開始
      this.startKeepAlive();
    } catch (error) {
      this.connectionStatusSignal.set({
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : '接続に失敗しました',
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.stopKeepAlive();
    this.clearReconnectTimeout();

    if (this.activeShell) {
      // TODO: シェルのクローズ処理
      this.activeShell = null;
    }

    if (this.activeConnection) {
      // TODO: 接続のクローズ処理
      this.activeConnection = null;
    }

    this.connectionStatusSignal.set({
      connected: false,
      connecting: false,
    });
    this.connectionSubject.next(false);
  }

  async openShell(options?: SSHShellOptions): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('SSH接続が確立されていません');
    }

    const shellOptions = {
      rows: options?.rows || 24,
      cols: options?.cols || 80,
      term: options?.term || 'xterm-256color',
    };

    // TODO: 実際のシェル開始実装
    await this.mockOpenShell(shellOptions);
  }

  sendData(data: string): void {
    if (!this.activeShell) {
      throw new Error('シェルセッションがアクティブではありません');
    }

    // TODO: 実際のデータ送信実装
    this.mockSendData(data);
  }

  async executeCommand(command: string): Promise<SSHCommandResult> {
    if (!this.isConnected()) {
      throw new Error('SSH接続が確立されていません');
    }

    // TODO: 実際のコマンド実行実装
    return this.mockExecuteCommand(command);
  }

  resize(rows: number, cols: number): void {
    if (!this.activeShell) {
      return;
    }

    // TODO: 実際のリサイズ実装
    this.mockResize(rows, cols);
  }

  async reconnect(): Promise<void> {
    const currentProfileId = this.connectionStatusSignal().profileId;
    if (!currentProfileId) {
      throw new Error('再接続するプロファイルがありません');
    }

    await this.disconnect();
    await this.connect(currentProfileId);
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();

    // 60秒ごとにキープアライブ
    this.keepAliveInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.sendKeepAlive();
      }
    }, 60000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval !== undefined) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }
  }

  private sendKeepAlive(): void {
    // TODO: 実際のキープアライブ実装
    console.log('Sending keep-alive signal');
  }

  private scheduleReconnect(delay: number = 5000): void {
    this.clearReconnectTimeout();

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnect().catch(error => {
        console.error('自動再接続に失敗しました:', error);
        // 再度リトライをスケジュール（最大30秒の遅延）
        const nextDelay = Math.min(delay * 2, 30000);
        this.scheduleReconnect(nextDelay);
      });
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout !== undefined) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
  }

  // モック実装（後でネイティブ実装に置き換え）
  private async mockConnect(
    profile: ConnectionProfile,
    authData: { type: 'key' | 'password'; data: string }
  ): Promise<void> {
    // 接続のシミュレーション
    await new Promise(resolve => setTimeout(resolve, 1000));

    this.activeConnection = {
      host: profile.host,
      port: profile.port,
      username: profile.username,
      authType: authData.type,
    };

    console.log('Mock SSH connection established:', {
      host: profile.host,
      port: profile.port,
      username: profile.username,
    });
  }

  private async mockOpenShell(options: SSHShellOptions): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));

    this.activeShell = {
      rows: options.rows,
      cols: options.cols,
      term: options.term,
    };

    // ウェルカムメッセージを送信
    this.dataStreamSubject.next(
      `Welcome to SSH Mock Shell\r\n` +
        `Connected to mock server\r\n` +
        `\r\n` +
        `$ `
    );
  }

  private mockSendData(data: string): void {
    // エコーバック
    this.dataStreamSubject.next(data);

    // Enterキーが押された場合
    if (data === '\r' || data === '\n') {
      // プロンプトを表示
      setTimeout(() => {
        this.dataStreamSubject.next('\r\n$ ');
      }, 10);
    }
  }

  private async mockExecuteCommand(command: string): Promise<SSHCommandResult> {
    await new Promise(resolve => setTimeout(resolve, 500));

    // モックレスポンス
    if (command === 'ls') {
      return {
        stdout: 'file1.txt\nfile2.txt\ndirectory1\n',
        stderr: '',
        code: 0,
      };
    } else if (command === 'pwd') {
      return {
        stdout: '/home/mockuser\n',
        stderr: '',
        code: 0,
      };
    } else if (command.startsWith('echo ')) {
      return {
        stdout: command.substring(5) + '\n',
        stderr: '',
        code: 0,
      };
    } else {
      return {
        stdout: '',
        stderr: `bash: ${command}: command not found\n`,
        code: 127,
      };
    }
  }

  private mockResize(rows: number, cols: number): void {
    if (this.activeShell) {
      (this.activeShell as { rows: number; cols: number }).rows = rows;
      (this.activeShell as { rows: number; cols: number }).cols = cols;
      console.log(`Terminal resized to ${rows}x${cols}`);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
