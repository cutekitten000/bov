import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { Sale } from '../../../models/sale.model';
import { AppUser } from '../../../services/auth';
import { DatabaseService } from '../../../services/database.service';

// Interface para os dados processados do ranking
export interface RankingData {
  th: string;
  name: string;
  concluidas: number;
  canceladas: number;
  aprovisionamento: number;
  total: number;
}

@Component({
  selector: 'app-team-ranking-dialog',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatIconModule, MatButtonModule,
    MatDialogModule, MatProgressSpinnerModule
  ],
  templateUrl: './team-ranking-dialog.html',
  styleUrl: './team-ranking-dialog.scss'
})
export class TeamRankingDialog implements OnInit {
  private dbService = inject(DatabaseService);

  isLoading = true;
  title = 'BOV do Mês'; // Será dinâmico no futuro
  displayedColumns: string[] = ['rank', 'th', 'concluidas', 'canceladas', 'aprovisionamento', 'total'];
  dataSource = new MatTableDataSource<RankingData>();

  ngOnInit(): void {
    this.loadRankingData();
  }

  async loadRankingData() {
    this.isLoading = true;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    this.title = `BOV do Mês ${String(month).padStart(2, '0')}/${year}`;

    try {
      const [users, sales] = await Promise.all([
        this.dbService.getAllUsers(),
        this.dbService.getAllSalesForMonth(year, month)
      ]);
      this.processRankingData(users, sales);
    } catch (error) {
      console.error("Erro ao carregar dados do ranking:", error);
    } finally {
      this.isLoading = false;
    }
  }

   private processRankingData(users: AppUser[], sales: Sale[]): void {
    const agentSalesMap = new Map<string, RankingData>();

    // Inicializa o mapa com todos os agentes
    users.forEach(user => {
      if(user.role === 'agent') {
        agentSalesMap.set(user.uid, {
          th: user.th,
          name: user.name,
          concluidas: 0,
          canceladas: 0,
          aprovisionamento: 0,
          total: 0
        });
      }
    });

    // Processa cada venda e atualiza os contadores
    sales.forEach(sale => {
      const agentData = agentSalesMap.get(sale.agentUid);
      if (agentData) {
        if (sale.status === 'Instalada') agentData.concluidas++;
        if (sale.status === 'Cancelada') agentData.canceladas++;
        if (sale.status === 'Em Aprovisionamento') agentData.aprovisionamento++;
      }
    });
    
    // Calcula o total e converte o mapa para um array
    const rankingArray = Array.from(agentSalesMap.values()).map(agent => ({
      ...agent,
      total: agent.concluidas + agent.canceladas + agent.aprovisionamento
    }));
    
    // --- NOVA LÓGICA DE ORDENAÇÃO COM MÚLTIPLOS CRITÉRIOS ---
    rankingArray.sort((a, b) => {
      // 1. Critério primário: Mais vendas 'Concluídas'
      if (b.concluidas !== a.concluidas) {
        return b.concluidas - a.concluidas;
      }
      // 2. Critério de desempate: Mais vendas no 'Total'
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      // 3. Critério de desempate final: Mais vendas em 'Aprovisionamento'
      return b.aprovisionamento - a.aprovisionamento;
    });
    
    this.dataSource.data = rankingArray;
  }
}