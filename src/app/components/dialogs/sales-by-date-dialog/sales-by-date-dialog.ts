import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Sale } from '../../../models/sale.model';
import { DatabaseService } from '../../../services/database.service';

@Component({
  selector: 'app-sales-by-date-dialog',
  standalone: true,
  imports: [
    CommonModule, MatProgressSpinnerModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatDividerModule
  ],
  templateUrl: './sales-by-date-dialog.html',
  styleUrl: './sales-by-date-dialog.scss'
})
export class SalesByDateDialog implements OnInit {
  private dbService = inject(DatabaseService);
  public data: { title: string, date: Date } = inject(MAT_DIALOG_DATA);

  isLoading = true;
  sales: Sale[] = [];

  ngOnInit(): void {
    this.loadSales();
  }

  async loadSales() {
    this.isLoading = true;
    try {
      // 1. Busca todos os usuários e todas as vendas da data em paralelo
      const [users, salesResult] = await Promise.all([
        this.dbService.getAllUsers(),
        this.dbService.getSalesForDate(this.data.date)
      ]);

      // 2. Cria um mapa (ID do usuário -> Nome do usuário) para consulta rápida
      const userMap = new Map(users.map(user => [user.uid, user.name]));

      // 3. "Enriquece" os dados de venda com o nome do agente
      const enrichedSales = salesResult.map(sale => ({
        ...sale,
        agentName: userMap.get(sale.agentUid) || 'Agente Desconhecido'
      }));

      // 4. Ordena a lista final pelo nome do agente em ordem alfabética
      enrichedSales.sort((a, b) => a.agentName!.localeCompare(b.agentName!));

      this.sales = enrichedSales;

    } catch (error) {
      console.error("Erro ao carregar vendas do dia:", error);
    } finally {
      this.isLoading = false;
    }
  }
}