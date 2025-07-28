import { Component, ViewChild, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonInput,
  IonTextarea,
  IonToggle,
  IonSegment,
  IonSegmentButton,
  ToastController,
  IonSelect,
  IonSelectOption,
  LoadingController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline,
  trashOutline,
  refreshOutline,
  keyOutline,
  lockClosedOutline,
  copyOutline,
  send,
  terminal,
  close,
} from 'ionicons/icons';

import {
  ProfileStorageService,
  AppSettingsService,
  EncryptionService,
  MigrationService,
} from '../core/services';
import { ConnectionProfile, AppSettings } from '../core/models';
import {
  MessageComponent,
  Message,
  MessageType,
} from '../shared/components/message';
import { TerminalComponent } from '../shared/components/terminal/terminal.component';
import { SSH } from '../core/plugins/ssh-plugin';
import type { PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonInput,
    IonTextarea,
    IonToggle,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    MessageComponent,
    TerminalComponent,
  ],
})
export class Tab3Page implements OnDestroy {
  @ViewChild(TerminalComponent) terminalComponent!: TerminalComponent;

  private profileStorage = inject(ProfileStorageService);
  private appSettings = inject(AppSettingsService);
  private encryption = inject(EncryptionService);
  private migration = inject(MigrationService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);
  private alertController = inject(AlertController);

  selectedTab = 'ssh';

  // メッセージ関連
  demoMessages: Message[] = [];
  newMessageContent = '';
  private messageIdCounter = 1;

  // プロファイル関連
  profiles: ConnectionProfile[] = [];
  newProfile = {
    name: '',
    host: '',
    port: 22,
    username: '',
  };

  // 設定関連
  settings: AppSettings | null = null;

  // 暗号化関連
  encryptData = {
    plainText: '',
    password: '',
    encrypted: '',
    decrypted: '',
  };

  // マイグレーション関連
  currentVersion = '';

  // SSH接続関連
  connectionForm = {
    host: '192.168.1.100',
    port: 22,
    username: 'user',
    authType: 'password' as 'password' | 'key',
    password: '',
    privateKey: '',
    passphrase: '',
  };
  sessionId: string | null = null;
  isConnected = false;
  private dataListener: PluginListenerHandle | null = null;
  private stateListener: PluginListenerHandle | null = null;

  constructor() {
    addIcons({
      saveOutline,
      trashOutline,
      refreshOutline,
      keyOutline,
      lockClosedOutline,
      copyOutline,
      send,
      terminal,
      close,
    });
    this.loadData();
    this.initializeDemoMessages();
  }

  async loadData() {
    await this.loadProfiles();
    await this.loadSettings();
    await this.loadVersion();
  }

  // プロファイル管理
  async loadProfiles() {
    this.profiles = await this.profileStorage.getAllProfiles();
  }

  async saveProfile() {
    if (
      !this.newProfile.name ||
      !this.newProfile.host ||
      !this.newProfile.username
    ) {
      await this.showToast(
        'すべての必須フィールドを入力してください',
        'warning'
      );
      return;
    }

    const profile = await this.profileStorage.saveProfile({
      ...this.newProfile,
      authType: 'password',
    });

    await this.showToast(`プロファイル「${profile.name}」を保存しました`);
    this.newProfile = { name: '', host: '', port: 22, username: '' };
    await this.loadProfiles();
  }

  async deleteProfile(profile: ConnectionProfile) {
    await this.profileStorage.deleteProfile(profile.id);
    await this.showToast(`プロファイル「${profile.name}」を削除しました`);
    await this.loadProfiles();
  }

  async markProfileAsUsed(profile: ConnectionProfile) {
    await this.profileStorage.markAsUsed(profile.id);
    await this.showToast(
      `プロファイル「${profile.name}」を使用済みとしてマーク`
    );
    await this.loadProfiles();
  }

  // 設定管理
  async loadSettings() {
    this.settings = await this.appSettings.getSettings();
  }

  async updateTheme(event: any) {
    const theme = event.detail.value as AppSettings['theme'];
    await this.appSettings.updateSettings({ theme });
    await this.showToast(`テーマを「${theme}」に変更しました`);
    await this.loadSettings();
  }

  async toggleBiometric() {
    if (this.settings) {
      await this.appSettings.updateSettings({
        security: {
          ...this.settings.security,
          biometricAuthEnabled: !this.settings.security.biometricAuthEnabled,
        },
      });
      await this.loadSettings();
    }
  }

