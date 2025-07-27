import { Injectable, inject, signal, computed } from '@angular/core';
import { ProfileStorageService } from './profile-storage.service';
import { AppSettingsService } from './app-settings.service';
import { ConnectionProfile } from '../models';

/**
 * 接続プロファイルのフィールドに対するバリデーションエラーを表す
 * @interface ProfileValidationError
 */
export interface ProfileValidationError {
  /** バリデーションに失敗したフィールド名 */
  field: string;
  /** バリデーション失敗の詳細メッセージ */
  message: string;
}

/**
 * SSH接続プロファイルを管理するサービス
 *
 * このサービスは接続プロファイルに対する高レベルな操作を提供します：
 * - プロファイルのCRUD操作
 * - デフォルトプロファイルの管理
 * - 最近使用したプロファイルの追跡
 * - プロファイルのバリデーションとインポート/エクスポート
 *
 * @class ProfileService
 * @example
 * ```typescript
 * const profile = await profileService.createProfile({
 *   name: 'My Server',
 *   host: '192.168.1.100',
 *   port: 22,
 *   username: 'user',
 *   authType: 'key',
 *   keyId: 'key-123'
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private profileStorage = inject(ProfileStorageService);
  private appSettings = inject(AppSettingsService);

  private profilesSignal = signal<ConnectionProfile[]>([]);
  private defaultProfileIdSignal = signal<string | null>(null);
  private recentProfilesSignal = signal<ConnectionProfile[]>([]);

  /** すべての接続プロファイルのリスト（Observable） */
  readonly profiles = computed(() => this.profilesSignal());

  /** デフォルト接続プロファイルへの参照（Observable） */
  readonly defaultProfile = computed(() => {
    const defaultId = this.defaultProfileIdSignal();
    if (!defaultId) return null;
    return this.profilesSignal().find(p => p.id === defaultId) || null;
  });

  /** 最近使用したプロファイルのリスト（最大5件、Observable） */
  readonly recentProfiles = computed(() => this.recentProfilesSignal());

  constructor() {
    this.loadProfiles();
    this.loadDefaultProfileId();
  }

  private async loadProfiles(): Promise<void> {
    const profiles = await this.profileStorage.getAllProfiles();
    this.profilesSignal.set(profiles);
    await this.loadRecentProfiles();
  }

  private async loadDefaultProfileId(): Promise<void> {
    try {
      const settings = await this.appSettings.getSettings();
      this.defaultProfileIdSignal.set(settings?.defaultProfileId || null);
    } catch (error) {
      this.defaultProfileIdSignal.set(null);
    }
  }

  private async loadRecentProfiles(): Promise<void> {
    const recent = await this.profileStorage.getRecentProfiles(5);
    this.recentProfilesSignal.set(recent);
  }

  /**
   * 新しい接続プロファイルを作成する
   *
   * @param {Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt'>} profile - 作成するプロファイルのデータ
   * @returns {Promise<ConnectionProfile>} 生成されたIDとタイムスタンプを含む作成済みプロファイル
   * @throws {Error} バリデーションに失敗した場合
   * @public
   */
  async createProfile(
    profile: Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ConnectionProfile> {
    // バリデーション
    const errors = this.validateProfile(profile);
    if (errors.length > 0) {
      throw new Error(
        `プロファイルの検証に失敗しました: ${errors
          .map(e => e.message)
          .join(', ')}`
      );
    }

    // プロファイルの保存
    const savedProfile = await this.profileStorage.saveProfile(profile);

    // シグナルの更新
    await this.loadProfiles();

    // 最初のプロファイルの場合、デフォルトに設定
    // loadProfiles()の後、新しいプロファイルリストを確認
    const updatedProfiles = await this.profileStorage.getAllProfiles();
    if (updatedProfiles.length === 1) {
      await this.setDefaultProfile(savedProfile.id);
    }

    return savedProfile;
  }

  /**
   * 既存の接続プロファイルを更新する
   *
   * @param {string} id - 更新するプロファイルのID
   * @param {Partial<Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt'>>} updates - 更新するフィールド
   * @returns {Promise<ConnectionProfile>} 更新されたプロファイル
   * @throws {Error} プロファイルが見つからない、またはバリデーションに失敗した場合
   * @public
   */
  async updateProfile(
    id: string,
    updates: Partial<Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ConnectionProfile> {
    const existing = await this.profileStorage.getProfile(id);
    if (!existing) {
      throw new Error(`プロファイルが見つかりません: ${id}`);
    }

    const updatedProfile = { ...existing, ...updates };

    // バリデーション
    const errors = this.validateProfile(updatedProfile);
    if (errors.length > 0) {
      throw new Error(
        `プロファイルの検証に失敗しました: ${errors
          .map(e => e.message)
          .join(', ')}`
      );
    }

    // 保存
    const saved = await this.profileStorage.saveProfile(updatedProfile);

    // シグナルの更新
    await this.loadProfiles();

    return saved;
  }

  /**
   * 接続プロファイルを削除する
   *
   * @param {string} id - 削除するプロファイルのID
   * @returns {Promise<void>}
   * @public
   */
  async deleteProfile(id: string): Promise<void> {
    // デフォルトプロファイルの場合はクリア
    if (this.defaultProfileIdSignal() === id) {
      await this.clearDefaultProfile();
    }

    // プロファイルの削除
    await this.profileStorage.deleteProfile(id);

    // シグナルの更新
    await this.loadProfiles();
  }

  /**
   * IDで特定の接続プロファイルを取得する
   *
   * @param {string} id - プロファイルのID
   * @returns {Promise<ConnectionProfile | null>} プロファイル、見つからない場合はnull
   * @public
   */
  async getProfile(id: string): Promise<ConnectionProfile | null> {
    return this.profileStorage.getProfile(id);
  }

  /**
   * すべての接続プロファイルを取得する
   *
   * @returns {Promise<ConnectionProfile[]>} すべてのプロファイルの配列
   * @public
   */
  async getAllProfiles(): Promise<ConnectionProfile[]> {
    return this.profileStorage.getAllProfiles();
  }

  /**
   * プロファイルをデフォルト接続プロファイルとして設定する
   *
   * @param {string} id - デフォルトに設定するプロファイルのID
   * @returns {Promise<void>}
   * @throws {Error} プロファイルが見つからない場合
   * @public
   */
  async setDefaultProfile(id: string): Promise<void> {
    const profile = await this.profileStorage.getProfile(id);
    if (!profile) {
      throw new Error(`プロファイルが見つかりません: ${id}`);
    }

    const settings = await this.appSettings.getSettings();
    await this.appSettings.updateSettings({
      ...settings,
      defaultProfileId: id,
    });

    this.defaultProfileIdSignal.set(id);
  }

  /**
   * デフォルトプロファイルの設定をクリアする
   *
   * @returns {Promise<void>}
   * @public
   */
  async clearDefaultProfile(): Promise<void> {
    const settings = await this.appSettings.getSettings();
    const { defaultProfileId, ...settingsWithoutDefault } = settings;
    await this.appSettings.updateSettings(settingsWithoutDefault);

    this.defaultProfileIdSignal.set(null);
  }

  /**
   * プロファイルを最近使用したものとしてマークする
   *
   * @param {string} id - プロファイルのID
   * @returns {Promise<void>}
   * @public
   */
  async markAsUsed(id: string): Promise<void> {
    await this.profileStorage.markAsUsed(id);
    await this.loadRecentProfiles();
  }

  /**
   * 接続プロファイルをバリデートする
   *
   * @param {Partial<ConnectionProfile>} profile - バリデートするプロファイル
   * @returns {ProfileValidationError[]} バリデーションエラーの配列（有効な場合は空）
   * @public
   */
  validateProfile(
    profile: Partial<ConnectionProfile>
  ): ProfileValidationError[] {
    const errors: ProfileValidationError[] = [];

    // 名前の検証
    if (!profile.name || profile.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'プロファイル名は必須です',
      });
    } else if (profile.name.length > 50) {
      errors.push({
        field: 'name',
        message: 'プロファイル名は50文字以内で入力してください',
      });
    }

    // ホストの検証
    if (!profile.host || profile.host.trim().length === 0) {
      errors.push({
        field: 'host',
        message: 'ホストは必須です',
      });
    } else if (!this.isValidHost(profile.host)) {
      errors.push({
        field: 'host',
        message: 'ホストの形式が正しくありません',
      });
    }

    // ポートの検証
    if (profile.port === undefined || profile.port === null) {
      errors.push({
        field: 'port',
        message: 'ポートは必須です',
      });
    } else if (profile.port < 1 || profile.port > 65535) {
      errors.push({
        field: 'port',
        message: 'ポートは1〜65535の範囲で入力してください',
      });
    }

    // ユーザー名の検証
    if (!profile.username || profile.username.trim().length === 0) {
      errors.push({
        field: 'username',
        message: 'ユーザー名は必須です',
      });
    }

    // 認証方法の検証
    if (!profile.authType || !['key', 'password'].includes(profile.authType)) {
      errors.push({
        field: 'authType',
        message: '認証方法が正しくありません',
      });
    } else if (profile.authType === 'key' && !profile.keyId) {
      errors.push({
        field: 'keyId',
        message: '鍵認証の場合、SSH鍵を選択してください',
      });
    } else if (profile.authType === 'password' && !profile.password) {
      errors.push({
        field: 'password',
        message: 'パスワード認証の場合、パスワードを入力してください',
      });
    }

    return errors;
  }

  private isValidHost(host: string): boolean {
    // IPアドレスの検証
    const ipRegex =
      /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    if (ipRegex.test(host)) {
      return true;
    }

    // ホスト名の検証
    const hostnameRegex =
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
    return hostnameRegex.test(host);
  }

  /**
   * 既存のプロファイルを新しい名前で複製する
   *
   * @param {string} id - 複製元のプロファイルのID
   * @param {string} newName - 複製されたプロファイルの名前
   * @returns {Promise<ConnectionProfile>} 新しく複製されたプロファイル
   * @throws {Error} プロファイルが見つからない場合
   * @public
   */
  async duplicateProfile(
    id: string,
    newName: string
  ): Promise<ConnectionProfile> {
    const original = await this.profileStorage.getProfile(id);
    if (!original) {
      throw new Error(`プロファイルが見つかりません: ${id}`);
    }

    const duplicate: Omit<ConnectionProfile, 'lastUsed'> & { lastUsed?: Date } =
      {
        ...original,
        name: newName,
      };
    delete duplicate.lastUsed;

    // idとタイムスタンプを除外
    const { id: _, createdAt, updatedAt, ...profileData } = duplicate;

    return this.createProfile(profileData);
  }

  /**
   * プロファイルをJSON形式でエクスポートする（機密データを除く）
   *
   * @param {string} id - エクスポートするプロファイルのID
   * @returns {Promise<string>} プロファイルのJSON文字列表現
   * @throws {Error} プロファイルが見つからない場合
   * @public
   */
  async exportProfile(id: string): Promise<string> {
    const profile = await this.profileStorage.getProfile(id);
    if (!profile) {
      throw new Error(`プロファイルが見つかりません: ${id}`);
    }

    // 機密情報を除外したエクスポート
    const exportData = {
      name: profile.name,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      authType: profile.authType,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * JSONデータからプロファイルをインポートする
   *
   * @param {string} jsonData - プロファイルデータを含むJSON文字列
   * @returns {Promise<ConnectionProfile>} インポートされたプロファイル
   * @throws {Error} JSONが無効、または必須フィールドが不足している場合
   * @public
   */
  async importProfile(jsonData: string): Promise<ConnectionProfile> {
    try {
      const data = JSON.parse(jsonData);

      // 必須フィールドの確認
      if (
        !data.name ||
        !data.host ||
        !data.port ||
        !data.username ||
        !data.authType
      ) {
        throw new Error('必須フィールドが不足しています');
      }

      const profileData: Omit<
        ConnectionProfile,
        'id' | 'createdAt' | 'updatedAt'
      > = {
        name: data.name,
        host: data.host,
        port: Number(data.port),
        username: data.username,
        authType: data.authType,
      };

      // 認証タイプに応じて追加フィールドを設定
      if (data.authType === 'key' && data.keyId) {
        profileData.keyId = data.keyId;
      } else if (data.authType === 'password' && data.password) {
        profileData.password = data.password;
      }

      return this.createProfile(profileData);
    } catch (error) {
      throw new Error(
        `プロファイルのインポートに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
