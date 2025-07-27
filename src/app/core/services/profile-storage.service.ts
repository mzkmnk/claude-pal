import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { ConnectionProfile } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProfileStorageService {
  private readonly PROFILES_KEY = 'connection_profiles';
  private storageService = inject(StorageService);

  async getAllProfiles(): Promise<ConnectionProfile[]> {
    const profiles = await this.storageService.get<ConnectionProfile[]>(
      this.PROFILES_KEY
    );
    return profiles || [];
  }

  async getProfile(id: string): Promise<ConnectionProfile | null> {
    const profiles = await this.getAllProfiles();
    return profiles.find(p => p.id === id) || null;
  }

  async saveProfile(
    profile: Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt'> &
      Partial<ConnectionProfile>
  ): Promise<ConnectionProfile> {
    const profiles = await this.getAllProfiles();
    const now = new Date();

    if (profile.id) {
      // 既存プロファイルの更新
      const index = profiles.findIndex(p => p.id === profile.id);
      if (index >= 0) {
        const existingProfile = profiles[index];
        const updatedProfile: ConnectionProfile = {
          ...existingProfile,
          ...profile,
          updatedAt: now,
        };
        profiles[index] = updatedProfile;
        await this.storageService.set(this.PROFILES_KEY, profiles);
        return updatedProfile;
      }
    }

    // 新規プロファイルの作成
    const newProfile: ConnectionProfile = {
      ...profile,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };
    profiles.push(newProfile);
    await this.storageService.set(this.PROFILES_KEY, profiles);
    return newProfile;
  }

  async deleteProfile(id: string): Promise<void> {
    const profiles = await this.getAllProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    await this.storageService.set(this.PROFILES_KEY, filtered);
  }

  async markAsUsed(id: string): Promise<void> {
    const profiles = await this.getAllProfiles();
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      profile.lastUsed = new Date();
      profile.updatedAt = new Date();
      await this.storageService.set(this.PROFILES_KEY, profiles);
    }
  }

  async getRecentProfiles(limit: number = 5): Promise<ConnectionProfile[]> {
    const profiles = await this.getAllProfiles();
    return profiles
      .filter(p => p.lastUsed)
      .sort((a, b) => {
        const aTime = a.lastUsed?.getTime() || 0;
        const bTime = b.lastUsed?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  private generateId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
