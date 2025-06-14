import { Routes } from '@angular/router';
import { authGuard } from '../app/auth/auth-guard'; // Importe o guarda
import { Dashboard } from './components/dashboard/dashboard'; // Importe o Dashboard
import { Login } from './components/login/login';
import { ForgotPassword } from './components/forgot-password/forgot-password'; // IMPORTAR

export const routes: Routes = [
  // Adicione a rota do dashboard, protegida pelo authGuard
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'login', component: Login },
  { path: 'forgot-password', component: ForgotPassword },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];