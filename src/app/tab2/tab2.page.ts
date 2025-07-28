import { Component, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonChip,
  IonButtons,
  IonLabel,
  ToastController,
  AlertController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  terminal,
  trash,
  search,
  expand,
  contract,
  copy,
  colorPalette,
  text,
} from 'ionicons/icons';
import {
  TerminalComponent,
  GestureEventData,
} from '../shared/components/terminal';
import { SSHService } from '../core/services/ssh.service';

addIcons({
  terminal,
  trash,
  search,
  expand,
  contract,
  copy,
  colorPalette,
  text,
});

/**
 * ターミナルコンポーネントのデモページ
 *
 * ターミナルエミュレータの機能をテストし、
 * SSH接続のシミュレーションを行います。
 *
 * @component Tab2Page
 */
@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonChip,
    IonButtons,
    IonLabel,
    TerminalComponent,
  ],
})
export class Tab2Page implements AfterViewInit {
  @ViewChild(TerminalComponent) terminal!: TerminalComponent;

  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  platform = inject(Platform);
  private sshService = inject(SSHService);

  isConnected = false;
  isFullscreen = false;
  currentTheme: 'dark' | 'light' = 'dark';
  fontSize = 14;

  demoCommands = [
    { cmd: 'ls -la', desc: 'ファイル一覧' },
    { cmd: 'pwd', desc: '現在のディレクトリ' },
    { cmd: 'echo "Hello, Claude PAL!"', desc: 'エコーテスト' },
    { cmd: 'date', desc: '現在時刻' },
    { cmd: 'uname -a', desc: 'システム情報' },
  ];

  ngAfterViewInit(): void {
    // ターミナルの初期メッセージ
    setTimeout(() => {
      this.showWelcomeMessage();
    }, 500);
  }

  /**
   * ウェルカムメッセージを表示する
   * @private
   */
  private showWelcomeMessage(): void {
    this.terminal.writeln('Welcome to Claude PAL Terminal Demo! 🚀');
    this.terminal.writeln('');
    this.terminal.writeln('This is a demonstration of the terminal component.');
    this.terminal.writeln(
      'Try the demo commands or connect to a mock SSH session.'
    );
    this.terminal.writeln('');
    this.terminal.write('$ ');
  }

  /**
   * ターミナルの準備完了時の処理
   */
  onTerminalReady(): void {
    // ターミナルコンポーネントへの参照は@ViewChildで既に取得済み
    console.log('Terminal ready');
  }

  /**
   * ターミナルからのデータを処理する
   * @param {string} data - 入力データ
   */
  onTerminalData(data: string): void {
    if (!this.isConnected) {
      // ローカルエコー（デモ用）
      this.terminal.write(data);

      // Enterキーの処理
      if (data === '\r' || data === '\n') {
        this.terminal.writeln('');
        this.terminal.write('$ ');
      }
    } else {
      // SSH接続中はサービスに転送
      this.sshService.sendData(data);
    }
  }

  /**
   * ターミナルのリサイズイベントを処理する
   * @param {{ cols: number; rows: number }} size - 新しいサイズ
   */
  onTerminalResize(size: { cols: number; rows: number }): void {
    console.log('Terminal resized:', size);
    if (this.isConnected) {
      // SSH接続中はサーバーに通知
      this.sshService.resize(size.cols, size.rows);
    }
  }

  /**
   * ジェスチャーイベントを処理する
   * @param {GestureEventData} event - ジェスチャーイベント
   */
  async onGesture(event: GestureEventData): Promise<void> {
    switch (event.type) {
      case 'doubletap':
        this.toggleFullscreen();
        break;

      case 'swipe':
        if (event.direction === 'left' || event.direction === 'right') {
          await this.showToast(`スワイプ: ${event.direction}`);
        }
        break;
    }
  }

