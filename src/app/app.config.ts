import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

// --- ADIÇÕES PARA DATAS ---
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';

// --- 1. IMPORTE O provideNgxMask AQUI ---
import { provideNgxMask } from 'ngx-mask';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';

// --- ADIÇÃO NECESSÁRIA AQUI ---
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDTsgFbYXRIwPK8UD4leIzcmjhnYNmH5xA",
  authDomain: "tlv-bov-d4487.firebaseapp.com",
  projectId: "tlv-bov-d4487",
  storageBucket: "tlv-bov-d4487.firebasestorage.app",
  messagingSenderId: "554675154075",
  appId: "1:554675154075:web:fb5cf9c272c77803422a3e",
  measurementId: "G-L5HKGP56N6"
};


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    // --- SOLUÇÃO ADICIONADA AQUI ---
    provideFirestore(() => getFirestore()),
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    provideMomentDateAdapter(),
    provideNgxMask()
  ]
};