import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { from, Observable, of } from 'rxjs';

// Imports do Material
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

// Imports de Serviços e Componentes
import { DatabaseService } from '../../../services/database.service';
import { AppUser } from '../../../services/auth';
import { ConfirmDialog } from '../../dialogs/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-requests',
  standalone: true,
  imports: [ CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule ],
  templateUrl: './requests.html',
  styleUrl: './requests.scss'
})
export class Requests implements OnInit {
  private dbService = inject(DatabaseService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  public pendingUsers$: Observable<AppUser[]>;
  public displayedColumns: string[] = ['name', 'email', 'th', 'actions'];

  constructor() {
    this.pendingUsers$ = of([]);
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.pendingUsers$ = from(this.dbService.getPendingUsers());
  }

  onApprove(user: AppUser): void {
    this.dbService.updateUserProfile(user.uid, { status: 'active' })
      .then(() => {
        this.snackBar.open(`Usuário "${user.name}" aprovado com sucesso!`, 'Fechar', { duration: 3000 });
        this.loadRequests(); // Recarrega a lista
      })
      .catch(err => console.error("Erro ao aprovar usuário:", err));
  }

  onReject(user: AppUser): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        message: `Tem certeza que deseja REJEITAR e EXCLUIR o cadastro de "${user.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.dbService.fullyDeleteAgent(user.uid)
          .then(() => {
            this.snackBar.open('Cadastro rejeitado com sucesso.', 'Fechar', { duration: 3000 });
            this.loadRequests(); // Recarrega a lista
          });
      }
    });
  }
}