import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular';
import { TerminalComponent } from './terminal.component';
import {
  TerminalOptions,
  DEFAULT_DARK_THEME,
} from './terminal-options.interface';
import { TerminalGestureService } from './terminal-gesture.service';

// xterm モジュールのモック
jest.mock('xterm', () => {
  return {
    Terminal: jest.fn().mockImplementation(() => ({
      open: jest.fn(),
      write: jest.fn(),
      writeln: jest.fn(),
      clear: jest.fn(),
      focus: jest.fn(),
      blur: jest.fn(),
      dispose: jest.fn(),
      onData: jest.fn(),
      onResize: jest.fn(),
      onBell: jest.fn(),
      hasSelection: jest.fn().mockReturnValue(false),
      getSelection: jest.fn().mockReturnValue(''),
      paste: jest.fn(),
      scrollToBottom: jest.fn(),
      attachCustomKeyEventHandler: jest.fn(),
      loadAddon: jest.fn(),
      options: {
        theme: {},
        fontSize: 14,
      },
    })),
  };
});

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn().mockImplementation(() => ({
    fit: jest.fn(),
  })),
}));

jest.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@xterm/addon-search', () => ({
  SearchAddon: jest.fn().mockImplementation(() => ({
    findNext: jest.fn(),
    findPrevious: jest.fn(),
    clearDecorations: jest.fn(),
  })),
}));

