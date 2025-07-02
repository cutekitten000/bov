import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { combineLatest, from, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

// Imports do Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

// Imports de Serviços e Componentes
import { AppUser, AuthService } from '../../../services/auth';
import { DatabaseService } from '../../../services/database.service';
import { ConfirmDialog } from '../../dialogs/confirm-dialog/confirm-dialog';
import { EditUser } from '../../dialogs/edit-user/edit-user';



@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './team-management.html',
  styleUrl: './team-management.scss'
})
export class TeamManagement implements OnInit {
  private dbService = inject(DatabaseService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  public usersWithKpis$: Observable<any[]>;

  public displayedColumns: string[] = ['name', 'th', 'instalada', 'aprovisionamento', 'cancelada', 'pendencia', 'total', 'metaProgress', 'actions'];

  constructor() {
    this.usersWithKpis$ = of([]);
  }

  ngOnInit(): void {
    this.loadUsersAndSalesData();
  }

  loadUsersAndSalesData(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    // Busca agentes e as vendas do mês em paralelo
    this.usersWithKpis$ = combineLatest({
      agents: from(this.dbService.getAgents()),
      sales: from(this.dbService.getAllSalesForMonth(year, month))
    }).pipe(
      map(result => {
        const { agents, sales } = result;

        // Para cada agente, calcula seus KPIs de vendas
        return agents.map(agent => {
          const agentSales = sales.filter(sale => sale.agentUid === agent.uid);

          const kpis = {
            instalada: agentSales.filter(s => s.status === 'Instalada').length,
            aprovisionamento: agentSales.filter(s => s.status === 'Em Aprovisionamento').length,
            cancelada: agentSales.filter(s => s.status === 'Cancelada').length,
            pendencia: agentSales.filter(s => s.status === 'Pendência').length,
            total: 0,
            metaProgress: 0
          };

          kpis.total = kpis.instalada + kpis.aprovisionamento;

          if (agent.salesGoal > 0) {
            kpis.metaProgress = (kpis.instalada / agent.salesGoal) * 100;
          }

          return { ...agent, kpis };
        });
      })
    );
  }

  onEditUser(user: AppUser): void {
    const dialogRef = this.dialog.open(EditUser, {
      width: '450px',
      data: { user: user },
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dbService.updateUserProfile(user.uid, result)
          .then(() => {
            this.snackBar.open("Usuário atualizado com sucesso!", 'Fechar', { duration: 3000 });
            this.loadUsersAndSalesData();
          })
          .catch(err => console.error("Erro ao atualizar usuário:", err));
      }
    });
  }

  onDeleteUser(user: AppUser): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        // Mensagem de confirmação mais forte
        message: `Tem certeza que deseja excluir PERMANENTEMENTE o agente "${user.name}"? Todas as suas vendas e seu acesso serão removidos.`
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        // MUDANÇA AQUI: Chama a nova função de exclusão completa do serviço
        this.dbService.fullyDeleteAgent(user.uid)
          .then(() => {
            this.snackBar.open('Agente e todos os seus dados foram excluídos.', 'Fechar', { duration: 4000 });
            this.loadUsersAndSalesData(); // Recarrega a tabela
          })
          .catch(err => {
            console.error("Erro na exclusão completa:", err);
            this.snackBar.open('Ocorreu um erro na exclusão completa do agente.', 'Fechar', { duration: 4000 });
          });
      }
    });
  }

  onResetPassword(user: AppUser): void {
    if (!user.email) {
      this.snackBar.open('Este usuário não possui um email cadastrado.', 'Fechar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: { message: `Tem certeza que deseja enviar um link de redefinição de senha para ${user.name}?` }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.authService.resetPasswordForUser(user.email!)
          .then(() => {
            this.snackBar.open(`Email de redefinição enviado para ${user.email}.`, 'Fechar', { duration: 4000 });
          })
          .catch(err => {
            console.error("Erro ao resetar senha:", err);
            this.snackBar.open('Ocorreu um erro ao enviar o email.', 'Fechar', { duration: 4000 });
          });
      }
    });
  }
}