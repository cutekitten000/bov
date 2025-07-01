import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { SignUp } from './components/sign-up/sign-up';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { AgentDashboard } from './components/agent-dashboard/agent-dashboard';
import { authGuard } from './auth/auth-guard';
import { adminGuard } from './auth/admin-guard'; // <-- Importe o novo guard

// Importe os novos componentes que acabamos de criar
import { Overview } from './components/admin-dashboard/overview/overview';
import { TeamManagement } from './components/admin-dashboard/team-management/team-management';

export const routes: Routes = [
  // Rotas Públicas
  { path: 'login', component: Login },
  { path: 'sign-up', component: SignUp },
  { path: 'forgot-password', component: ForgotPassword },

  // Rota do Agente (protegida por login simples)
  { path: 'agent/dashboard', component: AgentDashboard, canActivate: [authGuard] },

  // ESTRUTURA DE ROTAS DO ADMIN
  { 
    path: 'admin', 
    component: AdminDashboard, // Este será nosso componente de "layout"
    canActivate: [authGuard, adminGuard], // Protegido pelos dois guardas em sequência
    children: [
      { path: 'overview', component: Overview },
      { path: 'team', component: TeamManagement },
      // Adicionaremos mais rotas filhas aqui depois

      // Redirecionamento padrão da área de admin para a overview
      { path: '', redirectTo: 'overview', pathMatch: 'full' }
    ]
  },

  // Rotas de fallback
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];