import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// ADICIONE 'from' e 'of' AOS IMPORTS DO RXJS
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
    // Inicializa o observable com um array vazio para evitar erros
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
            this.loadUsers(); // Recarrega a lista para mostrar as alterações
          })
          .catch(err => console.error("Erro ao atualizar usuário:", err));
      }
    });
  }

  onDeleteUser(user: AppUser): void {
    alert(`Futuramente, aqui deletaremos o usuário: ${user.name}`);
  }

  onResetPassword(user: AppUser): void {
    alert(`Futuramente, aqui resetaremos a senha de: ${user.name}`);
  }
}