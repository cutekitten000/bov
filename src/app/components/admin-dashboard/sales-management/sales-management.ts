import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Observable, combineLatest, from, of } from 'rxjs';
import { map } from 'rxjs/operators';

// Imports do Material
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

// Imports de Serviços e Componentes
import { DatabaseService } from '../../../services/database.service';
import { Sale } from '../../../models/sale.model';
import { ViewNotesDialog } from '../../dialogs/view-notes-dialog/view-notes-dialog'; // <-- Importe o dialog de notas
import { ConfirmDialog } from '../../dialogs/confirm-dialog/confirm-dialog';   // <-- Importe o dialog de confirmação

@Component({
  selector: 'app-sales-management',
  standalone: true,
  imports: [ CommonModule, DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule ],
  templateUrl: './sales-management.html',
  styleUrl: './sales-management.scss'
})
export class SalesManagement implements OnInit {
  private dbService = inject(DatabaseService);
  private dialog = inject(MatDialog); // Injete o MatDialog
  private snackBar = inject(MatSnackBar); // Injete o MatSnackBar para feedback

  public sales$: Observable<any[]>;
  public displayedColumns: string[] = ['status', 'agentName', 'saleDate', 'customerCpfCnpj', 'customerPhone', 'ticket', 'os', 'actions'];

  constructor() {
    this.sales$ = of([]);
  }

  ngOnInit(): void {
    this.loadAllSales();
  }

  loadAllSales(): void {
    this.sales$ = combineLatest({
      users: from(this.dbService.getAllUsers()),
      sales: from(this.dbService.getAllSales())
    }).pipe(
      map(result => {
        const { users, sales } = result;
        const userMap = new Map(users.map(u => [u.uid, u.name]));
        return sales.map(sale => ({
          ...sale,
          agentName: userMap.get(sale.agentUid) || 'Desconhecido'
        }));
      })
    );
  }
  
  // ***** MÉTODOS DE AÇÃO IMPLEMENTADOS *****

  /**
   * Abre um dialog para visualizar as notas de uma venda.
   */
  openNotes(notes: string): void {
    if (!notes || notes.trim() === '') return;

    this.dialog.open(ViewNotesDialog, {
      width: '500px',
      data: { notes: notes },
      panelClass: 'custom-dialog-container',
    });
  }

  /**
   * Inicia o processo de exclusão de uma venda, pedindo confirmação primeiro.
   */
  onDeleteSale(sale: Sale): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        message: `Tem certeza que deseja excluir a venda do CPF/CNPJ ${sale.customerCpfCnpj}?`
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.dbService.deleteSale(sale.id)
          .then(() => {
            this.snackBar.open('Venda excluída com sucesso.', 'Fechar', { duration: 3000 });
            this.loadAllSales(); // Recarrega a tabela
          })
          .catch(err => {
            console.error("Erro ao excluir venda:", err);
            this.snackBar.open('Erro ao excluir a venda.', 'Fechar', { duration: 3000 });
          });
      }
    });
  }

  // Ação de editar (manteremos como placeholder por enquanto)
  onEditSale(sale: Sale) { 
    alert(`Futuramente, aqui editaremos a venda: ${sale.id}`); 
  }
}