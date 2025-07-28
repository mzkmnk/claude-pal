/**
 * メッセージのタイプを定義する列挙型
 * @enum MessageType
 */
export enum MessageType {
  /** ユーザーが入力したメッセージ */
  USER = 'user',
  /** Claudeからの出力メッセージ */
  CLAUDE = 'claude',
  /** システムからの通知メッセージ */
  SYSTEM = 'system',
  /** エラーメッセージ */
  ERROR = 'error',
}

/**
 * メッセージデータを表すインターフェース
 * @interface Message
 */
export interface Message {
  /** メッセージの一意識別子 */
  id: string;
  /** メッセージのタイプ */
  type: MessageType;
  /** メッセージの内容 */
  content: string;
  /** メッセージが作成された日時 */
  timestamp: Date;
  /** コードブロックがある場合の言語指定（オプション） */
  codeLanguage?: string;
}
