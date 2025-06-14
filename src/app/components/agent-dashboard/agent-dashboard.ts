import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './agent-dashboard.html'
})
export class AgentDashboard {
  authService = inject(AuthService);
  router = inject(Router);

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}