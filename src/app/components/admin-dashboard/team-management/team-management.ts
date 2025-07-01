import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, from, of } from 'rxjs';

// Imports do Material
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

// Imports de Serviços e Componentes
import { DatabaseService } from '../../../services/database.service';
import { AppUser } from '../../../services/auth';
import { EditUser } from '../../dialogs/edit-user/edit-user';
import { ConfirmDialog } from '../../dialogs/confirm-dialog/confirm-dialog'; // <-- IMPORTE O DIALOG DE CONFIRMAÇÃO

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [ CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule ],
  templateUrl: './team-management.html',
  styleUrl: './team-management.scss'
})
export class TeamManagement implements OnInit {
  private dbService = inject(DatabaseService);
  private dialog = inject(MatDialog);

  public users$: Observable<AppUser[]>;
  public displayedColumns: string[] = ['name', 'email', 'th', 'role', 'actions'];

  constructor() {
    this.users$ = of([]);
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.users$ = from(this.dbService.getAgents());
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
            console.log("Usuário atualizado com sucesso!");
            this.loadUsers();
          })
          .catch(err => console.error("Erro ao atualizar usuário:", err));
      }
    });
  }

  // ***** MÉTODO IMPLEMENTADO *****
  onDeleteUser(user: AppUser): void {
    // 1. Abre o dialog de confirmação
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        message: `Tem certeza que deseja excluir o agente "${user.name}"? Esta ação removerá seus dados do sistema.`
      }
    });

    // 2. Ouve o resultado do dialog
    dialogRef.afterClosed().subscribe(confirmed => {
      // 3. Se o admin confirmou...
      if (confirmed) {
        // ...chama o serviço para deletar o perfil do usuário
        this.dbService.deleteUserProfile(user.uid)
          .then(() => {
            alert('Usuário excluído com sucesso!');
            this.loadUsers(); // Recarrega a tabela para remover o usuário da lista
          })
          .catch(err => {
            console.error("Erro ao excluir usuário:", err);
            alert("Ocorreu um erro ao excluir o usuário.");
          });
      }
    });
  }

  onResetPassword(user: AppUser): void {
    alert(`Futuramente, aqui resetaremos a senha de: ${user.name}`);
  }
}