// =============================================
// IMPORTS DO ANGULAR E LIBS
// =============================================
import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import moment from 'moment';
import { Observable, of, switchMap, tap } from 'rxjs';

// =============================================
// IMPORTS DO ANGULAR MATERIAL
// =============================================
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatDatepicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';

// =============================================
// IMPORTS LOCAIS DA APLICAÇÃO
// =============================================
import { Sale } from '../../models/sale.model';
import { AppUser, AuthService } from '../../services/auth';
import { DatabaseService } from '../../services/database.service';
import { ConfirmDialog } from '../dialogs/confirm-dialog/confirm-dialog';
import { SaleDialog } from '../dialogs/sale-dialog/sale-dialog';

/**
 * Componente principal do Dashboard do Agente.
 * Exibe KPIs, uma tabela de vendas e permite a criação e filtragem de dados.
 */
@Component({
    selector: 'app-agent-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        DatePipe,
        RouterModule,
        ReactiveFormsModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatTableModule,
        MatMenuModule,
        MatDialogModule,
        MatInputModule,
        MatDatepickerModule,
        MatFormFieldModule,
    ],
    templateUrl: './agent-dashboard.html',
    styleUrl: './agent-dashboard.scss',
})
export class AgentDashboard implements OnInit {
    // =============================================
    // INJEÇÃO DE DEPENDÊNCIAS
    // =============================================
    private authService = inject(AuthService);
    private dbService = inject(DatabaseService);
    private router = inject(Router);
    private dialog = inject(MatDialog);

    // =============================================
    // PROPRIEDADES DE ESTADO E DADOS
    // =============================================
    /** Dados do agente logado, extraídos do observable `agent$`. */
    private agent: AppUser | null = null;

    /** Objeto para armazenar os valores dos cards de KPI. */
    kpi = {
        aprovisionamento: 0,
        instalada: 0,
        pendencia: 0,
        canceladas: 0,
        total: 0,
        meta: 26, // Valor padrão que será atualizado com os dados do agente
    };

    /** Controle do formulário para o seletor de Mês/Ano. */
    monthYearControl = new FormControl(moment());

    /** Fonte de dados para a MatTable, permite ordenação e filtro. */
    dataSource = new MatTableDataSource<Sale>();

    /** Colunas a serem exibidas na tabela. */
    displayedColumns: string[] = [
        'status',
        'cpfCnpj',
        'saleDate',
        'installationDate',
        'period',
        'actions',
    ];

    /** Observable que busca e mantém os dados do perfil do agente logado. */
    agent$: Observable<AppUser | null> = this.authService.authState$.pipe(
        // Quando o estado de autenticação muda, busca o perfil no Firestore
        switchMap((user) =>
            user ? this.dbService.getUserProfile(user.uid) : of(null)
        ),
        // Efeito colateral (tap): atualiza as propriedades locais com os dados do agente
        tap((agent) => {
            this.agent = agent;
            if (agent) {
                this.kpi.meta = agent.salesGoal || 26;
                // Carrega os dados de vendas do mês atual assim que o perfil do agente é carregado
                this.loadSalesData(
                    new Date().getFullYear(),
                    new Date().getMonth() + 1
                );
            }
        })
    );

    // =============================================
    // LIFECYCLE HOOKS
    // =============================================

    ngOnInit(): void {
        // A subscrição aqui 'ativa' o observable agent$, disparando o fluxo de busca de dados.
        this.agent$.subscribe();
    }

    // =============================================
    // MÉTODOS DE MANIPULAÇÃO DE DADOS
    // =============================================

    /**
     * Busca as vendas no Firestore para um agente e período específicos e atualiza a UI.
     * @param year O ano para a busca.
     * @param month O mês (1-12) para a busca.
     */
    private loadSalesData(year: number, month: number): void {
        if (!this.agent) return;

        this.dbService
            .getSalesForAgent(this.agent.uid, year, month)
            .then((sales) => {
                this.dataSource.data = sales; // Atualiza a tabela
                this.updateKpis(sales); // Atualiza os cards de KPI
            });
    }

    /**
     * Calcula os valores dos KPIs com base na lista de vendas atual.
     * @param sales A lista de vendas do período.
     */
    private updateKpis(sales: Sale[]): void {
        this.kpi.aprovisionamento = sales.filter(
            (s) => s.status === 'Em Aprovisionamento'
        ).length;
        this.kpi.instalada = sales.filter(
            (s) => s.status === 'Instalada'
        ).length;
        this.kpi.pendencia = sales.filter(
            (s) => s.status === 'Pendência'
        ).length;
        this.kpi.canceladas = sales.filter(
            (s) => s.status === 'Cancelada'
        ).length;
        this.kpi.total = this.kpi.instalada; // A regra de negócio define que o total de vendas é o total de instaladas
    }

