import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

/**
 * SSH接続オプション
 * @interface SSHConnectionOptions
 */
export interface SSHConnectionOptions {
  /** 接続先のホスト名またはIPアドレス */
  host: string;
  /** SSHポート番号（デフォルト: 22） */
  port: number;
  /** ユーザー名 */
  username: string;
  /** パスワード（パスワード認証の場合） */
  password?: string;
  /** 秘密鍵（鍵認証の場合） */
  privateKey?: string;
  /** パスフレーズ（秘密鍵が暗号化されている場合） */
  passphrase?: string;
}

/**
 * SSHプラグインのインターフェース
 * @interface SSHPlugin
 */
export interface SSHPlugin {
  /**
   * SSH接続を確立する
   * @param options 接続オプション
   * @returns 接続成功時にセッションID
   */
  connect(options: SSHConnectionOptions): Promise<{ sessionId: string }>;

  /**
   * コマンドを送信する
   * @param options セッションIDとコマンド
   */
  sendCommand(options: { sessionId: string; command: string }): Promise<void>;

  /**
   * ウィンドウサイズを変更する
   * @param options セッションID、列数、行数
   */
  resizeWindow(options: {
    sessionId: string;
    cols: number;
    rows: number;
  }): Promise<void>;

  /**
   * 接続を切断する
   * @param options セッションID
   */
  disconnect(options: { sessionId: string }): Promise<void>;

  /**
   * データ受信のリスナーを登録する
   * @param eventName イベント名
   * @param listenerFunc リスナー関数
   */
  addListener(
    eventName: 'dataReceived',
    listenerFunc: (data: { sessionId: string; data: string }) => void
  ): Promise<PluginListenerHandle>;

  /**
   * 接続状態変更のリスナーを登録する
   * @param eventName イベント名
   * @param listenerFunc リスナー関数
   */
  addListener(
    eventName: 'connectionStateChanged',
    listenerFunc: (data: {
      sessionId: string;
      state: 'connected' | 'disconnected' | 'error';
      error?: string;
    }) => void
  ): Promise<PluginListenerHandle>;

  /**
   * リスナーを削除する
   * @param listenerHandle リスナーハンドル
   */
  removeAllListeners(): Promise<void>;
}

export const SSH = registerPlugin<SSHPlugin>('SSH');
