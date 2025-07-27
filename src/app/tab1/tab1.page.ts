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
import { addIcons } from 'ionicons';
import { eyeOutline, trashOutline } from 'ionicons/icons';

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

  constructor() {
    addIcons({ eyeOutline, trashOutline });
  }

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

  async showKey(key: KeyPair) {
    try {
      // Keychainから鍵を取得（ここで生体認証が発動）
      const secureKey = await this.keyManager.getKey(key.name);
      if (secureKey) {
        this.selectedKey = secureKey;

        const toast = await this.toastController.create({
          message: '認証に成功しました',
          duration: 1500,
          position: 'bottom',
          color: 'success',
        });
        await toast.present();
      } else {
        throw new Error('鍵の取得に失敗しました');
      }
    } catch (error) {
      this.selectedKey = null;

      const alert = await this.alertController.create({
        header: '認証エラー',
        message: error instanceof Error ? error.message : '認証に失敗しました',
        buttons: ['OK'],
      });
      await alert.present();
    }
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
