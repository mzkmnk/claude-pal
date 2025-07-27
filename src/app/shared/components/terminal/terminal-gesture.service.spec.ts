import { TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { GestureController, Platform } from '@ionic/angular';
import { TerminalGestureService } from './terminal-gesture.service';

describe('TerminalGestureService', () => {
  let service: TerminalGestureService;
  let gestureController: GestureController;
  let platform: Platform;
  let mockElement: ElementRef<HTMLElement>;
  let mockGesture: any;

  beforeEach(() => {
    // モックジェスチャーオブジェクト
    mockGesture = {
      enable: jest.fn(),
      destroy: jest.fn(),
    };

    // GestureControllerのモック
    const gestureControllerMock = {
      create: jest.fn().mockReturnValue(mockGesture),
    };

    // Platformのモック
    const platformMock = {
      is: jest.fn().mockReturnValue(false),
    };

    // ElementRefのモック
    mockElement = {
      nativeElement: document.createElement('div'),
    };

    TestBed.configureTestingModule({
      providers: [
        TerminalGestureService,
        { provide: GestureController, useValue: gestureControllerMock },
        { provide: Platform, useValue: platformMock },
      ],
    });

    service = TestBed.inject(TerminalGestureService);
    gestureController = TestBed.inject(GestureController);
    platform = TestBed.inject(Platform);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('サービスが作成できること', () => {
    expect(service).toBeTruthy();
  });

  describe('createGestures', () => {
    it('iOS以外のプラットフォームではジェスチャーが作成されないこと', () => {
      const onGesture = jest.fn();
      const result = service.createGestures(mockElement, onGesture);

      expect(gestureController.create).not.toHaveBeenCalled();
      expect(result.destroy).toBeDefined();
    });

    it('iOSプラットフォームでジェスチャーが作成されること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();

      const result = service.createGestures(mockElement, onGesture);

      // ピンチとスワイプジェスチャーが作成される
      expect(gestureController.create).toHaveBeenCalledTimes(2);
      expect(mockGesture.enable).toHaveBeenCalledTimes(2);
      expect(result.destroy).toBeDefined();
    });

    it('destroyメソッドがすべてのジェスチャーを破棄すること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();

      const result = service.createGestures(mockElement, onGesture);
      result.destroy();

      expect(mockGesture.destroy).toHaveBeenCalledTimes(2);
    });
  });

  describe('ピンチジェスチャー', () => {
    it('ピンチジェスチャーが正しく設定されること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();

      service.createGestures(mockElement, onGesture);

      const createCall = (gestureController.create as jest.Mock).mock
        .calls[0][0];
      expect(createCall.gestureName).toBe('pinch');
      expect(createCall.threshold).toBe(0);
      expect(createCall.onStart).toBeDefined();
      expect(createCall.onMove).toBeDefined();
    });

    it('ピンチのonMoveイベントが正しく処理されること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();

      service.createGestures(mockElement, onGesture);

      const createCall = (gestureController.create as jest.Mock).mock
        .calls[0][0];
      createCall.onStart();

      // スケール変更をシミュレート
      createCall.onMove({ currentX: 200, startX: 100 });

      expect(onGesture).toHaveBeenCalledWith({
        type: 'pinch',
        scale: 2,
      });
    });

    it('小さなスケール変更は無視されること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();

      service.createGestures(mockElement, onGesture);

      const createCall = (gestureController.create as jest.Mock).mock
        .calls[0][0];
      createCall.onStart();

      // 小さなスケール変更
      createCall.onMove({ currentX: 105, startX: 100 });

      expect(onGesture).not.toHaveBeenCalled();
    });
  });

  describe('スワイプジェスチャー', () => {
    it('スワイプジェスチャーが正しく設定されること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();

      service.createGestures(mockElement, onGesture);

      const createCall = (gestureController.create as jest.Mock).mock
        .calls[1][0];
      expect(createCall.gestureName).toBe('swipe');
      expect(createCall.threshold).toBe(15);
      expect(createCall.onEnd).toBeDefined();
    });

    it('右スワイプが検出されること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();

      service.createGestures(mockElement, onGesture);

      const createCall = (gestureController.create as jest.Mock).mock
        .calls[1][0];
      createCall.onEnd({ deltaX: 100, deltaY: 10 });

      expect(onGesture).toHaveBeenCalledWith({
        type: 'swipe',
        direction: 'right',
      });
    });

    it('左スワイプが検出されること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();

      service.createGestures(mockElement, onGesture);

      const createCall = (gestureController.create as jest.Mock).mock
        .calls[1][0];
      createCall.onEnd({ deltaX: -100, deltaY: 10 });

      expect(onGesture).toHaveBeenCalledWith({
        type: 'swipe',
        direction: 'left',
      });
    });

    it('上スワイプが検出されること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();

      service.createGestures(mockElement, onGesture);

      const createCall = (gestureController.create as jest.Mock).mock
        .calls[1][0];
      createCall.onEnd({ deltaX: 10, deltaY: -100 });

      expect(onGesture).toHaveBeenCalledWith({
        type: 'swipe',
        direction: 'up',
      });
    });

    it('下スワイプが検出されること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();

      service.createGestures(mockElement, onGesture);

      const createCall = (gestureController.create as jest.Mock).mock
        .calls[1][0];
      createCall.onEnd({ deltaX: 10, deltaY: 100 });

      expect(onGesture).toHaveBeenCalledWith({
        type: 'swipe',
        direction: 'down',
      });
    });

    it('短いスワイプは無視されること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();

      service.createGestures(mockElement, onGesture);

      const createCall = (gestureController.create as jest.Mock).mock
        .calls[1][0];
      createCall.onEnd({ deltaX: 30, deltaY: 30 });

      expect(onGesture).not.toHaveBeenCalled();
    });
  });

  describe('ダブルタップジェスチャー', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('ダブルタップが検出されること', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();
      const addEventListenerSpy = jest.spyOn(
        mockElement.nativeElement,
        'addEventListener'
      );

      service.createGestures(mockElement, onGesture);

      const touchHandler = addEventListenerSpy.mock
        .calls[0][1] as EventListener;

      // 最初のタップ
      const firstTap = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      touchHandler(firstTap);

      // 200ms後に2回目のタップ
      jest.advanceTimersByTime(200);
      const secondTap = new TouchEvent('touchstart', {
        touches: [{ clientX: 105, clientY: 105 } as Touch],
      });
      touchHandler(secondTap);

      expect(onGesture).toHaveBeenCalledWith({
        type: 'doubletap',
        x: 105,
        y: 105,
      });
    });

    it('タップ間隔が長い場合はダブルタップとして検出されないこと', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();
      const addEventListenerSpy = jest.spyOn(
        mockElement.nativeElement,
        'addEventListener'
      );

      service.createGestures(mockElement, onGesture);

      const touchHandler = addEventListenerSpy.mock
        .calls[0][1] as EventListener;

      // 最初のタップ
      const firstTap = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      touchHandler(firstTap);

      // 400ms後に2回目のタップ（閾値を超える）
      jest.advanceTimersByTime(400);
      const secondTap = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      touchHandler(secondTap);

      expect(onGesture).not.toHaveBeenCalled();
    });

    it('タップ位置が離れている場合はダブルタップとして検出されないこと', () => {
      (platform.is as jest.Mock).mockReturnValue(true);
      const onGesture = jest.fn();
      const addEventListenerSpy = jest.spyOn(
        mockElement.nativeElement,
        'addEventListener'
      );

      service.createGestures(mockElement, onGesture);

      const touchHandler = addEventListenerSpy.mock
        .calls[0][1] as EventListener;

      // 最初のタップ
      const firstTap = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      touchHandler(firstTap);

      // 200ms後に離れた位置でタップ
      jest.advanceTimersByTime(200);
      const secondTap = new TouchEvent('touchstart', {
        touches: [{ clientX: 150, clientY: 150 } as Touch],
      });
      touchHandler(secondTap);

      expect(onGesture).not.toHaveBeenCalled();
    });
  });

  describe('createThreeFingerSwipe', () => {
    it('3本指スワイプが検出されること', () => {
      const onGesture = jest.fn();
      const addEventListenerSpy = jest.spyOn(
        mockElement.nativeElement,
        'addEventListener'
      );

      const result = service.createThreeFingerSwipe(mockElement, onGesture);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: true }
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        { passive: true }
      );

      const touchStartHandler = addEventListenerSpy.mock
        .calls[0][1] as EventListener;
      const touchEndHandler = addEventListenerSpy.mock
        .calls[1][1] as EventListener;

      // 3本指タッチ開始
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          { clientX: 100 } as Touch,
          { clientX: 150 } as Touch,
          { clientX: 200 } as Touch,
        ],
      });
      touchStartHandler(touchStart);

      // 右スワイプ
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [
          { clientX: 250 } as Touch,
          { clientX: 300 } as Touch,
          { clientX: 350 } as Touch,
        ],
      });
      touchEndHandler(touchEnd);

      expect(onGesture).toHaveBeenCalledWith('right');
    });

    it('左への3本指スワイプが検出されること', () => {
      const onGesture = jest.fn();
      const addEventListenerSpy = jest.spyOn(
        mockElement.nativeElement,
        'addEventListener'
      );

      service.createThreeFingerSwipe(mockElement, onGesture);

      const touchStartHandler = addEventListenerSpy.mock
        .calls[0][1] as EventListener;
      const touchEndHandler = addEventListenerSpy.mock
        .calls[1][1] as EventListener;

      // 3本指タッチ開始
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          { clientX: 250 } as Touch,
          { clientX: 300 } as Touch,
          { clientX: 350 } as Touch,
        ],
      });
      touchStartHandler(touchStart);

      // 左スワイプ
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [
          { clientX: 100 } as Touch,
          { clientX: 150 } as Touch,
          { clientX: 200 } as Touch,
        ],
      });
      touchEndHandler(touchEnd);

      expect(onGesture).toHaveBeenCalledWith('left');
    });

    it('destroyメソッドがイベントリスナーを削除すること', () => {
      const onGesture = jest.fn();
      const removeEventListenerSpy = jest.spyOn(
        mockElement.nativeElement,
        'removeEventListener'
      );

      const result = service.createThreeFingerSwipe(mockElement, onGesture);
      result.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2);
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function)
      );
    });
  });
});
