# プッシュ通知の実装方法調査

## 1. プッシュ通知の技術選択肢

### Firebase Cloud Messaging (FCM) - 推奨
最も広く使用されているプッシュ通知サービス。iOS/Android両対応。

#### 実装概要
```typescript
// Ionic/Capacitorでの実装
import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';

export class NotificationService {
  async initialize() {
    // 権限リクエスト
    const permission = await PushNotifications.requestPermissions();
    
    if (permission.receive === 'granted') {
      // デバイストークン取得
      await PushNotifications.register();
      
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        this.sendTokenToServer(token.value);
      });
      
      // 通知受信時の処理
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        this.handleNotification(notification);
      });
    }
  }
  
  async sendTokenToServer(token: string) {
    // バックエンドにトークンを送信
    await this.http.post('/api/device/register', { token });
  }
}
```

### WebSocket + Local Notifications
アプリがフォアグラウンドの場合の代替手段。

```typescript
export class WebSocketNotificationService {
  private socket: Socket;
  
  connect() {
    this.socket = io('wss://your-server.com');
    
    this.socket.on('claude-complete', (data) => {
      this.showLocalNotification(data);
    });
  }
  
  async showLocalNotification(data: any) {
    await LocalNotifications.schedule({
      notifications: [{
        title: 'Claude Code完了',
        body: `タスク「${data.taskName}」が完了しました`,
        id: Date.now(),
        sound: 'default',
        actionTypeId: 'OPEN_SESSION',
        extra: { sessionId: data.sessionId }
      }]
    });
  }
}
```

## 2. バックエンド実装

### Node.js FCMサーバー実装
```javascript
const admin = require('firebase-admin');

// Firebase Admin SDK初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

class NotificationManager {
  constructor() {
    this.deviceTokens = new Map(); // userId -> tokens[]
  }
  
  async sendNotification(userId, notification) {
    const tokens = this.deviceTokens.get(userId);
    if (!tokens || tokens.length === 0) return;
    
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        sessionId: notification.sessionId,
        type: notification.type,
        timestamp: Date.now().toString()
      },
      tokens: tokens
    };
    
    try {
      const response = await admin.messaging().sendMulticast(message);
      this.handleTokenErrors(userId, response);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
  
  handleTokenErrors(userId, response) {
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
          failedTokens.push(this.deviceTokens.get(userId)[idx]);
        }
      });
      // 無効なトークンを削除
      this.removeInvalidTokens(userId, failedTokens);
    }
  }
}
```

### Claude Code完了検知
```javascript
class ClaudeCompletionDetector {
  constructor(sshClient, notificationManager) {
    this.ssh = sshClient;
    this.notificationManager = notificationManager;
    this.activeSessions = new Map();
  }
  
  async monitorSession(sessionId, userId) {
    const checkInterval = setInterval(async () => {
      try {
        // Claude Codeの出力を確認
        const output = await this.getSessionOutput(sessionId);
        
        // 完了パターンを検出
        if (this.isTaskComplete(output)) {
          clearInterval(checkInterval);
          
          // 通知送信
          await this.notificationManager.sendNotification(userId, {
            title: 'Claude Code タスク完了',
            body: this.extractTaskSummary(output),
            sessionId: sessionId,
            type: 'task_complete'
          });
          
          this.activeSessions.delete(sessionId);
        }
      } catch (error) {
        console.error(`Error monitoring session ${sessionId}:`, error);
      }
    }, 5000); // 5秒ごとにチェック
    
    this.activeSessions.set(sessionId, checkInterval);
  }
  
  isTaskComplete(output) {
    // Claude Codeの完了パターンを検出
    const completionPatterns = [
      /Task completed successfully/i,
      /All tests passed/i,
      /Build succeeded/i,
      /Done\. Let me know/i,
      /✓ Completed/i
    ];
    
    return completionPatterns.some(pattern => pattern.test(output));
  }
  
  extractTaskSummary(output) {
    // 出力から要約を抽出
    const lines = output.split('\n');
    const relevantLines = lines.slice(-10); // 最後の10行
    return relevantLines.join(' ').substring(0, 100) + '...';
  }
}
```

