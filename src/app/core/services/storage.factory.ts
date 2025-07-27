import { Platform } from '@ionic/angular';
import { StorageService } from './storage.service';
import { WebStorageService } from './web-storage.service';
import { NativeStorageService } from './native-storage.service';

export function storageServiceFactory(platform: Platform): StorageService {
  if (platform.is('capacitor') || platform.is('cordova')) {
    return new NativeStorageService();
  }
  return new WebStorageService();
}
