import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, combineLatest, from, of, startWith } from 'rxjs';
import { map } from 'rxjs/operators';

// Imports do Material
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';

// Imports de Serviços e Componentes
import { DatabaseService } from '../../../services/database.service';
import { Sale } from '../../../models/sale.model';
import { ViewNotesDialog } from '../../dialogs/view-notes-dialog/view-notes-dialog';
import { ConfirmDialog } from '../../dialogs/confirm-dialog/confirm-dialog';
import { SaleDialog } from '../../dialogs/sale-dialog/sale-dialog'; // <-- Importe o dialog de venda

@Component({
  selector: 'app-sales-management',
  standalone: true,
  imports: [ 
    CommonModule, DatePipe, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule, 
    MatTooltipModule, MatFormFieldModule, MatInputModule, MatDatepickerModule
  ],
  templateUrl: './sales-management.html',
  styleUrl: './sales-management.scss'
})
export class SalesManagement implements OnInit {
  private dbService = inject(DatabaseService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  public dataSource = new MatTableDataSource<any>();
  public displayedColumns: string[] = ['status', 'agentName', 'saleDate', 'customerCpfCnpj', 'customerPhone', 'ticket', 'os', 'actions'];

  public textFilter = new FormControl('');
  public dateRangeFilter = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  private originalData: any[] = [];

  ngOnInit(): void {
    this.loadAllSales();
    this.setupCombinedFilters();
  }

  loadAllSales(): void {
    combineLatest({
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
    ).subscribe(enrichedSales => {
      this.originalData = enrichedSales;
      this.dataSource.data = enrichedSales;
    });
  }
  
  setupCombinedFilters(): void {
    combineLatest([
      this.textFilter.valueChanges.pipe(startWith('')),
      this.dateRangeFilter.valueChanges.pipe(startWith({ start: null, end: null }))
    ]).subscribe(([text, dateRange]) => {
      const filterText = (text || '').trim().toLowerCase();
      const { start, end } = dateRange;
      let dateFilteredData = this.originalData;
      if (start && end) {
        const inclusiveEndDate = new Date(end);
        inclusiveEndDate.setHours(23, 59, 59, 999);
        dateFilteredData = this.originalData.filter(item => {
          const itemDate = new Date(item.saleDate);
          return itemDate >= start && itemDate <= inclusiveEndDate;
        });
      }
      const textAndDateFilteredData = dateFilteredData.filter(item => {
        const searchString = ((item.agentName || '') + (item.customerCpfCnpj || '') + (item.ticket || '') + (item.os || '')).toLowerCase();
        return searchString.includes(filterText);
      });
      this.dataSource.data = textAndDateFilteredData;
    });
  }

  openNotes(notes: string): void {
    if (!notes || notes.trim() === '') return;
    this.dialog.open(ViewNotesDialog, {
      width: '500px',
      data: { notes: notes },
      panelClass: 'custom-dialog-container',
    });
  }

  onDeleteSale(sale: Sale): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: { message: `Tem certeza que deseja excluir a venda do CPF/CNPJ ${sale.customerCpfCnpj}?` }
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.dbService.deleteSale(sale.id).then(() => {
          this.snackBar.open('Venda excluída com sucesso.', 'Fechar', { duration: 3000 });
          this.loadAllSales();
        });
      }
    });
  }

  // ***** MÉTODO IMPLEMENTADO *****
  onEditSale(sale: Sale): void {
    const dialogRef = this.dialog.open(SaleDialog, {
      width: '1000px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: ['custom-dialog-container', 'custom-overlay-panel'],
      data: { sale: sale } // Passa os dados da venda selecionada para o dialog
    });

    dialogRef.afterClosed().subscribe(result => {
      // Se o dialog retornou um resultado (ou seja, o usuário salvou)...
      if (result) {
        const saleDate = result.saleDate?.toDate ? result.saleDate.toDate() : result.saleDate;
        const installationDate = result.installationDate?.toDate ? result.installationDate.toDate() : result.installationDate;

        const updatedData = { ...result, saleDate, installationDate };
        
        this.dbService.updateSale(sale.id, updatedData)
          .then(() => {
            this.snackBar.open('Venda atualizada com sucesso!', 'Fechar', { duration: 3000 });
            this.loadAllSales(); // Recarrega os dados para mostrar a alteração
          })
          .catch(err => console.error("Erro ao atualizar venda:", err));
      }
    });
  }
}