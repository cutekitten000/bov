import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { SignUp } from './components/sign-up/sign-up';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { AgentDashboard } from './components/agent-dashboard/agent-dashboard';
import { authGuard } from './auth/auth-guard';

export const routes: Routes = [
  // Rotas de Autenticação (públicas)
  { path: 'login', component: Login },
  { path: 'sign-up', component: SignUp },
  { path: 'forgot-password', component: ForgotPassword },

  // Rotas Protegidas
  { path: 'admin/dashboard', component: AdminDashboard, canActivate: [authGuard] },
  { path: 'agent/dashboard', component: AgentDashboard, canActivate: [authGuard] },

  // Rotas de fallback
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];