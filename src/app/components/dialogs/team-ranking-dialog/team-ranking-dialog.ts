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
  displayedColumns: string[] = ['rank', 'th', 'name', 'concluidas', 'canceladas', 'aprovisionamento', 'total'];
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

    users.forEach(user => {
      if (user.role === 'agent') {
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

    sales.forEach(sale => {
      const agentData = agentSalesMap.get(sale.agentUid);
      if (agentData) {
        if (sale.status === 'Instalada') agentData.concluidas++;
        if (sale.status === 'Cancelada') agentData.canceladas++;
        if (sale.status === 'Em Aprovisionamento') agentData.aprovisionamento++;
      }
    });

    const rankingArray = Array.from(agentSalesMap.values()).map(agent => ({
      ...agent,
      total: agent.concluidas + agent.canceladas + agent.aprovisionamento
    }));

    rankingArray.sort((a, b) => b.concluidas - a.concluidas);

    this.dataSource.data = rankingArray;
  }
}