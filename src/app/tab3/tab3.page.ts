import { Component, inject } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline,
  trashOutline,
  refreshOutline,
  keyOutline,
  lockClosedOutline,
  copyOutline,
} from 'ionicons/icons';

import {
  ProfileStorageService,
  AppSettingsService,
  EncryptionService,
  MigrationService,
} from '../core/services';
import { ConnectionProfile, AppSettings } from '../core/models';

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
  ],
})
export class Tab3Page {
  private profileStorage = inject(ProfileStorageService);
  private appSettings = inject(AppSettingsService);
  private encryption = inject(EncryptionService);
  private migration = inject(MigrationService);
  private toastController = inject(ToastController);

  selectedTab = 'profile';

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

  constructor() {
    addIcons({
      saveOutline,
      trashOutline,
      refreshOutline,
      keyOutline,
      lockClosedOutline,
      copyOutline,
    });
    this.loadData();
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
}
