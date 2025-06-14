import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable, switchMap, of } from 'rxjs';

// --- Imports do Angular Material ---
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';

// --- Imports dos nossos arquivos ---
import { AuthService, AppUser } from '../../services/auth';
import { DatabaseService } from '../../services/database.service';
import { Sale } from '../../models/sale.model'; // <-- FIX: Importação do modelo 'Sale' que faltava.
import { SaleDialog } from '../dialogs/sale-dialog/sale-dialog'; // <-- FIX: Importação do componente de dialog que faltava.

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
    MatMenuModule,
    MatDialogModule
  ],
  templateUrl: './agent-dashboard.html',
  styleUrl: './agent-dashboard.scss'
})
export class AgentDashboard implements OnInit {
  // --- Injeção de Dependências ---
  authService = inject(AuthService);
  dbService = inject(DatabaseService);
  router = inject(Router);
  dialog = inject(MatDialog); // <-- FIX: Injeção do serviço MatDialog que faltava.

  // --- Propriedades da Classe ---
  agent$: Observable<AppUser | null> | undefined;
  private agent: AppUser | null = null; // <-- FIX: Propriedade para guardar os dados do agente resolvido.

  // Dados estáticos (placeholders)
  kpiCards = [
    { title: 'Aprovisionamento', value: 5, color: 'blue' },
    { title: 'Instalada', value: 12, color: 'green' },
    { title: 'Pendência', value: 2, color: 'yellow' },
    { title: 'Canceladas', value: 1, color: 'red' },
    { title: 'Total/Meta', value: '17/26', color: 'purple' },
  ];
  displayedColumns: string[] = ['status', 'cpfCnpj', 'saleDate', 'installationDate', 'period', 'customerPhone', 'ticket', 'os', 'actions'];
  dataSource = [
    { status: 'Instalada', cpfCnpj: '123.456.789-00', saleDate: '10/06/2025', installationDate: '12/06/2025', period: 'Manhã', customerPhone: '(11) 98765-4321', ticket: 'TKT-123', os: 'OS-456' },
    { status: 'Em Aprovisionamento', cpfCnpj: '987.654.321-00', saleDate: '11/06/2025', installationDate: '15/06/2025', period: 'Tarde', customerPhone: '(21) 91234-5678', ticket: 'TKT-124', os: 'OS-457' },
  ];

  ngOnInit(): void {
    // Busca o perfil do usuário do banco de dados
    this.agent$ = this.authService.authState$.pipe(
      switchMap(user => user ? this.dbService.getUserProfile(user.uid) : of(null))
    );

    // <-- FIX: Extrai os dados do agente do observable e guarda na variável 'agent' para uso em outros métodos.
    this.agent$.subscribe(agentData => {
      this.agent = agentData;
    });
  }

  openSaleDialog(): void {
    const dialogRef = this.dialog.open(SaleDialog, {
      width: '800px',
      disableClose: true
    });

    // <-- FIX: Adicionado o tipo de dado para 'result' para evitar o erro de 'any'.
    dialogRef.afterClosed().subscribe((result: Partial<Sale>) => {
      // <-- FIX: Usa 'this.agent' que agora contém os dados, em vez de 'this.agent$'.
      if (result && this.agent) {
        console.log('Dados da nova venda:', result);

        const saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'> = {
          ...result,
          agentUid: this.agent.uid // <-- FIX: Agora 'this.agent.uid' existe.
        } as Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>;

        this.dbService.addSale(saleData)
          .then(() => console.log('Venda salva com sucesso!'))
          .catch(err => console.error('Erro ao salvar venda:', err));
      }
    });
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}