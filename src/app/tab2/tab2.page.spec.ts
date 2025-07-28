import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab2Page } from './tab2.page';
import { ToastController, AlertController, Platform } from '@ionic/angular';
import { SSHService } from '../core/services/ssh.service';
import { TerminalComponent } from '../shared/components/terminal';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { of } from 'rxjs';

// TerminalComponentのモック
@Component({
  selector: 'app-terminal',
  template: '',
})
class MockTerminalComponent {
  @Input() options: any;
  @Output() ready = new EventEmitter<void>();
  @Output() terminalData = new EventEmitter<string>();
  @Output() terminalResize = new EventEmitter<{ cols: number; rows: number }>();
  @Output() gesture = new EventEmitter<any>();

  write = jasmine.createSpy('write');
  writeln = jasmine.createSpy('writeln');
  clear = jasmine.createSpy('clear');
  updateTheme = jasmine.createSpy('updateTheme');
  updateFontSize = jasmine.createSpy('updateFontSize');
  search = jasmine.createSpy('search');
  copySelection = jasmine.createSpy('copySelection');
}

describe('Tab2Page', () => {
  let component: Tab2Page;
  let fixture: ComponentFixture<Tab2Page>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let alertControllerSpy: jasmine.SpyObj<AlertController>;
  let sshServiceSpy: jasmine.SpyObj<SSHService>;

  beforeEach(async () => {
    const toastSpy = jasmine.createSpyObj('ToastController', ['create']);
    const toastElementSpy = jasmine.createSpyObj('HTMLIonToastElement', [
      'present',
      'dismiss',
    ]);
    toastElementSpy.present.and.returnValue(Promise.resolve());
    toastSpy.create.and.returnValue(Promise.resolve(toastElementSpy));

    const alertSpy = jasmine.createSpyObj('AlertController', ['create']);
    const alertElementSpy = jasmine.createSpyObj('HTMLIonAlertElement', [
      'present',
      'dismiss',
    ]);
    alertElementSpy.present.and.returnValue(Promise.resolve());
    alertSpy.create.and.returnValue(Promise.resolve(alertElementSpy));

    const platformSpyObj = jasmine.createSpyObj('Platform', ['is']);
    platformSpyObj.is.and.returnValue(false);

    const sshServiceSpyObj = jasmine.createSpyObj(
      'SSHService',
      ['sendData', 'resize', 'disconnect'],
      { dataStream$: of('') }
    );

    await TestBed.configureTestingModule({
      imports: [Tab2Page],
      providers: [
        { provide: ToastController, useValue: toastSpy },
        { provide: AlertController, useValue: alertSpy },
        { provide: Platform, useValue: platformSpyObj },
        { provide: SSHService, useValue: sshServiceSpyObj },
      ],
    })
      .overrideComponent(Tab2Page, {
        remove: { imports: [TerminalComponent] },
        add: { imports: [MockTerminalComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    toastControllerSpy = TestBed.inject(
      ToastController
    ) as jasmine.SpyObj<ToastController>;
    alertControllerSpy = TestBed.inject(
      AlertController
    ) as jasmine.SpyObj<AlertController>;
    sshServiceSpy = TestBed.inject(SSHService) as jasmine.SpyObj<SSHService>;

    // ComponentのtoastControllerを明示的に設定
    (component as any).toastController = toastControllerSpy;
    (component as any).alertController = alertControllerSpy;
  });

  it('コンポーネントが作成できること', () => {
    expect(component).toBeTruthy();
  });

  describe('ngAfterViewInit', () => {
    it('ウェルカムメッセージが表示されること', done => {
      const mockTerminal = new MockTerminalComponent();
      component.terminal = mockTerminal as any;
      component.ngAfterViewInit();

      setTimeout(() => {
        expect(mockTerminal.writeln).toHaveBeenCalledWith(
          'Welcome to Claude PAL Terminal Demo! 🚀'
        );
        expect(mockTerminal.writeln).toHaveBeenCalledWith('');
        expect(mockTerminal.writeln).toHaveBeenCalledWith(
          'This is a demonstration of the terminal component.'
        );
        expect(mockTerminal.write).toHaveBeenCalledWith('$ ');
        done();
      }, 600);
    });
  });

  describe('onTerminalData', () => {
    let mockTerminal: MockTerminalComponent;

    beforeEach(() => {
      mockTerminal = new MockTerminalComponent();
      component.terminal = mockTerminal as any;
    });

    it('未接続時にローカルエコーが動作すること', () => {
      component.isConnected = false;
      component.onTerminalData('test');

      expect(mockTerminal.write).toHaveBeenCalledWith('test');
    });

    it('接続時にSSHサービスにデータが送信されること', () => {
      component.isConnected = true;
      component.onTerminalData('test');

      expect(sshServiceSpy.sendData).toHaveBeenCalledWith('test');
    });
  });

  describe('onTerminalResize', () => {
    it('接続時にSSHサービスにリサイズが通知されること', () => {
      component.isConnected = true;
      const size = { cols: 80, rows: 24 };

      component.onTerminalResize(size);

      expect(sshServiceSpy.resize).toHaveBeenCalledWith(80, 24);
    });

    it('未接続時はリサイズが通知されないこと', () => {
      component.isConnected = false;
      const size = { cols: 80, rows: 24 };

      component.onTerminalResize(size);

      expect(sshServiceSpy.resize).not.toHaveBeenCalled();
    });
  });

  describe('onGesture', () => {
    it('ダブルタップで全画面切り替えが呼ばれること', async () => {
      spyOn(component, 'toggleFullscreen');

      await component.onGesture({ type: 'doubletap' });

      expect(component.toggleFullscreen).toHaveBeenCalled();
    });

    it('スワイプでトーストが表示されること', async () => {
      await component.onGesture({ type: 'swipe', direction: 'left' });

      expect(toastControllerSpy.create).toHaveBeenCalled();
    });
  });

  describe('executeCommand', () => {
    let mockTerminal: MockTerminalComponent;

    beforeEach(() => {
      mockTerminal = new MockTerminalComponent();
      component.terminal = mockTerminal as any;
    });

    it('lsコマンドが実行されること', () => {
      component.isConnected = false;
      component.executeCommand('ls -la');

      expect(mockTerminal.writeln).toHaveBeenCalledWith('ls -la');
      expect(mockTerminal.writeln).toHaveBeenCalledWith('total 48');
    });

    it('pwdコマンドが実行されること', () => {
      component.isConnected = false;
      component.executeCommand('pwd');

      expect(mockTerminal.writeln).toHaveBeenCalledWith('pwd');
      expect(mockTerminal.writeln).toHaveBeenCalledWith(
        '/home/user/claude-pal'
      );
    });
  });

  describe('connect', () => {
    it('接続確認ダイアログが表示されること', async () => {
      await component.connect();

      expect(alertControllerSpy.create).toHaveBeenCalledWith({
        header: 'SSH接続デモ',
        message: 'モックSSHセッションを開始します。実際の接続は行われません。',
        buttons: jasmine.any(Array),
      });
    });
  });

  describe('disconnect', () => {
    let mockTerminal: MockTerminalComponent;

    beforeEach(() => {
      mockTerminal = new MockTerminalComponent();
      component.terminal = mockTerminal as any;
    });

    it('接続が切断されること', async () => {
      component.isConnected = true;

      await component.disconnect();

      expect(component.isConnected).toBe(false);
      expect(sshServiceSpy.disconnect).toHaveBeenCalled();
      expect(toastControllerSpy.create).toHaveBeenCalled();
    });
  });

  describe('clearTerminal', () => {
    let mockTerminal: MockTerminalComponent;

    beforeEach(() => {
      mockTerminal = new MockTerminalComponent();
      component.terminal = mockTerminal as any;
    });

    it('ターミナルがクリアされること', () => {
      component.clearTerminal();

      expect(mockTerminal.clear).toHaveBeenCalled();
      expect(mockTerminal.write).toHaveBeenCalledWith('$ ');
    });
  });

  describe('toggleTheme', () => {
    let mockTerminal: MockTerminalComponent;

    beforeEach(() => {
      mockTerminal = new MockTerminalComponent();
      component.terminal = mockTerminal as any;
    });

    it('テーマが切り替わること', () => {
      component.currentTheme = 'dark';
      component.toggleTheme();

      expect(component.currentTheme).toBe('light');
      expect(mockTerminal.updateTheme).toHaveBeenCalled();
    });
  });

  describe('changeFontSize', () => {
    let mockTerminal: MockTerminalComponent;

    beforeEach(() => {
      mockTerminal = new MockTerminalComponent();
      component.terminal = mockTerminal as any;
    });

    it('フォントサイズが変更されること', () => {
      component.fontSize = 14;
      component.changeFontSize(2);

      expect(component.fontSize).toBe(16);
      expect(mockTerminal.updateFontSize).toHaveBeenCalledWith(16);
    });

    it('フォントサイズが最小値で制限されること', () => {
      component.fontSize = 8;
      component.changeFontSize(-2);

      expect(component.fontSize).toBe(8);
      expect(mockTerminal.updateFontSize).toHaveBeenCalledWith(8);
    });

    it('フォントサイズが最大値で制限されること', () => {
      component.fontSize = 24;
      component.changeFontSize(2);

      expect(component.fontSize).toBe(24);
      expect(mockTerminal.updateFontSize).toHaveBeenCalledWith(24);
    });
  });

  describe('copySelection', () => {
    let mockTerminal: MockTerminalComponent;

    beforeEach(() => {
      mockTerminal = new MockTerminalComponent();
      component.terminal = mockTerminal as any;
    });

    it('選択テキストがコピーされること', async () => {
      await component.copySelection();

      expect(mockTerminal.copySelection).toHaveBeenCalled();
      expect(toastControllerSpy.create).toHaveBeenCalled();
    });
  });
});
