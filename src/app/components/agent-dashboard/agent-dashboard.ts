import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable, switchMap, of } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService, AppUser } from '../../services/auth';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatMenuModule
  ],
  templateUrl: './agent-dashboard.html',
  styleUrl: './agent-dashboard.scss'
})
export class AgentDashboard implements OnInit {
  authService = inject(AuthService);
  dbService = inject(DatabaseService);
  router = inject(Router);

  agent$: Observable<AppUser | null> | undefined;

  // Dados estáticos para os cards
  kpiCards = [
    { title: 'Aprovisionamento', value: 5, color: 'blue' },
    { title: 'Instalada', value: 12, color: 'green' },
    { title: 'Pendência', value: 2, color: 'yellow' },
    { title: 'Canceladas', value: 1, color: 'red' },
    { title: 'Total/Meta', value: '17/26', color: 'purple' },
  ];

  // Dados estáticos para a tabela
  displayedColumns: string[] = ['status', 'cpfCnpj', 'saleDate', 'installationDate', 'period', 'customerPhone', 'ticket', 'os', 'actions'];
  dataSource = [
    { status: 'Instalada', cpfCnpj: '123.456.789-00', saleDate: '10/06/2025', installationDate: '12/06/2025', period: 'Manhã', customerPhone: '(11) 98765-4321', ticket: 'TKT-123', os: 'OS-456' },
    { status: 'Em Aprovisionamento', cpfCnpj: '987.654.321-00', saleDate: '11/06/2025', installationDate: '15/06/2025', period: 'Tarde', customerPhone: '(21) 91234-5678', ticket: 'TKT-124', os: 'OS-457' },
  ];

  ngOnInit(): void {
    this.agent$ = this.authService.authState$.pipe(
      switchMap(user => {
        if (user) {
          return this.dbService.getUserProfile(user.uid);
        } else {
          return of(null);
        }
      })
    );
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}