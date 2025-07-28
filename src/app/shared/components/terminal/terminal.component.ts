import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
} from '@angular/core';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { Platform } from '@ionic/angular';
import {
  TerminalOptions,
  DEFAULT_TERMINAL_OPTIONS,
} from './terminal-options.interface';
import {
  TerminalGestureService,
  GestureEventData,
} from './terminal-gesture.service';

/**
 * ターミナルコンポーネント
 *
 * xterm.jsを使用してターミナルエミュレータを提供します。
 * SSH接続やローカルシェルの入出力を表示し、ユーザーとのインタラクションを処理します。
 *
 * @component TerminalComponent
 * @example
 * ```html
 * <app-terminal
 *   [options]="terminalOptions"
 *   (data)="onTerminalData($event)"
 *   (resize)="onTerminalResize($event)">
 * </app-terminal>
 * ```
 */
@Component({
  selector: 'app-terminal',
  template: `
    <div class="terminal-container">
      <div #terminalElement class="terminal-element"></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .terminal-container {
        width: 100%;
        height: 100%;
        background-color: var(--terminal-bg, #1e1e1e);
        position: relative;
        overflow: hidden;
      }

      .terminal-element {
        width: 100%;
        height: 100%;
      }

      ::ng-deep .xterm {
        height: 100%;
        padding: 8px;
      }

      ::ng-deep .xterm-viewport {
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      ::ng-deep .xterm-screen {
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('terminalElement', { static: true })
  terminalElement!: ElementRef<HTMLDivElement>;

  /** ターミナルの設定オプション */
  @Input() options: TerminalOptions = DEFAULT_TERMINAL_OPTIONS;

  /** ターミナルからのデータ出力イベント */
  @Output() terminalData = new EventEmitter<string>();

  /** ターミナルのサイズ変更イベント */
  @Output() terminalResize = new EventEmitter<{ cols: number; rows: number }>();

  /** ターミナルの準備完了イベント */
  @Output() ready = new EventEmitter<void>();

  /** ジェスチャーイベント */
  @Output() gesture = new EventEmitter<GestureEventData>();

  private platform = inject(Platform);
  private gestureService = inject(TerminalGestureService);
  private terminal?: Terminal;
  private fitAddon?: FitAddon;
  private searchAddon?: SearchAddon;
  private webLinksAddon?: WebLinksAddon;
  private resizeObserver?: ResizeObserver;
  private gestureCleanup?: { destroy: () => void };

  /** ターミナルの準備状態 */
  isReady = signal(false);

  /** 現在のターミナルサイズ */
  terminalSize = signal({ cols: 80, rows: 24 });

  /** ターミナルサイズの文字列表現 */
  sizeString = computed(() => {
    const size = this.terminalSize();
    return `${size.cols}x${size.rows}`;
  });

  ngOnInit(): void {
    this.initializeTerminal();
  }

  ngAfterViewInit(): void {
    if (this.terminal && this.terminalElement.nativeElement) {
      this.terminal.open(this.terminalElement.nativeElement);
      this.setupAddons();
      this.setupEventHandlers();
      this.setupResizeObserver();
      this.setupGestures();
      this.fit();
      this.isReady.set(true);
      this.ready.emit();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * ターミナルを初期化する
   * @private
   */
  private initializeTerminal(): void {
    const mergedOptions = { ...DEFAULT_TERMINAL_OPTIONS, ...this.options };

    const terminalOptions: any = {
      allowTransparency: true,
    };

    // undefined値を除外してオプションを設定
    if (mergedOptions.theme !== undefined)
      terminalOptions.theme = mergedOptions.theme;
    if (mergedOptions.fontFamily !== undefined)
      terminalOptions.fontFamily = mergedOptions.fontFamily;
    if (mergedOptions.fontSize !== undefined)
      terminalOptions.fontSize = mergedOptions.fontSize;
    if (mergedOptions.lineHeight !== undefined)
      terminalOptions.lineHeight = mergedOptions.lineHeight;
    if (mergedOptions.cursorBlink !== undefined)
      terminalOptions.cursorBlink = mergedOptions.cursorBlink;
    if (mergedOptions.cursorStyle !== undefined)
      terminalOptions.cursorStyle = mergedOptions.cursorStyle;
    if (mergedOptions.scrollback !== undefined)
      terminalOptions.scrollback = mergedOptions.scrollback;
    if (mergedOptions.tabStopWidth !== undefined)
      terminalOptions.tabStopWidth = mergedOptions.tabStopWidth;
    if (mergedOptions.macOptionIsMeta !== undefined)
      terminalOptions.macOptionIsMeta = mergedOptions.macOptionIsMeta;

    this.terminal = new Terminal(terminalOptions);
  }

  /**
   * アドオンをセットアップする
   * @private
   */
  private setupAddons(): void {
    if (!this.terminal) return;

    // Fit Addon
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    // Search Addon
    this.searchAddon = new SearchAddon();
    this.terminal.loadAddon(this.searchAddon);

    // Web Links Addon
    this.webLinksAddon = new WebLinksAddon();
    this.terminal.loadAddon(this.webLinksAddon);
  }

  /**
   * イベントハンドラーをセットアップする
   * @private
   */
  private setupEventHandlers(): void {
    if (!this.terminal) return;

    // データ入力イベント
    this.terminal.onData((data: string) => {
      this.terminalData.emit(data);
    });

    // サイズ変更イベント
    this.terminal.onResize((size: { cols: number; rows: number }) => {
      this.terminalSize.set(size);
      this.terminalResize.emit(size);
    });

    // ベル音イベント
    if (!this.options.bellSound) {
      this.terminal.onBell(() => {
        // ビジュアルベル（画面フラッシュ）の実装
        this.visualBell();
      });
    }

    // コピー&ペーストのサポート
    this.setupClipboardHandlers();
  }

  /**
   * ResizeObserverをセットアップする
   * @private
   */
  private setupResizeObserver(): void {
    if (!this.terminalElement.nativeElement) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.fit();
    });

    this.resizeObserver.observe(this.terminalElement.nativeElement);
  }

  /**
   * クリップボードハンドラーをセットアップする
   * @private
   */
  private setupClipboardHandlers(): void {
    if (!this.terminal) return;

    // コピー処理
    this.terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === 'c' &&
        this.terminal?.hasSelection()
      ) {
        this.copySelection();
        return false;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        this.paste();
        return false;
      }
      return true;
    });

    // 右クリックでペースト（オプション）
    if (this.options.rightClickSelectsWord) {
      this.terminalElement.nativeElement.addEventListener('contextmenu', e => {
        e.preventDefault();
        this.paste();
      });
    }
  }

  /**
   * ビジュアルベルを表示する
   * @private
   */
  private visualBell(): void {
    if (!this.terminalElement.nativeElement) return;

    const element = this.terminalElement.nativeElement;
    element.style.animation = 'terminal-bell 200ms';
    setTimeout(() => {
      element.style.animation = '';
    }, 200);
  }

  /**
   * ジェスチャーをセットアップする
   * @private
   */
  private setupGestures(): void {
    if (!this.terminalElement) return;

    // 基本ジェスチャーのセットアップ
    this.gestureCleanup = this.gestureService.createGestures(
      this.terminalElement,
      (event: GestureEventData) => {
        this.handleGesture(event);
      }
    );

    // 3本指スワイプジェスチャー（iOS特有）
    if (this.platform.is('ios')) {
      const threeFingerCleanup = this.gestureService.createThreeFingerSwipe(
        this.terminalElement,
        (direction: 'left' | 'right') => {
          this.gesture.emit({
            type: 'swipe',
            direction: direction === 'left' ? 'left' : 'right',
          });
        }
      );

      // 既存のクリーンアップ関数と統合
      const originalDestroy = this.gestureCleanup.destroy;
      this.gestureCleanup.destroy = () => {
        originalDestroy();
        threeFingerCleanup.destroy();
      };
    }
  }

  /**
   * ジェスチャーイベントを処理する
   * @private
   */
  private handleGesture(event: GestureEventData): void {
    switch (event.type) {
      case 'pinch':
        // ピンチでフォントサイズを変更
        if (event.scale && this.terminal) {
          const currentSize = this.terminal.options.fontSize || 14;
          const newSize = Math.round(currentSize * event.scale);
          const clampedSize = Math.max(8, Math.min(24, newSize));
          this.updateFontSize(clampedSize);
        }
        break;

      case 'swipe':
        // スワイプイベントを親コンポーネントに伝播
        this.gesture.emit(event);
        break;

      case 'doubletap':
        // ダブルタップで全画面切り替え（親コンポーネントで処理）
        this.gesture.emit(event);
        break;
    }
  }

  /**
   * クリーンアップ処理
   * @private
   */
  private cleanup(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.gestureCleanup) {
      this.gestureCleanup.destroy();
    }

    if (this.terminal) {
      this.terminal.dispose();
    }
  }

  /**
   * ターミナルにデータを書き込む
   * @param {string} data - 書き込むデータ
   * @public
   */
  write(data: string): void {
    if (this.terminal) {
      this.terminal.write(data);
    }
  }

  /**
   * ターミナルに改行付きでデータを書き込む
   * @param {string} data - 書き込むデータ
   * @public
   */
  writeln(data: string): void {
    if (this.terminal) {
      this.terminal.writeln(data);
    }
  }

  /**
   * ターミナルをクリアする
   * @public
   */
  clear(): void {
    if (this.terminal) {
      this.terminal.clear();
    }
  }

  /**
   * ターミナルのバッファをクリアする
   * @public
   */
  clearBuffer(): void {
    if (this.terminal) {
      this.terminal.clear();
      this.terminal.scrollToBottom();
    }
  }

  /**
   * ターミナルのサイズを調整する
   * @public
   */
  fit(): void {
    if (this.fitAddon) {
      try {
        this.fitAddon.fit();
      } catch (error) {
        console.error('Failed to fit terminal:', error);
      }
    }
  }

  /**
   * ターミナルにフォーカスを設定する
   * @public
   */
  focus(): void {
    if (this.terminal) {
      this.terminal.focus();
    }
  }

  /**
   * ターミナルのフォーカスを解除する
   * @public
   */
  blur(): void {
    if (this.terminal) {
      this.terminal.blur();
    }
  }

  /**
   * 選択されたテキストをコピーする
   * @public
   */
  copySelection(): void {
    if (this.terminal && this.terminal.hasSelection()) {
      const selection = this.terminal.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection).catch(error => {
          console.error('Failed to copy to clipboard:', error);
        });
      }
    }
  }

  /**
   * クリップボードからペーストする
   * @public
   */
  async paste(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text && this.terminal) {
        this.terminal.paste(text);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }

  /**
   * テキストを検索する
   * @param {string} searchTerm - 検索語
   * @param {boolean} [searchNext=false] - 次を検索するか
   * @param {boolean} [searchPrevious=false] - 前を検索するか
   * @public
   */
  search(searchTerm: string, searchNext = false, searchPrevious = false): void {
    if (!this.searchAddon) return;

    if (searchNext) {
      this.searchAddon.findNext(searchTerm);
    } else if (searchPrevious) {
      this.searchAddon.findPrevious(searchTerm);
    } else {
      this.searchAddon.findNext(searchTerm);
    }
  }

  /**
   * 検索をクリアする
   * @public
   */
  clearSearch(): void {
    if (this.searchAddon) {
      this.searchAddon.clearDecorations();
    }
  }

  /**
   * ターミナルのテーマを更新する
   * @param {TerminalTheme} theme - 新しいテーマ
   * @public
   */
  updateTheme(theme: Partial<TerminalOptions['theme']>): void {
    if (this.terminal && theme) {
      this.terminal.options.theme = {
        ...this.terminal.options.theme,
        ...theme,
      };
    }
  }

  /**
   * ターミナルのフォントサイズを更新する
   * @param {number} fontSize - 新しいフォントサイズ
   * @public
   */
  updateFontSize(fontSize: number): void {
    if (this.terminal) {
      this.terminal.options.fontSize = fontSize;
      this.fit();
    }
  }
}