    // =============================================
    // MÉTODOS DE EVENTOS (CHAMADOS PELO HTML)
    // =============================================

    /**
     * Abre o modal para registrar ou editar uma venda.
     */
    openSaleDialog(): void {
        if (!this.agent) return; // Checagem de segurança

        const dialogRef = this.dialog.open(SaleDialog, {
            width: '1000px',
            maxWidth: '95vw',
            disableClose: true,
        });

        dialogRef.afterClosed().subscribe((result: any) => {
            if (result && this.agent) {
                if (result.saleDate && result.installationDate) {
                    // Converte os objetos Moment do formulário para Date nativo antes de salvar
                    const saleData: Omit<
                        Sale,
                        'id' | 'createdAt' | 'updatedAt'
                    > = {
                        ...result,
                        saleDate: (result.saleDate as any).toDate(),
                        installationDate: (
                            result.installationDate as any
                        ).toDate(),
                        agentUid: this.agent.uid,
                    } as Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>;

                    this.dbService
                        .addSale(saleData)
                        .then(() => {
                            console.log('Venda salva com sucesso!');
                            // Recarrega os dados para atualizar a tela com a nova venda
                            this.loadSalesData(
                                this.monthYearControl.value!.year(),
                                this.monthYearControl.value!.month() + 1
                            );
                        })
                        .catch((err) =>
                            console.error('Erro ao salvar venda:', err)
                        );
                }
            }
        });
    }

    /**
     * Acionado pelo clique no botão de editar de uma venda.
     * Abre o mesmo modal de 'Nova Venda', mas pré-preenche com os dados existentes.
     */
    onEditSale(sale: Sale): void {
        const dialogRef = this.dialog.open(SaleDialog, {
            width: '1000px',
            maxWidth: '95vw',
            disableClose: true,
            data: { sale: sale }, // Passa os dados da venda para o modal
        });

        dialogRef.afterClosed().subscribe((result: any) => {
            if (result && this.agent) {
                // Se o usuário salvou, o 'result' contém os dados atualizados do formulário
                const saleDateAsJSDate = (result.saleDate as any).toDate
                    ? (result.saleDate as any).toDate()
                    : result.saleDate;
                const installationDateAsJSDate = (
                    result.installationDate as any
                ).toDate
                    ? (result.installationDate as any).toDate()
                    : result.installationDate;

                const updatedData = {
                    ...result,
                    saleDate: saleDateAsJSDate,
                    installationDate: installationDateAsJSDate,
                };

                this.dbService
                    .updateSale(sale.id, updatedData)
                    .then(() => {
                        console.log('Venda atualizada com sucesso!');
                        this.loadSalesData(
                            this.monthYearControl.value!.year(),
                            this.monthYearControl.value!.month() + 1
                        );
                    })
                    .catch((err) =>
                        console.error('Erro ao atualizar venda:', err)
                    );
            }
        });
    }

    /**
     * Acionado pelo clique no botão de excluir de uma venda.
     * Abre um modal de confirmação antes de realizar a exclusão.
     */
    onDeleteSale(sale: Sale): void {
        const dialogRef = this.dialog.open(ConfirmDialog, {
            data: {
                message: `Tem certeza que deseja excluir a venda do cliente ${sale.customerCpfCnpj}?`,
            },
        });

        dialogRef.afterClosed().subscribe((confirmed) => {
            if (confirmed) {
                this.dbService
                    .deleteSale(sale.id)
                    .then(() => {
                        console.log('Venda excluída com sucesso!');
                        this.loadSalesData(
                            this.monthYearControl.value!.year(),
                            this.monthYearControl.value!.month() + 1
                        );
                    })
                    .catch((err) =>
                        console.error('Erro ao excluir venda:', err)
                    );
            }
        });
    }

    /**
     * Acionado quando o usuário seleciona um novo mês/ano no filtro de data.
     * @param selectedDate O objeto Moment com a data selecionada.
     * @param datepicker A referência do datepicker para podermos fechá-lo.
     */
    monthYearSelected(
        selectedDate: moment.Moment,
        datepicker: MatDatepicker<moment.Moment>
    ) {
        this.monthYearControl.setValue(selectedDate);
        const year = selectedDate.year();
        const month = selectedDate.month() + 1;
        this.loadSalesData(year, month);
        datepicker.close();
    }

    /**
     * Aplica um filtro de texto à tabela de vendas.
     * @param event O evento de input do campo de busca.
     */
    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    /**
     * Realiza o logout do usuário e o redireciona para a página de login.
     */
    async logout() {
        await this.authService.logout();
        this.router.navigate(['/login']);
    }
}