describe('TerminalComponent', () => {
  let component: TerminalComponent;
  let fixture: ComponentFixture<TerminalComponent>;
  let platformSpy: Platform;
  let gestureServiceSpy: TerminalGestureService;

  beforeEach(async () => {
    const platformSpyObj = {
      is: jest.fn().mockReturnValue(false),
      ready: jest.fn().mockResolvedValue(undefined),
    };

    const gestureServiceSpyObj = {
      createGestures: jest.fn().mockReturnValue({ destroy: jest.fn() }),
      createThreeFingerSwipe: jest.fn().mockReturnValue({ destroy: jest.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [TerminalComponent],
      providers: [
        { provide: Platform, useValue: platformSpyObj },
        { provide: TerminalGestureService, useValue: gestureServiceSpyObj },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TerminalComponent);
    component = fixture.componentInstance;
    platformSpy = TestBed.inject(Platform);
    gestureServiceSpy = TestBed.inject(TerminalGestureService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('コンポーネントが作成できること', () => {
    expect(component).toBeTruthy();
  });

  describe('初期化処理', () => {
    it('ngOnInitでターミナルが初期化されること', () => {
      component.ngOnInit();
      expect(component['terminal']).toBeDefined();
    });

    it('カスタムオプションでターミナルが初期化されること', () => {
      const customOptions: TerminalOptions = {
        fontSize: 16,
        cursorStyle: 'underline',
        theme: {
          background: '#000000',
          foreground: '#ffffff',
        },
      };

      component.options = customOptions;
      component.ngOnInit();

      expect(component['terminal']).toBeDefined();
    });
  });

  describe('ライフサイクルフック', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('ngAfterViewInitでターミナルが開かれること', () => {
      const readyEmitSpy = jest.spyOn(component.ready, 'emit');

      component.ngAfterViewInit();

      expect(component['terminal']?.open).toHaveBeenCalledWith(
        component.terminalElement.nativeElement
      );
      expect(component.isReady()).toBe(true);
      expect(readyEmitSpy).toHaveBeenCalled();
    });

    it('ngOnDestroyでクリーンアップされること', () => {
      component.ngAfterViewInit();

      // ResizeObserverのモック
      const disconnectSpy = jest.fn();
      component['resizeObserver'] = {
        disconnect: disconnectSpy,
        observe: jest.fn(),
        unobserve: jest.fn(),
      };

      component.ngOnDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(component['terminal']?.dispose).toHaveBeenCalled();
    });
  });

  describe('データ入出力', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.ngAfterViewInit();
    });

    it('writeメソッドでデータが書き込まれること', () => {
      const testData = 'Hello, Terminal!';
      component.write(testData);

      expect(component['terminal']?.write).toHaveBeenCalledWith(testData);
    });

    it('writelnメソッドで改行付きデータが書き込まれること', () => {
      const testData = 'Hello, Terminal!';
      component.writeln(testData);

      expect(component['terminal']?.writeln).toHaveBeenCalledWith(testData);
    });

    it('clearメソッドでターミナルがクリアされること', () => {
      component.clear();

      expect(component['terminal']?.clear).toHaveBeenCalled();
    });

    it('clearBufferメソッドでバッファがクリアされること', () => {
      component.clearBuffer();

      expect(component['terminal']?.clear).toHaveBeenCalled();
      expect(component['terminal']?.scrollToBottom).toHaveBeenCalled();
    });
  });

  describe('フォーカス管理', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.ngAfterViewInit();
    });

    it('focusメソッドでフォーカスが設定されること', () => {
      component.focus();

      expect(component['terminal']?.focus).toHaveBeenCalled();
    });

    it('blurメソッドでフォーカスが解除されること', () => {
      component.blur();

      expect(component['terminal']?.blur).toHaveBeenCalled();
    });
  });

  describe('クリップボード操作', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.ngAfterViewInit();
    });

    it('copySelectionメソッドで選択テキストがコピーされること', async () => {
      const selectedText = 'selected text';
      const writeTextSpy = jest
        .spyOn(navigator.clipboard, 'writeText')
        .mockResolvedValue();

      (component['terminal']?.hasSelection as jest.Mock).mockReturnValue(true);
      (component['terminal']?.getSelection as jest.Mock).mockReturnValue(
        selectedText
      );

      component.copySelection();

      expect(writeTextSpy).toHaveBeenCalledWith(selectedText);
    });

    it('pasteメソッドでテキストがペーストされること', async () => {
      const pasteText = 'paste text';
      jest.spyOn(navigator.clipboard, 'readText').mockResolvedValue(pasteText);

      await component.paste();

      expect(component['terminal']?.paste).toHaveBeenCalledWith(pasteText);
    });

    it('クリップボードエラーが適切に処理されること', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest
        .spyOn(navigator.clipboard, 'readText')
        .mockRejectedValue(new Error('Clipboard error'));

      await component.paste();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to paste from clipboard:',
        expect.any(Error)
      );
    });
  });

  describe('検索機能', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.ngAfterViewInit();
    });

    it('searchメソッドで検索が実行されること', () => {
      const searchTerm = 'test';
      component.search(searchTerm);

      expect(component['searchAddon']?.findNext).toHaveBeenCalledWith(
        searchTerm
      );
    });

    it('searchメソッドで次を検索できること', () => {
      const searchTerm = 'test';
      component.search(searchTerm, true, false);

      expect(component['searchAddon']?.findNext).toHaveBeenCalledWith(
        searchTerm
      );
    });

    it('searchメソッドで前を検索できること', () => {
      const searchTerm = 'test';
      component.search(searchTerm, false, true);

      expect(component['searchAddon']?.findPrevious).toHaveBeenCalledWith(
        searchTerm
      );
    });

    it('clearSearchメソッドで検索がクリアされること', () => {
      component.clearSearch();

      expect(component['searchAddon']?.clearDecorations).toHaveBeenCalled();
    });
  });

  describe('設定更新', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.ngAfterViewInit();
    });

    it('updateThemeメソッドでテーマが更新されること', () => {
      const newTheme = {
        background: '#ffffff',
        foreground: '#000000',
      };

      component.updateTheme(newTheme);

      expect(component['terminal']?.options.theme).toMatchObject(newTheme);
    });

    it('updateFontSizeメソッドでフォントサイズが更新されること', () => {
      const newFontSize = 18;
      const fitSpy = jest.spyOn(component, 'fit');

      component.updateFontSize(newFontSize);

      expect(component['terminal']?.options.fontSize).toBe(newFontSize);
      expect(fitSpy).toHaveBeenCalled();
    });
  });

  describe('イベントハンドリング', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('データ入力イベントが発行されること', () => {
      const dataSpy = jest.spyOn(component.terminalData, 'emit');
      const testData = 'input data';

      // onDataコールバックを取得して実行
      const onDataCallback = (component['terminal']?.onData as jest.Mock).mock
        .calls[0][0];
      onDataCallback(testData);

      expect(dataSpy).toHaveBeenCalledWith(testData);
    });

    it('リサイズイベントが発行されること', () => {
      const resizeSpy = jest.spyOn(component.terminalResize, 'emit');
      const newSize = { cols: 100, rows: 30 };

      // onResizeコールバックを取得して実行
      const onResizeCallback = (component['terminal']?.onResize as jest.Mock)
        .mock.calls[0][0];
      onResizeCallback(newSize);

      expect(component.terminalSize()).toEqual(newSize);
      expect(resizeSpy).toHaveBeenCalledWith(newSize);
    });
  });

  describe('レスポンシブ対応', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.ngAfterViewInit();
    });

    it('fitメソッドでサイズが調整されること', () => {
      component.fit();

      expect(component['fitAddon']?.fit).toHaveBeenCalled();
    });

    it('fitメソッドのエラーが適切に処理されること', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (component['fitAddon']?.fit as jest.Mock).mockImplementation(() => {
        throw new Error('Fit error');
      });

      component.fit();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fit terminal:',
        expect.any(Error)
      );
    });
  });

  describe('computed properties', () => {
    it('sizeStringが正しく計算されること', () => {
      component.terminalSize.set({ cols: 120, rows: 40 });

      expect(component.sizeString()).toBe('120x40');
    });
  });

  describe('ジェスチャー機能', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('ngAfterViewInitでジェスチャーがセットアップされること', () => {
      component.ngAfterViewInit();

      expect(gestureServiceSpy.createGestures).toHaveBeenCalledWith(
        component.terminalElement,
        expect.any(Function)
      );
    });

    it('iOSプラットフォームで3本指スワイプジェスチャーがセットアップされること', () => {
      (platformSpy.is as jest.Mock).mockReturnValue(true);

      component.ngAfterViewInit();

      expect(gestureServiceSpy.createThreeFingerSwipe).toHaveBeenCalledWith(
        component.terminalElement,
        expect.any(Function)
      );
    });

    it('iOS以外のプラットフォームでは3本指スワイプジェスチャーがセットアップされないこと', () => {
      (platformSpy.is as jest.Mock).mockReturnValue(false);

      component.ngAfterViewInit();

      expect(gestureServiceSpy.createThreeFingerSwipe).not.toHaveBeenCalled();
    });

    it('ピンチジェスチャーでフォントサイズが変更されること', () => {
      const updateFontSizeSpy = jest.spyOn(component, 'updateFontSize');
      component.ngAfterViewInit();

      // createGesturesのコールバックを取得
      const gestureCallback = (gestureServiceSpy.createGestures as jest.Mock)
        .mock.calls[0][1];

      // ピンチジェスチャーをシミュレート
      gestureCallback({ type: 'pinch', scale: 1.5 });

      expect(updateFontSizeSpy).toHaveBeenCalledWith(21); // 14 * 1.5 = 21
    });

    it('ピンチジェスチャーでフォントサイズが最小値に制限されること', () => {
      const updateFontSizeSpy = jest.spyOn(component, 'updateFontSize');
      component.ngAfterViewInit();

      const gestureCallback = (gestureServiceSpy.createGestures as jest.Mock)
        .mock.calls[0][1];

      // 極小スケール
      gestureCallback({ type: 'pinch', scale: 0.1 });

      expect(updateFontSizeSpy).toHaveBeenCalledWith(8); // 最小値
    });

    it('ピンチジェスチャーでフォントサイズが最大値に制限されること', () => {
      const updateFontSizeSpy = jest.spyOn(component, 'updateFontSize');
      component.ngAfterViewInit();

      const gestureCallback = (gestureServiceSpy.createGestures as jest.Mock)
        .mock.calls[0][1];

      // 極大スケール
      gestureCallback({ type: 'pinch', scale: 3.0 });

      expect(updateFontSizeSpy).toHaveBeenCalledWith(24); // 最大値
    });

    it('スワイプジェスチャーイベントが発行されること', () => {
      const gestureSpy = jest.spyOn(component.gesture, 'emit');
      component.ngAfterViewInit();

      const gestureCallback = (gestureServiceSpy.createGestures as jest.Mock)
        .mock.calls[0][1];

      const swipeEvent = { type: 'swipe' as const, direction: 'left' as const };
      gestureCallback(swipeEvent);

      expect(gestureSpy).toHaveBeenCalledWith(swipeEvent);
    });

    it('ダブルタップジェスチャーイベントが発行されること', () => {
      const gestureSpy = jest.spyOn(component.gesture, 'emit');
      component.ngAfterViewInit();

      const gestureCallback = (gestureServiceSpy.createGestures as jest.Mock)
        .mock.calls[0][1];

      const doubleTapEvent = { type: 'doubletap' as const, x: 100, y: 200 };
      gestureCallback(doubleTapEvent);

      expect(gestureSpy).toHaveBeenCalledWith(doubleTapEvent);
    });

    it('3本指スワイプイベントが発行されること', () => {
      (platformSpy.is as jest.Mock).mockReturnValue(true);
      const gestureSpy = jest.spyOn(component.gesture, 'emit');

      component.ngAfterViewInit();

      // createThreeFingerSwipeのコールバックを取得
      const threeFingerCallback = (
        gestureServiceSpy.createThreeFingerSwipe as jest.Mock
      ).mock.calls[0][1];

      threeFingerCallback('left');

      expect(gestureSpy).toHaveBeenCalledWith({
        type: 'swipe',
        direction: 'left',
      });
    });

    it('クリーンアップ時にジェスチャーが破棄されること', () => {
      const gestureDestroySpy = jest.fn();
      (gestureServiceSpy.createGestures as jest.Mock).mockReturnValue({
        destroy: gestureDestroySpy,
      });

      component.ngAfterViewInit();
      component.ngOnDestroy();

      expect(gestureDestroySpy).toHaveBeenCalled();
    });
  });
});
