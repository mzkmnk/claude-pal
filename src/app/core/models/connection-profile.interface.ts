/**
 * SSH接続プロファイルを表すインターフェース
 *
 * @interface ConnectionProfile
 */
export interface ConnectionProfile {
  /** プロファイルの一意識別子 */
  id: string;
  /** プロファイルの表示名 */
  name: string;
  /** 接続先のホスト名またはIPアドレス */
  host: string;
  /** 接続先のポート番号 */
  port: number;
  /** SSH接続に使用するユーザー名 */
  username: string;
  /** SSH鍵のID（KeyManagerServiceで管理）*/
  keyId?: string;
  /** パスワード認証の場合のパスワード */
  password?: string;
  /** 認証タイプ（鍵認証またはパスワード認証） */
  authType: 'key' | 'password';
  /** 最後に使用した日時 */
  lastUsed?: Date;
  /** プロファイルの作成日時 */
  createdAt: Date;
  /** プロファイルの更新日時 */
  updatedAt: Date;
}
