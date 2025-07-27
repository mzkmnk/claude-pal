export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  keyId?: string; // SSH鍵のID（KeyManagerServiceで管理）
  password?: string; // パスワード認証の場合
  authType: 'key' | 'password';
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}
