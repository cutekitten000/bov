import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Observable, combineLatest, from, of } from 'rxjs';
import { map } from 'rxjs/operators';

// Imports do Material
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// Imports de Serviços
import { DatabaseService } from '../../../services/database.service';
import { Sale } from '../../../models/sale.model';

@Component({
  selector: 'app-sales-management',
  standalone: true,
  imports: [ CommonModule, DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule ],
  templateUrl: './sales-management.html',
  styleUrl: './sales-management.scss'
})
export class SalesManagement implements OnInit {
  private dbService = inject(DatabaseService);

  public sales$: Observable<any[]>; // Usamos 'any' para acomodar o 'agentName'
  public displayedColumns: string[] = ['status', 'agentName', 'saleDate', 'customerCpfCnpj', 'customerPhone', 'ticket', 'os', 'actions'];

  constructor() {
    this.sales$ = of([]);
  }

  ngOnInit(): void {
    this.loadAllSales();
  }

  loadAllSales(): void {
    // Combina as buscas de todos os usuários e todas as vendas
    this.sales$ = combineLatest({
      users: from(this.dbService.getAllUsers()),
      sales: from(this.dbService.getAllSales())
    }).pipe(
      map(result => {
        const { users, sales } = result;

        // Cria um mapa (ID do usuário -> Nome do usuário) para consulta rápida
        const userMap = new Map(users.map(u => [u.uid, u.name]));

        // Adiciona o nome do agente a cada objeto de venda
        return sales.map(sale => ({
          ...sale,
          agentName: userMap.get(sale.agentUid) || 'Desconhecido'
        }));
      })
    );
  }

  // Funções de placeholder para as ações futuras
  onEditSale(sale: Sale) { alert(`Editando venda: ${sale.id}`); }
  onDeleteSale(sale: Sale) { alert(`Excluindo venda: ${sale.id}`); }
  openNotes(notes: string) { alert(`Notas: ${notes}`); }
}