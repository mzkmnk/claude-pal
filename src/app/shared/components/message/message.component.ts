import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message, MessageType } from './message.interface';

/**
 * メッセージを表示するコンポーネント
 *
 * メッセージタイプに応じて異なるスタイルで表示し、
 * コードハイライトやタイムスタンプ表示をサポートする
 *
 * @class MessageComponent
 * @example
 * ```html
 * <app-message [message]="messageData"></app-message>
 * ```
 */
@Component({
  selector: 'app-message',
  imports: [CommonModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.message-wrapper]': 'true',
    '[class.message-animate-in]': 'true',
  },
})
export class MessageComponent {
  /**
   * 表示するメッセージデータ
   * @public
   */
  message = input.required<Message>();

  /**
   * メッセージタイプに基づくCSSクラス名を取得
   * @returns {string} CSSクラス名
   * @public
   */
  messageClass = computed(() => {
    const type = this.message().type;
    return `message-${type}`;
  });

  /**
   * フォーマットされたタイムスタンプを取得
   * @returns {string} HH:mm形式のタイムスタンプ
   * @public
   */
  formattedTimestamp = computed(() => {
    const timestamp = this.message().timestamp;
    return timestamp.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  /**
   * コードブロックを含むかどうかを判定
   * @returns {boolean} コードブロックを含む場合はtrue
   * @public
   */
  hasCodeBlock = computed(() => {
    const content = this.message().content;
    return content.includes('```');
  });

  /**
   * コンテンツをパースして表示用に整形
   * @returns {Array<{type: string, content: string, language?: string}>} パースされたコンテンツ
   * @public
   */
  parsedContent = computed(() => {
    const content = this.message().content;
    const parts: Array<{
      type: 'text' | 'code';
      content: string;
      language?: string;
    }> = [];

    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // コードブロック前のテキスト
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index),
        });
      }

      // コードブロック
      parts.push({
        type: 'code',
        content: match[2],
        language: match[1] || 'plaintext',
      });

      lastIndex = match.index + match[0].length;
    }

    // 残りのテキスト
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex),
      });
    }

    return parts;
  });

  /**
   * MessageType列挙型への参照（テンプレートで使用）
   * @public
   */
  MessageType = MessageType;
}
