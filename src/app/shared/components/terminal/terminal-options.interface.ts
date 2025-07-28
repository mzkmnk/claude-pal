/**
 * ターミナルの設定オプションを定義するインターフェース
 * @interface TerminalOptions
 */
export interface TerminalOptions {
  /** ターミナルのテーマ設定 */
  theme?: TerminalTheme;
  /** フォントファミリー */
  fontFamily?: string;
  /** フォントサイズ（ピクセル） */
  fontSize?: number;
  /** 行の高さ（倍率） */
  lineHeight?: number;
  /** カーソルの点滅を有効にするか */
  cursorBlink?: boolean;
  /** カーソルのスタイル */
  cursorStyle?: 'block' | 'underline' | 'bar';
  /** スクロールバックの最大行数 */
  scrollback?: number;
  /** タブサイズ */
  tabStopWidth?: number;
  /** ベル音を有効にするか */
  bellSound?: boolean;
  /** 右クリックでペーストを有効にするか */
  rightClickSelectsWord?: boolean;
  /** macOptionIsMeta設定（macOSでOptionキーをMetaキーとして扱う） */
  macOptionIsMeta?: boolean;
}

/**
 * ターミナルのテーマ設定を定義するインターフェース
 * @interface TerminalTheme
 */
export interface TerminalTheme {
  /** 背景色 */
  background?: string;
  /** 前景色（テキスト色） */
  foreground?: string;
  /** カーソル色 */
  cursor?: string;
  /** カーソルのアクセント色 */
  cursorAccent?: string;
  /** 選択範囲の背景色 */
  selection?: string;
  /** 黒 */
  black?: string;
  /** 赤 */
  red?: string;
  /** 緑 */
  green?: string;
  /** 黄 */
  yellow?: string;
  /** 青 */
  blue?: string;
  /** マゼンタ */
  magenta?: string;
  /** シアン */
  cyan?: string;
  /** 白 */
  white?: string;
  /** 明るい黒（グレー） */
  brightBlack?: string;
  /** 明るい赤 */
  brightRed?: string;
  /** 明るい緑 */
  brightGreen?: string;
  /** 明るい黄 */
  brightYellow?: string;
  /** 明るい青 */
  brightBlue?: string;
  /** 明るいマゼンタ */
  brightMagenta?: string;
  /** 明るいシアン */
  brightCyan?: string;
  /** 明るい白 */
  brightWhite?: string;
}

/**
 * デフォルトのダークテーマ設定
 */
export const DEFAULT_DARK_THEME: TerminalTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#d4d4d4',
  cursorAccent: '#1e1e1e',
  selection: 'rgba(255, 255, 255, 0.3)',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
};

/**
 * デフォルトのターミナル設定
 */
export const DEFAULT_TERMINAL_OPTIONS: TerminalOptions = {
  theme: DEFAULT_DARK_THEME,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  fontSize: 14,
  lineHeight: 1.2,
  cursorBlink: true,
  cursorStyle: 'block',
  scrollback: 1000,
  tabStopWidth: 8,
  bellSound: false,
  rightClickSelectsWord: true,
  macOptionIsMeta: true,
};