  /**
   * デモコマンドを実行する
   * @param {string} command - コマンド
   */
  executeCommand(command: string): void {
    if (!this.isConnected) {
      this.terminal.writeln(command);

      // デモ出力を生成
      switch (command) {
        case 'ls -la':
          this.terminal.writeln('total 48');
          this.terminal.writeln(
            'drwxr-xr-x  6 user  staff   192 Jan  1 12:00 .'
          );
          this.terminal.writeln(
            'drwxr-xr-x  5 user  staff   160 Jan  1 11:00 ..'
          );
          this.terminal.writeln(
            '-rw-r--r--  1 user  staff  1024 Jan  1 12:00 README.md'
          );
          this.terminal.writeln(
            '-rw-r--r--  1 user  staff  2048 Jan  1 12:00 package.json'
          );
          this.terminal.writeln(
            'drwxr-xr-x  4 user  staff   128 Jan  1 12:00 src'
          );
          this.terminal.writeln(
            'drwxr-xr-x  3 user  staff    96 Jan  1 12:00 node_modules'
          );
          break;

        case 'pwd':
          this.terminal.writeln('/home/user/claude-pal');
          break;

        case 'echo "Hello, Claude PAL!"':
          this.terminal.writeln('Hello, Claude PAL!');
          break;

        case 'date':
          this.terminal.writeln(new Date().toString());
          break;

        case 'uname -a':
          this.terminal.writeln(
            'Darwin claude-pal 20.6.0 Darwin Kernel Version 20.6.0'
          );
          break;
      }

      this.terminal.write('$ ');
    }
  }

  /**
   * モックSSH接続を開始する
   */
  async connect(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'SSH接続デモ',
      message: 'モックSSHセッションを開始します。実際の接続は行われません。',
      buttons: [
        {
          text: 'キャンセル',
          role: 'cancel',
        },
        {
          text: '接続',
          handler: () => {
            this.startMockSession();
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * モックセッションを開始する
   * @private
   */
  private async startMockSession(): Promise<void> {
    this.terminal.clear();
    this.terminal.writeln('Connecting to demo.server.com...');

    // 接続アニメーション
    await this.delay(500);
    this.terminal.writeln('Connected!');
    this.terminal.writeln('');

    // SSHバナー
    this.terminal.writeln('Welcome to Claude PAL Mock Server');
    this.terminal.writeln('Last login: ' + new Date().toLocaleString());
    this.terminal.writeln('');
    this.terminal.write('user@demo:~$ ');

    this.isConnected = true;

    // SSHサービスのデータストリームを購読
    this.sshService.dataStream$.subscribe((data: string) => {
      this.terminal.write(data);
    });

    await this.showToast('モックSSHセッションを開始しました', 'success');
  }

  /**
   * 接続を切断する
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      this.terminal.writeln('');
      this.terminal.writeln('Connection closed.');
      this.terminal.writeln('');
      this.terminal.write('$ ');

      this.isConnected = false;
      this.sshService.disconnect();

      await this.showToast('接続を切断しました', 'success');
    }
  }

  /**
   * ターミナルをクリアする
   */
  clearTerminal(): void {
    this.terminal.clear();
    if (this.isConnected) {
      this.terminal.write('user@demo:~$ ');
    } else {
      this.terminal.write('$ ');
    }
  }

  /**
   * テーマを切り替える
   */
  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';

    if (this.currentTheme === 'light') {
      this.terminal.updateTheme({
        background: '#ffffff',
        foreground: '#333333',
        cursor: '#333333',
        selection: 'rgba(0, 0, 0, 0.3)',
      });
    } else {
      this.terminal.updateTheme({
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selection: 'rgba(255, 255, 255, 0.3)',
      });
    }
  }

  /**
   * フォントサイズを変更する
   * @param {number} delta - 変更量
   */
  changeFontSize(delta: number): void {
    this.fontSize = Math.max(8, Math.min(24, this.fontSize + delta));
    this.terminal.updateFontSize(this.fontSize);
  }

  /**
   * 全画面モードを切り替える
   */
  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    // 実際の全画面実装は親コンポーネントで行う
  }

  /**
   * 検索ダイアログを表示する
   */
  async showSearchDialog(): Promise<void> {
    const alert = await this.alertController.create({
      header: '検索',
      inputs: [
        {
          name: 'searchTerm',
          type: 'text',
          placeholder: '検索文字列を入力',
        },
      ],
      buttons: [
        {
          text: 'キャンセル',
          role: 'cancel',
        },
        {
          text: '検索',
          handler: data => {
            if (data.searchTerm) {
              this.terminal.search(data.searchTerm);
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * 選択テキストをコピーする
   */
  async copySelection(): Promise<void> {
    this.terminal.copySelection();
    await this.showToast('コピーしました', 'success');
  }

  /**
   * トーストを表示する
   * @private
   */
  private async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger' = 'success'
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  /**
   * 遅延を生成する
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
