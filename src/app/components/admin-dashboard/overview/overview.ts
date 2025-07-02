import { AsyncPipe, CommonModule } from '@angular/common'; // Importe AsyncPipe
import { Component, inject, OnInit } from '@angular/core';
import { forkJoin, from, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

// Imports do Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

// Imports de Serviços
import { Sale } from '../../../models/sale.model';
import { AppUser } from '../../../services/auth';
import { DatabaseService } from '../../../services/database.service';

// Interface para organizar os dados dos nossos KPIs
export interface AdminKpis {
  pendingRequests: number;
  activeAgents: number;
  monthlySales: number;
  topAgent: { name: string, sales: number };
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, AsyncPipe, MatCardModule, MatIconModule],
  templateUrl: './overview.html',
  styleUrl: './overview.scss'
})
export class Overview implements OnInit {
  private dbService = inject(DatabaseService);

  public kpis$: Observable<AdminKpis | null>;

  constructor() {
    this.kpis$ = of(null); // Inicializa como nulo
  }

  ngOnInit(): void {
    this.loadKpis();
  }

  loadKpis(): void {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    // Usamos forkJoin para buscar todos os dados necessários em paralelo
    this.kpis$ = forkJoin({
      pendingUsers: from(this.dbService.getPendingUsers()),
      agents: from(this.dbService.getAgents()),
      monthlySales: from(this.dbService.getAllSalesForMonth(currentYear, currentMonth))
    }).pipe(
      map(result => {
        const { pendingUsers, agents, monthlySales } = result;

        // Calcula o agente com mais vendas
        const topAgent = this.calculateTopAgent(monthlySales, agents);

        // Retorna o objeto final com todos os KPIs calculados
        return {
          pendingRequests: pendingUsers.length,
          activeAgents: agents.length,
          monthlySales: monthlySales.length,
          topAgent: topAgent
        };
      })
    );
  }

  private calculateTopAgent(sales: Sale[], agents: AppUser[]): { name: string, sales: number } {
    if (sales.length === 0 || agents.length === 0) {
      return { name: 'N/A', sales: 0 };
    }

    const salesByAgent = new Map<string, number>();
    
    // Conta as vendas por agente
    for (const sale of sales) {
      const count = salesByAgent.get(sale.agentUid) || 0;
      salesByAgent.set(sale.agentUid, count + 1);
    }

    if (salesByAgent.size === 0) {
      return { name: 'N/A', sales: 0 };
    }

    // Encontra o ID do agente com mais vendas
    let topAgentId = '';
    let maxSales = 0;
    for (const [agentId, salesCount] of salesByAgent.entries()) {
      if (salesCount > maxSales) {
        maxSales = salesCount;
        topAgentId = agentId;
      }
    }

    // Encontra o nome do agente correspondente
    const topAgentInfo = agents.find(agent => agent.uid === topAgentId);

    return {
      name: topAgentInfo?.name || 'Desconhecido',
      sales: maxSales
    };
  }
}