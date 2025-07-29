import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

// Imports do Angular Material
import { Clipboard } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Nossos serviços, modelos e outros dialogs
import { User } from '@angular/fire/auth';
import { Script } from '../../../models/script.model';
import { AuthService } from '../../../services/auth';
import { DatabaseService } from '../../../services/database.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { ScriptEditDialog } from '../script-edit-dialog/script-edit-dialog';

@Component({
  selector: 'app-script-take-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './script-take-dialog.html',
  styleUrl: './script-take-dialog.scss'
})
export class ScriptTakeDialog implements OnInit {
  // Injeção de Dependências
  private authService = inject(AuthService);
  private dbService = inject(DatabaseService);
  private dialog = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<ScriptTakeDialog>);
  private snackBar = inject(MatSnackBar);
  private clipboard = inject(Clipboard);

  // Propriedades de Estado
  isLoading = true;
  private user: User | null = null;
  scripts: Script[] = [];
  categories: string[] = [];
  selectedCategory: string = '';
  filteredScripts: Script[] = [];

  ngOnInit(): void {
    this.loadInitialData();
  }

  /**
   * Carrega todos os dados iniciais: usuário logado e seus scripts.
   * Também cria os scripts padrão se for o primeiro acesso.
   */
  async loadInitialData(): Promise<void> {
    this.isLoading = true;
    this.user = await this.authService.getCurrentUser();
    if (!this.user) {
      this.isLoading = false;
      return;
    }

    try {
      // Garante que os scripts padrão existam antes de buscá-los
      await this.dbService.checkAndCreateDefaultScripts(this.user as any); // Usamos 'any' para compatibilidade de tipo
      this.scripts = await this.dbService.getScriptsForUser(this.user.uid);

      // Define a ordem customizada das categorias na barra lateral
      const categoryOrder = [
        'Fraseologia', 'Ofertas', 'Cartão de Crédito', 'Análise de Crédito',
        'Agendamento', 'Checklist', 'Avisos Finais', 'Infos Úteis'
      ];

      const uniqueCategories = [...new Set(this.scripts.map(s => s.category))];

      this.categories = uniqueCategories.sort((a, b) => {
        return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
      });

      // Seleciona a primeira categoria da lista como padrão
      if (this.categories.length > 0) {
        this.selectCategory(this.categories[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar scripts:", error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Filtra os scripts a serem exibidos com base na categoria clicada.
   * @param category A categoria selecionada.
   */
  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.filteredScripts = this.scripts
      .filter(s => s.category === category)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Copia o conteúdo de um script para a área de transferência.
   * @param content O texto a ser copiado.
   */
  onCopy(content: string): void {
    this.clipboard.copy(content);
    this.snackBar.open('Texto copiado!', 'OK', { duration: 2500 });
  }

  /**
   * Abre o modal para adicionar um novo card de script.
   */
  onAddScript(): void {
    const dialogRef = this.dialog.open(ScriptEditDialog, {
      width: '600px',
      panelClass: 'custom-dialog-container',
      data: { category: this.selectedCategory }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.user) {
        const newScript: Omit<Script, 'id'> = {
          ...result,
          category: this.selectedCategory,
          order: this.scripts.length + 1
        };
        this.dbService.addScript(this.user.uid, newScript).then(() => {
          this.snackBar.open('Script adicionado com sucesso!', 'OK', { duration: 2500 });
          this.loadInitialData(); // Recarrega tudo para exibir o novo card
        });
      }
    });
  }

  /**
   * Abre o modal para editar um script existente.
   * @param script O script a ser editado.
   */
  onEditScript(script: Script): void {
    const dialogRef = this.dialog.open(ScriptEditDialog, {
      width: '600px',
      panelClass: 'custom-dialog-container',
      data: { script: script, category: this.selectedCategory }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.user) {
        this.dbService.updateScript(this.user.uid, script.id, result).then(() => {
          this.snackBar.open('Script atualizado com sucesso!', 'OK', { duration: 2500 });
          this.loadInitialData();
        });
      }
    });
  }

  /**
   * Abre um modal de confirmação e exclui um script.
   * @param script O script a ser excluído.
   */
  onDeleteScript(script: Script): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      panelClass: 'custom-dialog-container',
      data: { message: `Tem certeza que deseja excluir o card "${script.title}"?` }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed && this.user) {
        this.dbService.deleteScript(this.user.uid, script.id).then(() => {
          this.snackBar.open('Script excluído com sucesso!', 'OK', { duration: 2500 });
          this.loadInitialData();
        });
      }
    });
  }

  // Crie este método para fechar o modal
  close(): void {
    this.dialogRef.close();
  }
}