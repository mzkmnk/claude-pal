/**
 * xterm関連モジュールのモック
 * Jasmineテスト用のモッククラスとファクトリー関数
 */

export class MockTerminal {
  open = jasmine.createSpy('open');
  write = jasmine.createSpy('write');
  writeln = jasmine.createSpy('writeln');
  clear = jasmine.createSpy('clear');
  focus = jasmine.createSpy('focus');
  blur = jasmine.createSpy('blur');
  dispose = jasmine.createSpy('dispose');
  onData = jasmine
    .createSpy('onData')
    .and.returnValue({ dispose: jasmine.createSpy('dispose') });
  onResize = jasmine
    .createSpy('onResize')
    .and.returnValue({ dispose: jasmine.createSpy('dispose') });
  onBell = jasmine
    .createSpy('onBell')
    .and.returnValue({ dispose: jasmine.createSpy('dispose') });
  hasSelection = jasmine.createSpy('hasSelection').and.returnValue(false);
  getSelection = jasmine.createSpy('getSelection').and.returnValue('');
  paste = jasmine.createSpy('paste');
  scrollToBottom = jasmine.createSpy('scrollToBottom');
  attachCustomKeyEventHandler = jasmine.createSpy(
    'attachCustomKeyEventHandler'
  );
  loadAddon = jasmine.createSpy('loadAddon');
  options = {
    theme: {},
    fontSize: 14,
  };

  constructor(options?: any) {
    // optionsが渡された場合はマージ
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }
}

export class MockFitAddon {
  fit = jasmine.createSpy('fit');
  dispose = jasmine.createSpy('dispose');
}

export class MockWebLinksAddon {
  dispose = jasmine.createSpy('dispose');
}

export class MockSearchAddon {
  findNext = jasmine.createSpy('findNext');
  findPrevious = jasmine.createSpy('findPrevious');
  clearDecorations = jasmine.createSpy('clearDecorations');
  dispose = jasmine.createSpy('dispose');
}

/**
 * xterm関連のモジュールモックを設定
 * TestBedのconfigureTestingModuleの前に呼び出す
 */
export function setupXtermMocks(): void {
  // xterm モジュールのモック
  const xtermModule = {
    Terminal: MockTerminal,
  };

  // addon モジュールのモック
  const fitAddonModule = {
    FitAddon: MockFitAddon,
  };

  const webLinksAddonModule = {
    WebLinksAddon: MockWebLinksAddon,
  };

  const searchAddonModule = {
    SearchAddon: MockSearchAddon,
  };

  // モジュールローダーのモック
  (window as any).__mockModules = {
    xterm: xtermModule,
    '@xterm/addon-fit': fitAddonModule,
    '@xterm/addon-web-links': webLinksAddonModule,
    '@xterm/addon-search': searchAddonModule,
  };
}
