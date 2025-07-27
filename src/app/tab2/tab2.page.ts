import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonList,
  IonText,
  IonIcon,
  IonChip,
  IonBadge,
  ToastController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  save,
  trash,
  download,
  refresh,
  checkmark,
  close,
} from 'ionicons/icons';
import { StorageService } from '../core/services';

addIcons({
  save,
  trash,
  download,
  refresh,
  checkmark,
  close,
});

interface StorageTestData {
  id: number;
  name: string;
  data: unknown;
  timestamp: string;
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonList,
    IonText,
    IonIcon,
    IonChip,
    IonBadge,
  ],
})
export class Tab2Page {
  private storageService = inject(StorageService);
  private toastController = inject(ToastController);
  private platform = inject(Platform);

  testKey = 'test_key';
  testValue = '{ "message": "Hello Storage!" }';
  retrievedValue: string | null = null;
  allKeys: string[] = [];
  storageType = '';

  constructor() {
    this.detectStorageType();
    this.loadAllKeys();
  }

  detectStorageType(): void {
    if (this.platform.is('capacitor') || this.platform.is('cordova')) {
      this.storageType = 'Native Storage (Capacitor Preferences)';
    } else {
      this.storageType = 'Web Storage (LocalStorage)';
    }
  }

  async saveData(): Promise<void> {
    try {
      const data = JSON.parse(this.testValue);
      await this.storageService.set(this.testKey, data);
      await this.showToast('データを保存しました', 'success');
      await this.loadAllKeys();
    } catch (error) {
      await this.showToast(`エラー: ${error}`, 'danger');
    }
  }

  async loadData(): Promise<void> {
    try {
      const data = await this.storageService.get<unknown>(this.testKey);
      if (data !== null) {
        this.retrievedValue = JSON.stringify(data, null, 2);
        await this.showToast('データを取得しました', 'success');
      } else {
        this.retrievedValue = 'null (データが存在しません)';
        await this.showToast('データが見つかりません', 'warning');
      }
    } catch (error) {
      await this.showToast(`エラー: ${error}`, 'danger');
    }
  }

  async removeData(): Promise<void> {
    try {
      await this.storageService.remove(this.testKey);
      this.retrievedValue = null;
      await this.showToast('データを削除しました', 'success');
      await this.loadAllKeys();
    } catch (error) {
      await this.showToast(`エラー: ${error}`, 'danger');
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await this.storageService.clear();
      this.retrievedValue = null;
      await this.showToast('すべてのデータを削除しました', 'success');
      await this.loadAllKeys();
    } catch (error) {
      await this.showToast(`エラー: ${error}`, 'danger');
    }
  }

  async loadAllKeys(): Promise<void> {
    try {
      this.allKeys = await this.storageService.keys();
    } catch (error) {
      await this.showToast(`キーの取得エラー: ${error}`, 'danger');
    }
  }

  async saveMultipleItems(): Promise<void> {
    try {
      const testData: StorageTestData[] = [
        {
          id: 1,
          name: 'Item 1',
          data: { value: 'test1' },
          timestamp: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'Item 2',
          data: { value: 'test2' },
          timestamp: new Date().toISOString(),
        },
        {
          id: 3,
          name: 'Item 3',
          data: { value: 'test3' },
          timestamp: new Date().toISOString(),
        },
      ];

      for (const item of testData) {
        await this.storageService.set(`item_${item.id}`, item);
      }

      await this.showToast('3つのテストデータを保存しました', 'success');
      await this.loadAllKeys();
    } catch (error) {
      await this.showToast(`エラー: ${error}`, 'danger');
    }
  }

  private async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
