import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { forkJoin, from, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Imports do Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

// Import da biblioteca de gráficos e seus tipos
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';

// Imports de Serviços e Modelos
import { DatabaseService } from '../../../services/database.service';
import { AppUser } from '../../../services/auth';
import { Sale } from '../../../models/sale.model';

// Interface para organizar os dados dos nossos KPIs
export interface AdminKpis {
  pendingRequests: number;
  activeAgents: number;
  conversionRate: number;
  topAgent: { name: string; sales: number };
  salesByStatus: { name: string; value: number }[];
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, AsyncPipe, MatCardModule, MatIconModule, NgxChartsModule],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
  animations: [
    // Animação para os cards aparecerem em cascata
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter',
          [
            style({ opacity: 0, transform: 'translateY(-20px)' }),
            stagger('100ms', animate('500ms ease-out', 
              style({ opacity: 1, transform: 'translateY(0)' })))
          ],
          { optional: true }
        )
      ])
    ])
  ]
})
export class Overview implements OnInit {
  private dbService = inject(DatabaseService);

  public kpis$: Observable<AdminKpis | null>;

  // Propriedade para o esquema de cores customizado do gráfico
  public colorScheme: Color = {
    name: 'vendasStatus',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#22c55e', '#ef4444', '#eab308', '#3b82f6'] // Cores para: Instaladas, Canceladas, Pendências, Aprovisionamento
  };

  constructor() {
    this.kpis$ = of(null);
  }

  ngOnInit(): void {
    this.loadKpis();
  }

  loadKpis(): void {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    this.kpis$ = forkJoin({
      pendingUsers: from(this.dbService.getPendingUsers()),
      agents: from(this.dbService.getAgents()),
      monthlySales: from(this.dbService.getAllSalesForMonth(currentYear, currentMonth))
    }).pipe(
      map(result => {
        const { pendingUsers, agents, monthlySales } = result;

        const installed = monthlySales.filter(s => s.status === 'Instalada').length;
        const provisioning = monthlySales.filter(s => s.status === 'Em Aprovisionamento').length;
        const pending = monthlySales.filter(s => s.status === 'Pendência').length;
        const canceled = monthlySales.filter(s => s.status === 'Cancelada').length;
        
        const totalConsideredForConversion = installed + canceled;
        const conversionRate = totalConsideredForConversion > 0 ? (installed / totalConsideredForConversion) * 100 : 0;
        const topAgent = this.calculateTopAgent(monthlySales.filter(s => s.status === 'Instalada'), agents);

        return {
          pendingRequests: pendingUsers.length,
          activeAgents: agents.length,
          conversionRate: Math.round(conversionRate),
          topAgent: topAgent,
          salesByStatus: [
            { name: "Instaladas", value: installed },
            { name: "Canceladas", value: canceled },
            { name: "Pendências", value: pending },
            { name: "Aprovisionamento", value: provisioning }
          ]
        };
      })
    );
  }

  private calculateTopAgent(installedSales: Sale[], agents: AppUser[]): { name: string, sales: number } {
    if (installedSales.length === 0 || agents.length === 0) {
      return { name: 'N/A', sales: 0 };
    }

    const salesByAgent = new Map<string, number>();
    
    for (const sale of installedSales) {
      const count = salesByAgent.get(sale.agentUid) || 0;
      salesByAgent.set(sale.agentUid, count + 1);
    }

    if (salesByAgent.size === 0) {
      return { name: 'N/A', sales: 0 };
    }

    let topAgentId = '';
    let maxSales = 0;
    for (const [agentId, salesCount] of salesByAgent.entries()) {
      if (salesCount > maxSales) {
        maxSales = salesCount;
        topAgentId = agentId;
      }
    }

    const topAgentInfo = agents.find(agent => agent.uid === topAgentId);

    return {
      name: topAgentInfo?.name || 'Desconhecido',
      sales: maxSales
    };
  }
}