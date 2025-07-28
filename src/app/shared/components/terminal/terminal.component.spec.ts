import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventEmitter } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TerminalComponent } from './terminal.component';
import { TerminalGestureService } from './terminal-gesture.service';

describe('TerminalComponent', () => {
  let component: TerminalComponent;
  let fixture: ComponentFixture<TerminalComponent>;

  beforeEach(async () => {
    const platformSpyObj = jasmine.createSpyObj('Platform', ['is', 'ready']);
    platformSpyObj.is.and.returnValue(false);
    platformSpyObj.ready.and.returnValue(Promise.resolve());

    const gestureServiceSpyObj = jasmine.createSpyObj(
      'TerminalGestureService',
      ['createGestures', 'createThreeFingerSwipe']
    );
    gestureServiceSpyObj.createGestures.and.returnValue({
      destroy: jasmine.createSpy('destroy'),
    });
    gestureServiceSpyObj.createThreeFingerSwipe.and.returnValue({
      destroy: jasmine.createSpy('destroy'),
    });

    await TestBed.configureTestingModule({
      imports: [TerminalComponent],
      providers: [
        { provide: Platform, useValue: platformSpyObj },
        { provide: TerminalGestureService, useValue: gestureServiceSpyObj },
      ],
    }).compileComponents();

    // ResizeObserverのモック化
    (window as any).ResizeObserver = jasmine
      .createSpy('ResizeObserver')
      .and.returnValue({
        observe: jasmine.createSpy('observe'),
        unobserve: jasmine.createSpy('unobserve'),
        disconnect: jasmine.createSpy('disconnect'),
      });

    fixture = TestBed.createComponent(TerminalComponent);
    component = fixture.componentInstance;

    // terminalプロパティのモック
    (component as any).terminal = null;
    (component as any).fitAddon = null;
    (component as any).searchAddon = null;
    (component as any).webLinksAddon = null;
  });

  afterEach(() => {
    // テスト後のクリーンアップ
  });

  it('コンポーネントが作成できること', () => {
    expect(component).toBeTruthy();
  });

  describe('ライフサイクルフック', () => {
    it('isReadyが初期値でfalseであること', () => {
      expect(component.isReady()).toBe(false);
    });

    it('terminalSizeが初期値を持つこと', () => {
      expect(component.terminalSize()).toEqual({ cols: 80, rows: 24 });
    });

    it('sizeStringが正しく計算されること', () => {
      expect(component.sizeString()).toBe('80x24');
    });
  });

  describe('イベントエミッター', () => {
    it('ready EventEmitterが定義されていること', () => {
      expect(component.ready).toBeDefined();
      expect(component.ready instanceof EventEmitter).toBe(true);
    });

    it('terminalData EventEmitterが定義されていること', () => {
      expect(component.terminalData).toBeDefined();
      expect(component.terminalData instanceof EventEmitter).toBe(true);
    });

    it('terminalResize EventEmitterが定義されていること', () => {
      expect(component.terminalResize).toBeDefined();
      expect(component.terminalResize instanceof EventEmitter).toBe(true);
    });

    it('gesture EventEmitterが定義されていること', () => {
      expect(component.gesture).toBeDefined();
      expect(component.gesture instanceof EventEmitter).toBe(true);
    });
  });

  describe('オプション', () => {
    it('デフォルトオプションが設定されること', () => {
      expect(component.options).toBeDefined();
    });
  });

  describe('ViewChild要素', () => {
    it('terminalElementが定義されていること', () => {
      fixture.detectChanges();
      expect(component.terminalElement).toBeDefined();
    });
  });
});