  async resetSettings() {
    await this.appSettings.resetSettings();
    await this.showToast('設定をリセットしました');
    await this.loadSettings();
  }

  // 暗号化機能
  async encrypt() {
    if (!this.encryptData.plainText || !this.encryptData.password) {
      await this.showToast('テキストとパスワードを入力してください', 'warning');
      return;
    }

    try {
      this.encryptData.encrypted = await this.encryption.encrypt(
        this.encryptData.plainText,
        this.encryptData.password
      );
      await this.showToast('暗号化成功');
    } catch (error) {
      await this.showToast('暗号化エラー', 'danger');
    }
  }

  async decrypt() {
    if (!this.encryptData.encrypted || !this.encryptData.password) {
      await this.showToast(
        '暗号化データとパスワードを入力してください',
        'warning'
      );
      return;
    }

    try {
      this.encryptData.decrypted = await this.encryption.decrypt(
        this.encryptData.encrypted,
        this.encryptData.password
      );
      await this.showToast('復号成功');
    } catch (error) {
      await this.showToast(
        '復号エラー（パスワードが間違っている可能性があります）',
        'danger'
      );
    }
  }

  generatePassword() {
    const password = this.encryption.generatePassword();
    this.encryptData.password = password;
    this.copyToClipboard(password);
  }

  async hashText() {
    if (!this.encryptData.plainText) {
      await this.showToast(
        'ハッシュ化するテキストを入力してください',
        'warning'
      );
      return;
    }

    const hash = await this.encryption.hash(this.encryptData.plainText);
    this.encryptData.encrypted = hash;
    await this.showToast('ハッシュ生成完了');
  }

  // マイグレーション
  async loadVersion() {
    this.currentVersion = await this.migration.getCurrentVersion();
  }

  async runMigration() {
    try {
      // デモ用のマイグレーション登録
      this.migration.registerMigration('1.0.0', async () => {
        console.log('Migration to 1.0.0');
      });
      this.migration.registerMigration('1.1.0', async () => {
        console.log('Migration to 1.1.0');
      });

      await this.migration.migrate();
      await this.showToast('マイグレーション完了');
      await this.loadVersion();
    } catch (error) {
      await this.showToast('マイグレーションエラー', 'danger');
    }
  }

  // ヘルパー
  async copyToClipboard(text: string) {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      await this.showToast('クリップボードにコピーしました');
    }
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  // メッセージデモ機能
  initializeDemoMessages() {
    this.demoMessages = [
      {
        id: this.generateMessageId(),
        type: MessageType.SYSTEM,
        content: 'メッセージコンポーネントのデモへようこそ！',
        timestamp: new Date(),
      },
      {
        id: this.generateMessageId(),
        type: MessageType.USER,
        content: 'こんにちは、Claude！TypeScriptについて教えてください。',
        timestamp: new Date(Date.now() - 60000),
      },
      {
        id: this.generateMessageId(),
        type: MessageType.CLAUDE,
        content: `TypeScriptはMicrosoftが開発した、JavaScriptに静的型付けを追加したプログラミング言語です。

以下は簡単な例です：

\`\`\`typescript
interface User {
  name: string;
  age: number;
}

function greetUser(user: User): string {
  return \`Hello, \${user.name}! You are \${user.age} years old.\`;
}

const john: User = {
  name: "John Doe",
  age: 30
};

console.log(greetUser(john));
\`\`\`

TypeScriptの主な特徴：
- 静的型付けによるコンパイル時エラー検出
- 優れたIDEサポート
- 最新のECMAScript機能のサポート`,
        timestamp: new Date(Date.now() - 30000),
      },
    ];
  }

  generateMessageId(): string {
    return `msg_${this.messageIdCounter++}_${Date.now()}`;
  }

  addMessage() {
    if (!this.newMessageContent.trim()) {
      return;
    }

    const message: Message = {
      id: this.generateMessageId(),
      type: MessageType.USER,
      content: this.newMessageContent,
      timestamp: new Date(),
    };

    this.demoMessages.push(message);
    this.newMessageContent = '';
  }

  addUserMessage() {
    const message: Message = {
      id: this.generateMessageId(),
      type: MessageType.USER,
      content: 'これはユーザーからのメッセージです。',
      timestamp: new Date(),
    };
    this.demoMessages.push(message);
  }