## 3. 通知タイプと実装

### 通知タイプ定義
```typescript
enum NotificationType {
  TASK_COMPLETE = 'task_complete',
  ERROR_OCCURRED = 'error_occurred',
  BUILD_FAILED = 'build_failed',
  TESTS_PASSED = 'tests_passed',
  PR_CREATED = 'pr_created',
  LONG_RUNNING_TASK = 'long_running_task'
}

interface ClaudeNotification {
  type: NotificationType;
  title: string;
  body: string;
  sessionId: string;
  priority: 'high' | 'normal' | 'low';
  actions?: NotificationAction[];
  data?: any;
}
```

### 高度な通知機能
```typescript
export class AdvancedNotificationService {
  async sendRichNotification(notification: ClaudeNotification) {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        image: 'https://your-server.com/claude-icon.png'
      },
      data: {
        type: notification.type,
        sessionId: notification.sessionId,
        priority: notification.priority
      },
      android: {
        priority: notification.priority === 'high' ? 'high' : 'normal',
        notification: {
          channelId: 'claude-notifications',
          actions: notification.actions?.map(a => ({
            title: a.title,
            pressAction: { id: a.id }
          }))
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body
            },
            badge: 1,
            sound: 'default',
            category: 'CLAUDE_CATEGORY'
          }
        }
      }
    };
    
    return await admin.messaging().send(message);
  }
}
```

## 4. Ionicアプリでの通知処理

### 通知タップ処理
```typescript
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  constructor(
    private router: Router,
    private sessionService: SessionService
  ) {
    this.initializeNotificationHandlers();
  }
  
  initializeNotificationHandlers() {
    // 通知タップ時の処理
    PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
      const data = action.notification.data;
      
      if (data.sessionId) {
        // 該当セッションに遷移
        await this.router.navigate(['/session', data.sessionId]);
        await this.sessionService.activateSession(data.sessionId);
      }
    });
  }
}
```

### バックグラウンドでの通知処理
```typescript
// バックグラウンドサービスワーカー
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/assets/icon/claude-icon.png',
    badge: '/assets/icon/badge.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      { action: 'view', title: '表示' },
      { action: 'dismiss', title: '閉じる' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
```

## 5. 通知設定とユーザー設定

### ユーザー設定管理
```typescript
interface NotificationPreferences {
  enabled: boolean;
  types: {
    taskComplete: boolean;
    errors: boolean;
    longRunning: boolean;
    buildStatus: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export class NotificationPreferenceService {
  async updatePreferences(preferences: NotificationPreferences) {
    await this.storage.set('notification_preferences', preferences);
    await this.syncWithServer(preferences);
  }
  
  shouldSendNotification(type: NotificationType): boolean {
    const prefs = this.getPreferences();
    if (!prefs.enabled) return false;
    
    // 静音時間チェック
    if (prefs.quietHours.enabled && this.isQuietHour()) {
      return false;
    }
    
    // タイプ別設定チェック
    return prefs.types[type] ?? true;
  }
}
```

## 6. エラーハンドリングとフォールバック

```javascript
class RobustNotificationService {
  async sendNotificationWithFallback(userId, notification) {
    try {
      // プライマリ: FCM
      await this.sendFCMNotification(userId, notification);
    } catch (fcmError) {
      console.error('FCM failed:', fcmError);
      
      try {
        // フォールバック: WebSocket
        await this.sendWebSocketNotification(userId, notification);
      } catch (wsError) {
        console.error('WebSocket failed:', wsError);
        
        // 最終フォールバック: メール通知
        await this.sendEmailNotification(userId, notification);
      }
    }
  }
}
```

## 推奨実装

1. **Firebase Cloud Messaging (FCM)** を主要な通知システムとして使用
2. **WebSocket** をリアルタイム更新とフォールバックに使用
3. **Local Notifications** でアプリ内通知を補完
4. **ユーザー設定** で柔軟な通知制御を提供
5. **エラーハンドリング** で確実な通知配信を保証