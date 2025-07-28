import { TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { GestureController, Platform } from '@ionic/angular';
import { TerminalGestureService } from './terminal-gesture.service';

describe('TerminalGestureService', () => {
  let service: TerminalGestureService;
  let gestureController: jasmine.SpyObj<GestureController>;
  let platform: jasmine.SpyObj<Platform>;
  let mockElement: ElementRef<HTMLElement>;
  let mockGesture: any;

  beforeEach(() => {
    // モックジェスチャーオブジェクト
    mockGesture = {
      enable: jasmine.createSpy('enable'),
      destroy: jasmine.createSpy('destroy'),
    };

    // GestureControllerのモック
    const gestureControllerSpy = jasmine.createSpyObj('GestureController', [
      'create',
    ]);
    gestureControllerSpy.create.and.returnValue(mockGesture);

    // Platformのモック
    const platformSpy = jasmine.createSpyObj('Platform', ['is']);
    platformSpy.is.and.returnValue(false);

    // ElementRefのモック
    mockElement = {
      nativeElement: document.createElement('div'),
    };

    TestBed.configureTestingModule({
      providers: [
        TerminalGestureService,
        { provide: GestureController, useValue: gestureControllerSpy },
        { provide: Platform, useValue: platformSpy },
      ],
    });

    service = TestBed.inject(TerminalGestureService);
    gestureController = TestBed.inject(
      GestureController
    ) as jasmine.SpyObj<GestureController>;
    platform = TestBed.inject(Platform) as jasmine.SpyObj<Platform>;
  });

  it('サービスが作成できること', () => {
    expect(service).toBeTruthy();
  });

  describe('createGestures', () => {
    it('iOS以外のプラットフォームではジェスチャーが作成されないこと', () => {
      const onGesture = jasmine.createSpy('onGesture');
      const result = service.createGestures(mockElement, onGesture);

      expect(gestureController.create).not.toHaveBeenCalled();
      expect(result.destroy).toBeDefined();
    });

    it('iOSプラットフォームでジェスチャーが作成されること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');

      const result = service.createGestures(mockElement, onGesture);

      // ピンチとスワイプジェスチャーが作成される
      expect(gestureController.create).toHaveBeenCalledTimes(2);
      expect(mockGesture.enable).toHaveBeenCalledTimes(2);
      expect(result.destroy).toBeDefined();
    });

    it('destroyメソッドがすべてのジェスチャーを破棄すること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');

      const result = service.createGestures(mockElement, onGesture);
      result.destroy();

      expect(mockGesture.destroy).toHaveBeenCalledTimes(2);
    });
  });

  describe('ピンチジェスチャー', () => {
    it('ピンチジェスチャーが正しく設定されること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');

      service.createGestures(mockElement, onGesture);

      const createCall = gestureController.create.calls.argsFor(0)[0];
      expect(createCall.gestureName).toBe('pinch');
      expect(createCall.threshold).toBe(0);
      expect(createCall.onStart).toBeDefined();
      expect(createCall.onMove).toBeDefined();
    });

    it('ピンチのonMoveイベントが正しく処理されること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');

      service.createGestures(mockElement, onGesture);

      const createCall = gestureController.create.calls.argsFor(0)[0];
      if (createCall.onStart) {
        createCall.onStart({} as any);
      }

      // スケール変更をシミュレート
      if (createCall.onMove) {
        createCall.onMove({ currentX: 200, startX: 100 } as any);
      }

      expect(onGesture).toHaveBeenCalledWith({
        type: 'pinch',
        scale: 2,
      });
    });

    it('小さなスケール変更は無視されること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');

      service.createGestures(mockElement, onGesture);

      const createCall = gestureController.create.calls.argsFor(0)[0];
      if (createCall.onStart) {
        createCall.onStart({} as any);
      }

      // 小さなスケール変更
      if (createCall.onMove) {
        createCall.onMove({ currentX: 105, startX: 100 } as any);
      }

      expect(onGesture).not.toHaveBeenCalled();
    });
  });

  describe('スワイプジェスチャー', () => {
    it('スワイプジェスチャーが正しく設定されること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');

      service.createGestures(mockElement, onGesture);

      const createCall = gestureController.create.calls.argsFor(1)[0];
      expect(createCall.gestureName).toBe('swipe');
      expect(createCall.threshold).toBe(15);
      expect(createCall.onEnd).toBeDefined();
    });

    it('右スワイプが検出されること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');

      service.createGestures(mockElement, onGesture);

      const createCall = gestureController.create.calls.argsFor(1)[0];
      if (createCall.onEnd) {
        createCall.onEnd({ deltaX: 100, deltaY: 10 } as any);
      }

      expect(onGesture).toHaveBeenCalledWith({
        type: 'swipe',
        direction: 'right',
      });
    });

    it('左スワイプが検出されること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');

      service.createGestures(mockElement, onGesture);

      const createCall = gestureController.create.calls.argsFor(1)[0];
      if (createCall.onEnd) {
        createCall.onEnd({ deltaX: -100, deltaY: 10 } as any);
      }

      expect(onGesture).toHaveBeenCalledWith({
        type: 'swipe',
        direction: 'left',
      });
    });

    it('上スワイプが検出されること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');

      service.createGestures(mockElement, onGesture);

      const createCall = gestureController.create.calls.argsFor(1)[0];
      if (createCall.onEnd) {
        createCall.onEnd({ deltaX: 10, deltaY: -100 } as any);
      }

      expect(onGesture).toHaveBeenCalledWith({
        type: 'swipe',
        direction: 'up',
      });
    });

    it('下スワイプが検出されること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');

      service.createGestures(mockElement, onGesture);

      const createCall = gestureController.create.calls.argsFor(1)[0];
      if (createCall.onEnd) {
        createCall.onEnd({ deltaX: 10, deltaY: 100 } as any);
      }

      expect(onGesture).toHaveBeenCalledWith({
        type: 'swipe',
        direction: 'down',
      });
    });

    it('短いスワイプは無視されること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');

      service.createGestures(mockElement, onGesture);

      const createCall = gestureController.create.calls.argsFor(1)[0];
      if (createCall.onEnd) {
        createCall.onEnd({ deltaX: 30, deltaY: 30 } as any);
      }

      expect(onGesture).not.toHaveBeenCalled();
    });
  });

  describe('ダブルタップジェスチャー', () => {
    let currentTime: number;

    beforeEach(() => {
      jasmine.clock().install();
      currentTime = 1000;
      spyOn(Date, 'now').and.callFake(() => currentTime);
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('ダブルタップが検出されること', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');
      const addEventListenerSpy = spyOn(
        mockElement.nativeElement,
        'addEventListener'
      ).and.callThrough();

      service.createGestures(mockElement, onGesture);

      // addEventListenerがtouchstartイベントで呼ばれていることを確認
      const touchstartCalls = addEventListenerSpy.calls
        .allArgs()
        .filter(args => args[0] === 'touchstart');
      expect(touchstartCalls.length).toBeGreaterThan(0);

      const touchHandler = touchstartCalls[0][1] as EventListener;

      // 最初のタップ
      const firstTap = {
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: jasmine.createSpy('preventDefault'),
      } as any;
      touchHandler(firstTap);

      // 200ms後に2回目のタップ
      currentTime += 200;
      const secondTap = {
        touches: [{ clientX: 105, clientY: 105 }],
        preventDefault: jasmine.createSpy('preventDefault'),
      } as any;
      touchHandler(secondTap);

      expect(onGesture).toHaveBeenCalledWith({
        type: 'doubletap',
        x: 105,
        y: 105,
      });
    });

    it('タップ間隔が長い場合はダブルタップとして検出されないこと', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');
      const addEventListenerSpy = spyOn(
        mockElement.nativeElement,
        'addEventListener'
      ).and.callThrough();

      service.createGestures(mockElement, onGesture);

      const touchstartCalls = addEventListenerSpy.calls
        .allArgs()
        .filter(args => args[0] === 'touchstart');
      const touchHandler = touchstartCalls[0][1] as EventListener;

      // 最初のタップ
      const firstTap = {
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: jasmine.createSpy('preventDefault'),
      } as any;
      touchHandler(firstTap);

      // onGestureが呼ばれていないことを確認
      expect(onGesture).not.toHaveBeenCalled();

      // 301ms後に2回目のタップ（閾値をちょうど超える）
      currentTime += 301;
      const secondTap = {
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: jasmine.createSpy('preventDefault'),
      } as any;
      touchHandler(secondTap);

      // 301msは300msの閾値を超えているので、ダブルタップとして検出されない
      expect(onGesture).not.toHaveBeenCalled();
      expect(secondTap.preventDefault).not.toHaveBeenCalled();
    });

    it('タップ位置が離れている場合はダブルタップとして検出されないこと', () => {
      platform.is.and.returnValue(true);
      const onGesture = jasmine.createSpy('onGesture');
      const addEventListenerSpy = spyOn(
        mockElement.nativeElement,
        'addEventListener'
      ).and.callThrough();

      service.createGestures(mockElement, onGesture);

      const touchstartCalls = addEventListenerSpy.calls
        .allArgs()
        .filter(args => args[0] === 'touchstart');
      const touchHandler = touchstartCalls[0][1] as EventListener;

      // 最初のタップ
      const firstTap = {
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: jasmine.createSpy('preventDefault'),
      } as any;
      touchHandler(firstTap);

      // 200ms後に離れた位置でタップ
      currentTime += 200;
      const secondTap = {
        touches: [{ clientX: 150, clientY: 150 }],
        preventDefault: jasmine.createSpy('preventDefault'),
      } as any;
      touchHandler(secondTap);

      expect(onGesture).not.toHaveBeenCalled();
    });
  });

  describe('createThreeFingerSwipe', () => {
    it('3本指スワイプが検出されること', () => {
      const onGesture = jasmine.createSpy('onGesture');
      const addEventListenerSpy = spyOn(
        mockElement.nativeElement,
        'addEventListener'
      ).and.callThrough();

      service.createThreeFingerSwipe(mockElement, onGesture);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        jasmine.any(Function),
        { passive: true }
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchend',
        jasmine.any(Function),
        { passive: true }
      );

      const touchStartHandler = addEventListenerSpy.calls.argsFor(
        0
      )[1] as EventListener;
      const touchEndHandler = addEventListenerSpy.calls.argsFor(
        1
      )[1] as EventListener;

      // 3本指タッチ開始
      const touchStart = {
        touches: [{ clientX: 100 }, { clientX: 150 }, { clientX: 200 }],
      } as any;
      touchStartHandler(touchStart);

      // 右スワイプ
      const touchEnd = {
        changedTouches: [{ clientX: 250 }, { clientX: 300 }, { clientX: 350 }],
      } as any;
      touchEndHandler(touchEnd);

      expect(onGesture).toHaveBeenCalledWith('right');
    });

    it('左への3本指スワイプが検出されること', () => {
      const onGesture = jasmine.createSpy('onGesture');
      const addEventListenerSpy = spyOn(
        mockElement.nativeElement,
        'addEventListener'
      ).and.callThrough();

      service.createThreeFingerSwipe(mockElement, onGesture);

      const touchStartHandler = addEventListenerSpy.calls.argsFor(
        0
      )[1] as EventListener;
      const touchEndHandler = addEventListenerSpy.calls.argsFor(
        1
      )[1] as EventListener;

      // 3本指タッチ開始
      const touchStart = {
        touches: [{ clientX: 250 }, { clientX: 300 }, { clientX: 350 }],
      } as any;
      touchStartHandler(touchStart);

      // 左スワイプ
      const touchEnd = {
        changedTouches: [{ clientX: 100 }, { clientX: 150 }, { clientX: 200 }],
      } as any;
      touchEndHandler(touchEnd);

      expect(onGesture).toHaveBeenCalledWith('left');
    });

    it('destroyメソッドがイベントリスナーを削除すること', () => {
      const onGesture = jasmine.createSpy('onGesture');
      const removeEventListenerSpy = spyOn(
        mockElement.nativeElement,
        'removeEventListener'
      ).and.callThrough();

      const result = service.createThreeFingerSwipe(mockElement, onGesture);
      result.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2);
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        jasmine.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchend',
        jasmine.any(Function)
      );
    });
  });
});
