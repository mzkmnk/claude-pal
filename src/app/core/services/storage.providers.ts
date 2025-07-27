import { Provider } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StorageService } from './storage.service';
import { storageServiceFactory } from './storage.factory';

export const STORAGE_PROVIDERS: Provider[] = [
  {
    provide: StorageService,
    useFactory: storageServiceFactory,
    deps: [Platform],
  },
];
