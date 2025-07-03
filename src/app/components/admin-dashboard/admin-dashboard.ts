import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';

// Imports do Angular Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

// Imports de Serviços e Componentes
import { AuthService, AppUser } from '../../services/auth';
import { DatabaseService } from '../../services/database.service';
import { ConfirmDialog } from '../../components/dialogs/confirm-dialog/confirm-dialog';
import { ChatDialog } from '../../components/dialogs/chat-dialog/chat-dialog'; // <-- IMPORT FALTANTE ADICIONADO
import { AdminLinks } from '../dialogs/admin-links/admin-links';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    AsyncPipe, RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatListModule, MatIconModule, MatDividerModule
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboard implements OnInit {
  private authService = inject(AuthService);
  private dbService = inject(DatabaseService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  adminName = 'Admin';

  ngOnInit(): void {
    this.authService.authState$.pipe(
      switchMap(user => user ? this.dbService.getUserProfile(user.uid) : of(null))
    ).subscribe(admin => {
      if (admin) {
        this.adminName = admin.name;
      }
    });
  }

  openAdminLinksDialog(): void {
    this.dialog.open(AdminLinks, {
      width: '1400px',
      maxWidth: '100%',
      panelClass: 'custom-dialog-container'
    });
  }
  
  // --- MÉTODO FALTANTE ADICIONADO AQUI ---
  openChat(): void {
    this.dialog.open(ChatDialog, {
      width: '90vw',
      height: '90vh',
      maxWidth: '1400px',
      panelClass: 'custom-dialog-container',
    });
  }

  clearChat(): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        message: 'Tem certeza que deseja apagar TODO o histórico do Chat da Equipe? Esta ação não pode ser desfeita.'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.dbService.clearGroupChat()
          .then(() => {
            this.snackBar.open('Histórico do chat da equipe foi limpo com sucesso.', 'Fechar', { duration: 4000 });
          })
          .catch(err => {
            console.error("Erro ao limpar o chat:", err);
            this.snackBar.open('Ocorreu um erro ao limpar o chat.', 'Fechar', { duration: 4000 });
          });
      }
    });
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}