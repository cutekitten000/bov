import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable, of, switchMap, tap } from 'rxjs';

// --- Imports do Angular Material ---
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';

// --- Imports dos nossos arquivos ---
import { Sale } from '../../models/sale.model';
import { AppUser, AuthService } from '../../services/auth'; // Corrigido o caminho do import
import { DatabaseService } from '../../services/database.service';
import { SaleDialog } from '../dialogs/sale-dialog/sale-dialog';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatMenuModule,
    MatDialogModule,
  ],
  templateUrl: './agent-dashboard.html',
  styleUrl: './agent-dashboard.scss',
})
export class AgentDashboard implements OnInit {
  // --- Injeção de Dependências ---
  authService = inject(AuthService);
  dbService = inject(DatabaseService);
  router = inject(Router);
  dialog = inject(MatDialog);

  // --- Propriedades da Classe ---

  // <<<< SOLUÇÃO APLICADA AQUI >>>>
  // A lógica foi movida do constructor para a declaração da propriedade.
  // Isso garante ao TypeScript que 'agent$' NUNCA será 'undefined'.
  agent$: Observable<AppUser | null> = this.authService.authState$.pipe(
    switchMap(user => user ? this.dbService.getUserProfile(user.uid) : of(null)),
    tap(agent => {
      this.agent = agent;
      if (agent) {
        this.kpi.meta = agent.salesGoal || 26;
        this.loadSalesData();
      }
    })
  );

  private agent: AppUser | null = null;

  kpi = {
    aprovisionamento: 0,
    instalada: 0,
    pendencia: 0,
    canceladas: 0,
    total: 0,
    meta: 26
  };

  displayedColumns: string[] = ['status', 'cpfCnpj', 'saleDate', 'installationDate', 'period', 'actions'];
  dataSource = new MatTableDataSource<Sale>();

  // O constructor agora pode ficar vazio ou ser removido se não houver mais nada nele.
  constructor() {}

  ngOnInit(): void {
    // Agora esta chamada é 100% segura, pois o TypeScript sabe que 'agent$' sempre terá um valor.
    this.agent$.subscribe();
  }

  loadSalesData(): void {
    if (!this.agent) return;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    this.dbService.getSalesForAgent(this.agent.uid, year, month).then(sales => {
      this.dataSource.data = sales;
      this.updateKpis(sales);
    });
  }

  updateKpis(sales: Sale[]): void {
    this.kpi.aprovisionamento = sales.filter(s => s.status === 'Em Aprovisionamento').length;
    this.kpi.instalada = sales.filter(s => s.status === 'Instalada').length;
    this.kpi.pendencia = sales.filter(s => s.status === 'Pendência').length;
    this.kpi.canceladas = sales.filter(s => s.status === 'Cancelada').length;
    this.kpi.total = this.kpi.instalada;
  }

  openSaleDialog(): void {
    if (!this.agent) return;
    const dialogRef = this.dialog.open(SaleDialog, {
      width: '1000px',
      maxWidth: '95vw',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && this.agent) {
        if (result.saleDate && result.installationDate) {
          const saleDateAsJSDate = (result.saleDate as any).toDate();
          const installationDateAsJSDate = (result.installationDate as any).toDate();

          const saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'> = {
            ...result,
            saleDate: saleDateAsJSDate,
            installationDate: installationDateAsJSDate,
            agentUid: this.agent.uid,
          } as Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>;

          this.dbService
            .addSale(saleData)
            .then(() => {
              console.log('Venda salva com sucesso!');
              this.loadSalesData();
            })
            .catch((err) => console.error('Erro ao salvar venda:', err));
        } else {
          console.error("Dados de data ausentes no retorno do modal.", result);
        }
      }
    });
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}