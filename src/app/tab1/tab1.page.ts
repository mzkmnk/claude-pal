import { Component, OnInit, inject } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonList,
  IonIcon,
  IonText,
  IonTextarea,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeyManagerService, KeyPair } from '../core/services';
import { Clipboard } from '@capacitor/clipboard';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonList,
    IonIcon,
    IonText,
    IonTextarea,
    CommonModule,
    FormsModule,
  ],
})
export class Tab1Page implements OnInit {
  keyName = '';
  keys: KeyPair[] = [];
  selectedKey: KeyPair | null = null;

  private keyManager = inject(KeyManagerService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  async ngOnInit() {
    await this.loadKeys();
  }

  async loadKeys() {
    this.keys = await this.keyManager.getAllKeys();
  }

  async generateKey() {
    if (!this.keyName) return;

    try {
      const keyPair = await this.keyManager.generateKeyPair(this.keyName);
      await this.keyManager.saveKey(keyPair);

      this.keyName = '';
      await this.loadKeys();

      const toast = await this.toastController.create({
        message: `鍵 "${keyPair.name}" を生成しました`,
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    } catch (error) {
      const alert = await this.alertController.create({
        header: 'エラー',
        message:
          error instanceof Error ? error.message : '鍵の生成に失敗しました',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }

  showKey(key: KeyPair) {
    this.selectedKey = key;
  }

  async deleteKey(name: string) {
    const alert = await this.alertController.create({
      header: '確認',
      message: `鍵 "${name}" を削除しますか？`,
      buttons: [
        {
          text: 'キャンセル',
          role: 'cancel',
        },
        {
          text: '削除',
          role: 'destructive',
          handler: async () => {
            const result = await this.keyManager.deleteKey(name);
            if (result) {
              await this.loadKeys();
              if (this.selectedKey?.name === name) {
                this.selectedKey = null;
              }

              const toast = await this.toastController.create({
                message: `鍵 "${name}" を削除しました`,
                duration: 2000,
                position: 'bottom',
                color: 'warning',
              });
              await toast.present();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async copyPublicKey(key: KeyPair) {
    try {
      await Clipboard.write({
        string: key.publicKey,
      });

      const toast = await this.toastController.create({
        message: '公開鍵をクリップボードにコピーしました',
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    } catch (error) {
      // ブラウザのフォールバック
      await navigator.clipboard.writeText(key.publicKey);

      const toast = await this.toastController.create({
        message: '公開鍵をコピーしました',
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    }
  }
}
