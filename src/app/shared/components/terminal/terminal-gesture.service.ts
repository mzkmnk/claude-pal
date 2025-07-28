import { Injectable, ElementRef, inject } from '@angular/core';
import { GestureController, Platform } from '@ionic/angular';

/**
 * ジェスチャーイベントのデータ
 * @interface GestureEventData
 */
export interface GestureEventData {
  /** ジェスチャーのタイプ */
  type: 'swipe' | 'pinch' | 'tap' | 'doubletap';
  /** スワイプの方向（スワイプの場合のみ） */
  direction?: 'left' | 'right' | 'up' | 'down';
  /** ピンチのスケール（ピンチの場合のみ） */
  scale?: number;
  /** タップの座標 */
  x?: number;
  y?: number;
}

/**
 * ターミナル用のジェスチャー処理サービス
 *
 * iOSデバイスでのジェスチャー操作を管理し、
 * ターミナルの操作性を向上させます。
 *
 * @service TerminalGestureService
 * @example
 * ```typescript
 * const gestures = this.gestureService.createGestures(element);
 * gestures.onGesture.subscribe(event => {
 *   if (event.type === 'pinch') {
 *     this.updateFontSize(event.scale);
 *   }
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class TerminalGestureService {
  private gestureController = inject(GestureController);
  private platform = inject(Platform);

  /**
   * ターミナル要素にジェスチャーを設定する
   * @param {ElementRef<HTMLElement>} element - ターミナル要素
   * @param {Function} onGesture - ジェスチャーイベントのコールバック
   * @returns {{ destroy: Function }} クリーンアップ用のオブジェクト
   * @public
   */
  createGestures(
    element: ElementRef<HTMLElement>,
    onGesture: (event: GestureEventData) => void
  ): { destroy: () => void } {
    const gestures: any[] = [];

    // iOSのみジェスチャーを有効化
    if (this.platform.is('ios')) {
      // ピンチジェスチャー（フォントサイズ変更）
      const pinchGesture = this.createPinchGesture(element, onGesture);
      if (pinchGesture) {
        pinchGesture.enable();
        gestures.push(pinchGesture);
      }

      // スワイプジェスチャー（履歴ナビゲーション）
      const swipeGesture = this.createSwipeGesture(element, onGesture);
      if (swipeGesture) {
        swipeGesture.enable();
        gestures.push(swipeGesture);
      }

      // ダブルタップジェスチャー（全画面切り替え）
      const doubleTapGesture = this.createDoubleTapGesture(element, onGesture);
      if (doubleTapGesture) {
        gestures.push(doubleTapGesture);
      }
    }

    return {
      destroy: () => {
        gestures.forEach(gesture => {
          if (gesture.destroy) {
            gesture.destroy();
          }
        });
      },
    };
  }

  /**
   * ピンチジェスチャーを作成する
   * @private
   */
  private createPinchGesture(
    element: ElementRef<HTMLElement>,
    onGesture: (event: GestureEventData) => void
  ): any {
    let lastScale = 1;

    return this.gestureController.create({
      el: element.nativeElement,
      threshold: 0,
      gestureName: 'pinch',
      onStart: () => {
        lastScale = 1;
      },
      onMove: detail => {
        const scale = detail.currentX / detail.startX;
        if (Math.abs(scale - lastScale) > 0.1) {
          onGesture({
            type: 'pinch',
            scale: scale,
          });
          lastScale = scale;
        }
      },
    });
  }

  /**
   * スワイプジェスチャーを作成する
   * @private
   */
  private createSwipeGesture(
    element: ElementRef<HTMLElement>,
    onGesture: (event: GestureEventData) => void
  ): any {
    return this.gestureController.create({
      el: element.nativeElement,
      threshold: 15,
      gestureName: 'swipe',
      onEnd: detail => {
        const deltaX = detail.deltaX;
        const deltaY = detail.deltaY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // 最小スワイプ距離
        const minSwipeDistance = 50;

        if (absX > minSwipeDistance || absY > minSwipeDistance) {
          let direction: 'left' | 'right' | 'up' | 'down';

          if (absX > absY) {
            direction = deltaX > 0 ? 'right' : 'left';
          } else {
            direction = deltaY > 0 ? 'down' : 'up';
          }

          onGesture({
            type: 'swipe',
            direction: direction,
          });
        }
      },
    });
  }

  /**
   * ダブルタップジェスチャーを作成する
   * @private
   */
  private createDoubleTapGesture(
    element: ElementRef<HTMLElement>,
    onGesture: (event: GestureEventData) => void
  ): { destroy: () => void } {
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    const doubleTapThreshold = 300; // ミリ秒
    const tapDistanceThreshold = 20; // ピクセル

    const handleTap = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      const currentTime = Date.now();
      const timeDiff = currentTime - lastTapTime;
      const distanceX = Math.abs(touch.clientX - lastTapX);
      const distanceY = Math.abs(touch.clientY - lastTapY);

      if (
        timeDiff < doubleTapThreshold &&
        distanceX < tapDistanceThreshold &&
        distanceY < tapDistanceThreshold
      ) {
        // ダブルタップ検出
        event.preventDefault();
        onGesture({
          type: 'doubletap',
          x: touch.clientX,
          y: touch.clientY,
        });
        lastTapTime = 0; // リセット
      } else {
        // シングルタップ
        lastTapTime = currentTime;
        lastTapX = touch.clientX;
        lastTapY = touch.clientY;
      }
    };

    element.nativeElement.addEventListener('touchstart', handleTap, {
      passive: false,
    });

    return {
      destroy: () => {
        element.nativeElement.removeEventListener('touchstart', handleTap);
      },
    };
  }

  /**
   * 3本指スワイプジェスチャーを作成する（iOS特有）
   * @param {ElementRef<HTMLElement>} element - ターミナル要素
   * @param {Function} onGesture - ジェスチャーイベントのコールバック
   * @returns {{ destroy: Function }} クリーンアップ用のオブジェクト
   * @public
   */
  createThreeFingerSwipe(
    element: ElementRef<HTMLElement>,
    onGesture: (direction: 'left' | 'right') => void
  ): { destroy: () => void } {
    let startX = 0;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 3) {
        startX = event.touches[0].clientX;
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.changedTouches.length === 3) {
        const endX = event.changedTouches[0].clientX;
        const deltaX = endX - startX;

        if (Math.abs(deltaX) > 100) {
          onGesture(deltaX > 0 ? 'right' : 'left');
        }
      }
    };

    element.nativeElement.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    element.nativeElement.addEventListener('touchend', handleTouchEnd, {
      passive: true,
    });

    return {
      destroy: () => {
        element.nativeElement.removeEventListener(
          'touchstart',
          handleTouchStart
        );
        element.nativeElement.removeEventListener('touchend', handleTouchEnd);
      },
    };
  }
}