  addClaudeMessage() {
    const message: Message = {
      id: this.generateMessageId(),
      type: MessageType.CLAUDE,
      content: `Claudeからの返答です。

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# 使用例
print(fibonacci(10))  # 55
\`\`\`

このコードはフィボナッチ数列のn番目の値を計算します。`,
      timestamp: new Date(),
    };
    this.demoMessages.push(message);
  }

  addSystemMessage() {
    const message: Message = {
      id: this.generateMessageId(),
      type: MessageType.SYSTEM,
      content: 'システムからの通知：接続が確立されました。',
      timestamp: new Date(),
    };
    this.demoMessages.push(message);
  }

  addErrorMessage() {
    const message: Message = {
      id: this.generateMessageId(),
      type: MessageType.ERROR,
      content: 'エラー：接続がタイムアウトしました。再度お試しください。',
      timestamp: new Date(),
    };
    this.demoMessages.push(message);
  }

  clearMessages() {
    this.demoMessages = [];
    this.messageIdCounter = 1;
    this.initializeDemoMessages();
  }

  // SSH接続機能
  async connectSSH() {
    const loading = await this.loadingController.create({
      message: '接続中...',
    });
    await loading.present();

    try {
      await this.setupListeners();

      const connectionOptions = {
        host: this.connectionForm.host,
        port: this.connectionForm.port,
        username: this.connectionForm.username,
        ...(this.connectionForm.authType === 'password'
          ? { password: this.connectionForm.password }
          : {
              privateKey: this.connectionForm.privateKey,
              passphrase: this.connectionForm.passphrase,
            }),
      };

      const result = await SSH.connect(connectionOptions);
      this.sessionId = result.sessionId;
      this.isConnected = true;

      await this.showToast('接続に成功しました');
    } catch (error) {
      await this.showToast(
        `接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        'danger'
      );
    } finally {
      await loading.dismiss();
    }
  }

  async disconnectSSH() {
    if (!this.sessionId) return;

    const alert = await this.alertController.create({
      header: '切断確認',
      message: 'SSH接続を切断しますか？',
      buttons: [
        {
          text: 'キャンセル',
          role: 'cancel',
        },
        {
          text: '切断',
          handler: async () => {
            try {
              await SSH.disconnect({ sessionId: this.sessionId! });
              this.sessionId = null;
              this.isConnected = false;
              await this.cleanupListeners();

              if (this.terminalComponent) {
                this.terminalComponent.clear();
              }

              await this.showToast('切断しました');
            } catch (error) {
              await this.showToast('切断エラー', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async setupListeners() {
    this.dataListener = await SSH.addListener(
      'dataReceived',
      (data: { sessionId: string; data: string }) => {
        if (data.sessionId === this.sessionId && this.terminalComponent) {
          this.terminalComponent.write(data.data);
        }
      }
    );

    this.stateListener = await SSH.addListener(
      'connectionStateChanged',
      async (data: {
        sessionId: string;
        state: 'connected' | 'disconnected' | 'error';
        error?: string;
      }) => {
        if (data.state === 'disconnected') {
          this.sessionId = null;
          this.isConnected = false;
          await this.showToast('接続が切断されました', 'warning');
        } else if (data.state === 'error') {
          await this.showToast(
            `エラー: ${data.error || '不明なエラー'}`,
            'danger'
          );
        }
      }
    );
  }

  private async cleanupListeners() {
    if (this.dataListener) {
      await this.dataListener.remove();
      this.dataListener = null;
    }
    if (this.stateListener) {
      await this.stateListener.remove();
      this.stateListener = null;
    }
  }

  onTerminalData(data: string) {
    if (this.sessionId) {
      SSH.sendCommand({ sessionId: this.sessionId, command: data }).catch(
        (error: Error) => {
          console.error('コマンド送信エラー:', error);
        }
      );
    }
  }

  onTerminalResize(event: { cols: number; rows: number }) {
    if (this.sessionId) {
      SSH.resizeWindow({
        sessionId: this.sessionId,
        cols: event.cols,
        rows: event.rows,
      }).catch((error: Error) => {
        console.error('リサイズエラー:', error);
      });
    }
  }

  ngOnDestroy() {
    if (this.sessionId) {
      SSH.disconnect({ sessionId: this.sessionId });
    }
    this.cleanupListeners();
  }
}
