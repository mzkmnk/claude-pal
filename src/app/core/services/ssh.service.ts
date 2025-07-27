import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { ProfileService } from './profile.service';
import { KeyManagerService } from './key-manager.service';
import { ConnectionProfile } from '../models';
import { Subject, BehaviorSubject } from 'rxjs';

/**
 * SSH接続の現在のステータスを表す
 * @interface SSHConnectionStatus
 */
export interface SSHConnectionStatus {
  /** SSH接続が確立されているかどうか */
  connected: boolean;
  /** SSH接続が進行中かどうか */
  connecting: boolean;
  /** 接続に失敗した場合のエラーメッセージ */
  error?: string;
  /** 現在の接続のプロファイルID */
  profileId?: string;
}

/**
 * SSHシェルセッションを開くためのオプション
 * @interface SSHShellOptions
 */
export interface SSHShellOptions {
  /** ターミナルの行数（デフォルト: 24） */
  rows?: number;
  /** ターミナルの列数（デフォルト: 80） */
  cols?: number;
  /** ターミナルタイプ（デフォルト: 'xterm-256color'） */
  term?: string;
}

/**
 * SSH経由でコマンドを実行した結果
 * @interface SSHCommandResult
 */
export interface SSHCommandResult {
  /** コマンドの標準出力 */
  stdout: string;
  /** コマンドの標準エラー出力 */
  stderr: string;
  /** コマンドの終了コード */
  code: number;
}

/**
 * SSH接続とシェルセッションを管理するサービス
 *
 * このサービスは以下の機能を提供します：
 * - 鍵/パスワード認証によるSSH接続管理
 * - シェルセッション管理
 * - SSH経由でのコマンド実行
 * - RxJS Observablesによるリアルタイムデータストリーミング
 * - 自動再接続機能
 * - Keep-alive機能
 *
 * @class SSHService
 * @implements {OnDestroy}
 * @example
 * ```typescript
 * // SSHサーバーに接続
 * await sshService.connect('profile-123');
 *
 * // シェルを開いてデータストリームを購読
 * sshService.dataStream$.subscribe(data => console.log(data));
 * await sshService.openShell();
 *
 * // コマンドを送信
 * sshService.sendData('ls -la\r');
 * ```
 */
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

  /** 接続ステータスの監視可能なオブジェクト */
  readonly connectionStatus = computed(() => this.connectionStatusSignal());

  /** 接続されているかどうかを示す監視可能なブール値 */
  readonly isConnected = computed(
    () => this.connectionStatusSignal().connected
  );

  /** 接続中かどうかを示す監視可能なブール値 */
  readonly isConnecting = computed(
    () => this.connectionStatusSignal().connecting
  );

  /** ターミナルデータの監視可能なストリーム */
  readonly dataStream$ = this.dataStreamSubject.asObservable();

  /** 接続状態の変更の監視可能なストリーム */
  readonly connection$ = this.connectionSubject.asObservable();

  private activeConnection: unknown | null = null;
  private activeShell: unknown | null = null;
  private reconnectTimeout: number | undefined;
  private keepAliveInterval: number | undefined;

  /**
   * 指定されたプロファイルを使用してSSH接続を確立する
   *
   * @param {string} profileId - 使用する接続プロファイルのID
   * @returns {Promise<void>}
   * @throws {Error} プロファイルが見つからない、鍵が見つからない、または認証に失敗した場合
   * @public
   */
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

  /**
   * 現在のSSH接続を切断する
   *
   * @returns {Promise<void>}
   * @public
   */
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

  /**
   * 接続されたSSHサーバーでシェルセッションを開く
   *
   * @param {SSHShellOptions} [options] - シェル設定オプション
   * @returns {Promise<void>}
   * @throws {Error} 接続されていない場合
   * @public
   */
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

  /**
   * アクティブなシェルセッションにデータを送信する
   *
   * @param {string} data - 送信するデータ
   * @throws {Error} アクティブなシェルセッションがない場合
   * @public
   */
  sendData(data: string): void {
    if (!this.activeShell) {
      throw new Error('シェルセッションがアクティブではありません');
    }

    // TODO: 実際のデータ送信実装
    this.mockSendData(data);
  }

  /**
   * SSHサーバーで単一のコマンドを実行する
   *
   * @param {string} command - 実行するコマンド
   * @returns {Promise<SSHCommandResult>} コマンド実行結果
   * @throws {Error} 接続されていない場合
   * @public
   */
  async executeCommand(command: string): Promise<SSHCommandResult> {
    if (!this.isConnected()) {
      throw new Error('SSH接続が確立されていません');
    }

    // TODO: 実際のコマンド実行実装
    return this.mockExecuteCommand(command);
  }

  /**
   * ターミナルの寸法を変更する
   *
   * @param {number} rows - 行数
   * @param {number} cols - 列数
   * @public
   */
  resize(rows: number, cols: number): void {
    if (!this.activeShell) {
      return;
    }

    // TODO: 実際のリサイズ実装
    this.mockResize(rows, cols);
  }

  /**
   * 現在の接続プロファイルを使用して再接続する
   *
   * @returns {Promise<void>}
   * @throws {Error} 以前の接続プロファイルがない場合
   * @public
   */
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

  /**
   * サービスが破棄されるときに呼び出されるクリーンアップメソッド
   *
   * @returns {void}
   */
  ngOnDestroy(): void {
    this.disconnect();
  }
}
