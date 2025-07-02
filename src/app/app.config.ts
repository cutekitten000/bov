import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

// --- ADIÇÕES PARA DATAS ---
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

// --- 1. IMPORTE O provideNgxMask AQUI ---
import { provideNgxMask } from 'ngx-mask';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';

// --- ADIÇÃO NECESSÁRIA AQUI ---
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

import { MatSnackBarModule } from '@angular/material/snack-bar';
import { getFunctions, provideFunctions } from '@angular/fire/functions';

// --- 1. CRIE A CONSTANTE COM OS FORMATOS PT-BR ---
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

const firebaseConfig = {
  apiKey: "AIzaSyCGi7TvemPfENy7KMrTwqV01NoUKa1dORI",
  authDomain: "carol-tlvbov.firebaseapp.com",
  projectId: "carol-tlvbov",
  storageBucket: "carol-tlvbov.firebasestorage.app",
  messagingSenderId: "26360768",
  appId: "1:26360768:web:5169f0e555e60eea89e625"
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
    provideFunctions(() => getFunctions()),
    provideMomentDateAdapter(),
     { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }, // <-- 2. ADICIONE O PROVEDOR DE FORMATOS
    provideNgxMask(),
    importProvidersFrom(MatSnackBarModule)
  ]
};