import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// Imports do Angular Material
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';

// Imports de Serviços e Componentes
import { ChatDialog } from '../../components/dialogs/chat-dialog/chat-dialog'; // <-- IMPORT FALTANTE ADICIONADO
import { ConfirmDialog } from '../../components/dialogs/confirm-dialog/confirm-dialog';
import { AuthService } from '../../services/auth';
import { DatabaseService } from '../../services/database.service';
import { AdminLinks } from '../dialogs/admin-links/admin-links';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
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
  isClearingChat = false;

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
        message: 'Tem certeza que deseja apagar PERMANENTEMENTE todo o histórico e os arquivos do Chat da Equipe? Esta ação é irreversível.'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isClearingChat = true; // Ativa o loading
        this.dbService.clearGroupChat()
          .then((result) => {
            console.log("Cloud Function executada com sucesso:", result);
            this.snackBar.open('O chat da equipe e seus arquivos foram limpos com sucesso.', 'Fechar', { duration: 4000 });
          })
          .catch(err => {
            console.error("Erro ao chamar a função de limpar chat:", err);
            this.snackBar.open('Ocorreu um erro ao limpar o chat.', 'Fechar', { duration: 4000 });
          })
          .finally(() => {
            this.isClearingChat = false; // Desativa o loading, mesmo se der erro
          });
      }
    });
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}