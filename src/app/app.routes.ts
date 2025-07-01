import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { SignUp } from './components/sign-up/sign-up';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { AgentDashboard } from './components/agent-dashboard/agent-dashboard';
import { authGuard } from './auth/auth-guard';
import { adminGuard } from './auth/admin-guard';

// Importe os componentes filhos do admin
import { Overview } from './components/admin-dashboard/overview/overview';
import { TeamManagement } from './components/admin-dashboard/team-management/team-management';
import { SalesManagement } from './components/admin-dashboard/sales-management/sales-management'; // <-- IMPORTE O NOVO COMPONENTE

export const routes: Routes = [
  // Rotas Públicas
  { path: 'login', component: Login },
  { path: 'sign-up', component: SignUp },
  { path: 'forgot-password', component: ForgotPassword },

  // Rota do Agente
  { path: 'agent/dashboard', component: AgentDashboard, canActivate: [authGuard] },
  
  // Estrutura de Rotas do Admin
  { 
    path: 'admin', 
    component: AdminDashboard,
    canActivate: [authGuard, adminGuard],
    children: [
      { path: 'overview', component: Overview },
      { path: 'team', component: TeamManagement },
      { path: 'sales', component: SalesManagement }, // <-- ROTA ADICIONADA AQUI
      
      { path: '', redirectTo: 'overview', pathMatch: 'full' }
    ]
  },

  // Rotas de fallback
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];