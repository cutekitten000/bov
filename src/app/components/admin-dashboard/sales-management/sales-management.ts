import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest, from, of, startWith } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

// Imports do Angular Material
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
import { SaleDialog } from '../../dialogs/sale-dialog/sale-dialog';

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
  private route = inject(ActivatedRoute);

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
    this.route.paramMap.pipe(
      switchMap(params => {
        const period = params.get('period');
        this.setInitialDateFilter(period);

        return combineLatest({
          users: from(this.dbService.getAllUsers()),
          sales: from(this.dbService.getAllSales())
        });
      }),
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
      // Dispara o filtro uma vez na carga inicial para aplicar o filtro de data vindo da rota
      this.dateRangeFilter.updateValueAndValidity({ onlySelf: true, emitEvent: true });
    });
  }
  
   setInitialDateFilter(period: string | null): void {
    const today = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (period === 'day') {
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      startDate = new Date(yesterday);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(yesterday);
      endDate.setHours(23, 59, 59, 999)
    } else if (period === 'week') {
      const firstDayOfWeek = new Date(today);
      // Subtrai o dia da semana (domingo=0, segunda=1...) para encontrar o último domingo
      firstDayOfWeek.setDate(today.getDate() - today.getDay());
      firstDayOfWeek.setHours(0, 0, 0, 0);

      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6); // Adiciona 6 dias para chegar no sábado
      lastDayOfWeek.setHours(23, 59, 59, 999);

      startDate = firstDayOfWeek;
      endDate = lastDayOfWeek;
    } else if (period === 'month') {
      const year = today.getFullYear();
      const month = today.getMonth();
      startDate = new Date(year, month, 1); // Primeiro dia do mês corrente
      endDate = new Date(year, month + 1, 0); // Último dia do mês corrente
    }

    // Usamos patchValue para definir os valores do formulário
    this.dateRangeFilter.patchValue({ start: startDate, end: endDate }, { emitEvent: false });
  }

  setupCombinedFilters(): void {
    combineLatest([
      this.textFilter.valueChanges.pipe(startWith('')),
      this.dateRangeFilter.valueChanges.pipe(startWith(this.dateRangeFilter.value))
    ]).subscribe(([text, dateRange]) => {
      
      const filterText = (text || '').trim().toLowerCase();
      const { start, end } = dateRange || { start: null, end: null };

      // 1. Filtra por data
      let dateFilteredData = this.originalData;
      if (start && end) {
        const inclusiveEndDate = new Date(end);
        inclusiveEndDate.setHours(23, 59, 59, 999);

        dateFilteredData = this.originalData.filter(item => {
          const itemDate = new Date(item.saleDate);
          return itemDate >= start && itemDate <= inclusiveEndDate;
        });
      }

      // 2. Filtra o resultado do filtro de data pelo texto
      const textAndDateFilteredData = dateFilteredData.filter(item => {
        const searchString = (
          (item.agentName || '') +
          (item.customerCpfCnpj || '') +
          (item.ticket || '') +
          (item.os || '')
        ).toLowerCase();
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

  onEditSale(sale: Sale): void { 
    const dialogRef = this.dialog.open(SaleDialog, {
      width: '1000px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: ['custom-dialog-container', 'custom-overlay-panel'],
      data: { sale: sale }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const saleDate = result.saleDate?.toDate ? result.saleDate.toDate() : result.saleDate;
        const installationDate = result.installationDate?.toDate ? result.installationDate.toDate() : result.installationDate;
        const updatedData = { ...result, saleDate, installationDate };
        
        this.dbService.updateSale(sale.id, updatedData)
          .then(() => {
            this.snackBar.open('Venda atualizada com sucesso!', 'Fechar', { duration: 3000 });
            this.loadAllSales();
          });
      }
    });
  }
}