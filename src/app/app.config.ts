import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), provideFirebaseApp(() => initializeApp({ projectId: "tlv-bov-ff1b1", appId: "1:375913734809:web:8bcb7ada467d471d778e08", storageBucket: "tlv-bov-ff1b1.firebasestorage.app", apiKey: "AIzaSyDVppGr3ZwotmOMfi0jygTGjV8akwO4OkA", authDomain: "tlv-bov-ff1b1.firebaseapp.com", messagingSenderId: "375913734809" })), provideAuth(() => getAuth())
  ]
};
