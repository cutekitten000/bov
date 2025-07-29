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
import { MatTooltipModule } from '@angular/material/tooltip';

// =============================================
// IMPORTS LOCAIS DA APLICAÇÃO
// =============================================
import { Sale } from '../../models/sale.model';
import { AppUser, AuthService } from '../../services/auth';
import { DatabaseService } from '../../services/database.service';
import { ExportService } from '../../services/export.service';
import { ChatDialog } from '../dialogs/chat-dialog/chat-dialog';
import { ConfirmDialog } from '../dialogs/confirm-dialog/confirm-dialog';
import { SaleDialog } from '../dialogs/sale-dialog/sale-dialog';
import { SalesByDateDialog } from '../dialogs/sales-by-date-dialog/sales-by-date-dialog';
import { ScriptTakeDialog } from '../dialogs/script-take-dialog/script-take-dialog';
import { TeamRankingDialog } from '../dialogs/team-ranking-dialog/team-ranking-dialog';
import { UsefulLinksDialog } from '../dialogs/useful-links-dialog/useful-links-dialog';
import { UserProfileDialog } from '../dialogs/user-profile-dialog/user-profile-dialog';
import { ViewNotesDialog } from '../dialogs/view-notes-dialog/view-notes-dialog';

// CORREÇÃO: Definindo um tipo específico para os status de venda
type SaleStatus = 'Em Aprovisionamento' | 'Instalada' | 'Pendência' | 'Cancelada' | 'Draft';


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
        MatTooltipModule,
    ],
    templateUrl: './agent-dashboard.html',
    styleUrl: './agent-dashboard.scss',
    providers: [DatePipe],
})
export class AgentDashboard implements OnInit {
    private authService = inject(AuthService);
    private dbService = inject(DatabaseService);
    private router = inject(Router);
    private dialog = inject(MatDialog);
    private exportService = inject(ExportService);
    private datePipe = inject(DatePipe);

    private agent: AppUser | null = null;

    kpi = {
        aprovisionamento: 0,
        instalada: 0,
        pendencia: 0,
        canceladas: 0,
        totalSales: 0,
        meta: 26,
        metaPercentage: 0,
    };

    monthYearControl = new FormControl(moment());
    dataSource = new MatTableDataSource<Sale>();

    displayedColumns: string[] = [
        'status', 'cpfCnpj', 'saleDate', 'installationDate', 'period',
        'customerPhone', 'ticket', 'os', 'actions',
    ];

    // CORREÇÃO: O array de opções agora usa o tipo SaleStatus
    statusOptions: SaleStatus[] = ['Instalada', 'Pendência', 'Em Aprovisionamento', 'Cancelada'];


    openNotesDialog(notes: string): void {
        if (!notes || notes.trim() === '') return;
        this.dialog.open(ViewNotesDialog, {
            width: '500px',
            data: { notes: notes },
            panelClass: 'custom-dialog-container',
        });
    }

    openChatDialog(): void {
        this.dialog.open(ChatDialog, {
            width: '90vw',
            height: '90vh',
            maxWidth: '1400px',
            panelClass: 'custom-dialog-container',
        });
    }

    openUsefulLinksDialog(): void {
        this.dialog.open(UsefulLinksDialog, {
            width: '80vw',
            maxWidth: '1000px',
            panelClass: 'custom-dialog-container',
        });
    }

    openTodaySales(): void {
        const today = new Date();
        this.dialog.open(SalesByDateDialog, {
            width: '90vw',
            maxWidth: '1200px',
            panelClass: 'custom-dialog-container',
            data: { title: 'Vendas do Dia', date: today },
        });
    }

    openYesterdaySales(): void {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        this.dialog.open(SalesByDateDialog, {
            width: '90vw',
            maxWidth: '1200px',
            panelClass: 'custom-dialog-container',
            data: { title: 'Vendas de Ontem', date: yesterday },
        });
    }

    onDownloadSheet(): void {
        if (this.dataSource.data.length === 0) {
            alert('Não há dados na tabela para exportar.');
            return;
        }
        const dataToExport = this.dataSource.data.map((sale) => ({
            Status: sale.status,
            'CPF/CNPJ': sale.customerCpfCnpj,
            'Data da Venda': this.datePipe.transform(sale.saleDate, 'dd/MM/yyyy'),
            'Data da Instalação': this.datePipe.transform(sale.installationDate, 'dd/MM/yyyy'),
            Período: sale.period,
            'Telefone Cliente': sale.customerPhone,
            'Tipo de Venda': sale.saleType,
            Pagamento: sale.paymentMethod,
            Ticket: sale.ticket,
            Velocidade: sale.speed,
            UF: sale.uf,
            OS: sale.os,
            Observações: sale.notes,
        }));
        const monthName = this.monthYearControl.value?.format('MMMM');
        const year = this.monthYearControl.value?.year();
        const fileName = `Vendas_${this.agent?.name?.replace(' ', '_')}_${monthName}_${year}`;
        this.exportService.exportToExcel(dataToExport, fileName);
    }

    openTeamRankingDialog(): void {
        this.dialog.open(TeamRankingDialog, {
            width: '90vw',
            maxWidth: '1200px',
            panelClass: ['custom-dialog-container', 'custom-overlay-panel'],
        });
    }

    agent$: Observable<AppUser | null> = this.authService.authState$.pipe(
        switchMap((user) =>
            user ? this.dbService.getUserProfile(user.uid) : of(null)
        ),
        tap((agent) => {
            this.agent = agent;
            if (agent) {
                this.kpi.meta = agent.salesGoal || 26;
                this.loadSalesData(new Date().getFullYear(), new Date().getMonth() + 1);
            }
        })
    );

    openScriptTakeDialog(): void {
        this.dialog.open(ScriptTakeDialog, {
            width: '95vw',
            height: '95vh',
            maxWidth: '1600px',
            panelClass: 'fullscreen-dialog-container',
        });
    }

    openUserProfileDialog(): void {
        if (!this.agent) return;
        const dialogRef = this.dialog.open(UserProfileDialog, {
            width: '500px',
            panelClass: ['custom-dialog-container', 'custom-overlay-panel'],
            data: { user: this.agent },
        });

        dialogRef.afterClosed().subscribe((newGoal: number | undefined) => {
            if (newGoal && this.agent) {
                this.dbService.updateUserSalesGoal(this.agent.uid, newGoal)
                    .then(() => {
                        this.kpi.meta = newGoal;
                        this.agent!.salesGoal = newGoal;
                        this.updateKpis(this.dataSource.data);
                        console.log('Meta atualizada com sucesso!');
                    })
                    .catch((err) => console.error('Erro ao atualizar a meta:', err));
            }
        });
    }

    ngOnInit(): void {
        this.agent$.subscribe();
    }

    private loadSalesData(year: number, month: number): void {
        if (!this.agent) return;

        this.dbService.getSalesForAgent(this.agent.uid, year, month)
            .then((sales) => {
                this.dataSource.data = sales;
                this.updateKpis(sales);
            });
    }

    private updateKpis(sales: Sale[]): void {
        this.kpi.aprovisionamento = sales.filter(s => s.status === 'Em Aprovisionamento').length;
        this.kpi.instalada = sales.filter(s => s.status === 'Instalada').length;
        this.kpi.pendencia = sales.filter(s => s.status === 'Pendência').length;
        this.kpi.canceladas = sales.filter(s => s.status === 'Cancelada').length;
        this.kpi.totalSales = sales.length;

        if (this.kpi.meta > 0) {
            this.kpi.metaPercentage = Math.round((this.kpi.instalada / this.kpi.meta) * 100);
        } else {
            this.kpi.metaPercentage = 0;
        }
    }

    // CORREÇÃO: A função agora usa o tipo 'SaleStatus' para o parâmetro 'newStatus'.
    updateSaleStatus(sale: Sale, newStatus: SaleStatus): void {
        if (sale.status === newStatus) {
            return;
        }

        const updatedData: Partial<Sale> = { status: newStatus };

        this.dbService.updateSale(sale.id, updatedData)
            .then(() => {
                console.log(`Status da venda ${sale.id} atualizado para ${newStatus}`);
                const currentData = this.dataSource.data;
                const saleIndex = currentData.findIndex(s => s.id === sale.id);
                if (saleIndex > -1) {
                    currentData[saleIndex].status = newStatus;
                    // CORREÇÃO: Atribui um novo array para forçar a detecção de mudanças na tabela.
                    this.dataSource.data = [...currentData];
                    this.updateKpis(this.dataSource.data);
                }
            })
            .catch(err => console.error('Erro ao atualizar status:', err));
    }

    openSaleDialog(): void {
        if (!this.agent) return;
        const dialogRef = this.dialog.open(SaleDialog, {
            width: '1000px',
            maxWidth: '95vw',
            disableClose: true,
            panelClass: ['custom-dialog-container', 'custom-overlay-panel'],
        });

        dialogRef.afterClosed().subscribe((result: any) => {
            if (result && this.agent) {
                if (result.saleDate && result.installationDate) {
                    const saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'> = {
                        ...result,
                        saleDate: (result.saleDate as any).toDate(),
                        installationDate: (result.installationDate as any).toDate(),
                        agentUid: this.agent.uid,
                    } as Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>;

                    this.dbService.addSale(saleData)
                        .then(() => {
                            console.log('Venda salva com sucesso!');
                            this.loadSalesData(
                                this.monthYearControl.value!.year(),
                                this.monthYearControl.value!.month() + 1
                            );
                        })
                        .catch((err) => console.error('Erro ao salvar venda:', err));
                }
            }
        });
    }

    public getStatusClass(status: string): string {
        return (
            'status-' +
            status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
        );
    }

    onEditSale(sale: Sale): void {
        const dialogRef = this.dialog.open(SaleDialog, {
            width: '1000px',
            maxWidth: '95vw',
            disableClose: true,
            data: { sale: sale },
            panelClass: ['custom-dialog-container', 'custom-overlay-panel'],
        });

        dialogRef.afterClosed().subscribe((result: any) => {
            if (result && this.agent) {
                const saleDateAsJSDate = (result.saleDate as any).toDate ? (result.saleDate as any).toDate() : result.saleDate;
                const installationDateAsJSDate = (result.installationDate as any).toDate ? (result.installationDate as any).toDate() : result.installationDate;

                const updatedData = {
                    ...result,
                    saleDate: saleDateAsJSDate,
                    installationDate: installationDateAsJSDate,
                };

                this.dbService.updateSale(sale.id, updatedData)
                    .then(() => {
                        console.log('Venda atualizada com sucesso!');
                        this.loadSalesData(
                            this.monthYearControl.value!.year(),
                            this.monthYearControl.value!.month() + 1
                        );
                    })
                    .catch((err) => console.error('Erro ao atualizar venda:', err));
            }
        });
    }

    onDeleteSale(sale: Sale): void {
        const dialogRef = this.dialog.open(ConfirmDialog, {
            data: {
                message: `Tem certeza que deseja excluir a venda do cliente ${sale.customerCpfCnpj}?`,
                panelClass: ['custom-dialog-container', 'custom-overlay-panel'],
            },
        });

        dialogRef.afterClosed().subscribe((confirmed) => {
            if (confirmed) {
                this.dbService.deleteSale(sale.id)
                    .then(() => {
                        console.log('Venda excluída com sucesso!');
                        this.loadSalesData(
                            this.monthYearControl.value!.year(),
                            this.monthYearControl.value!.month() + 1
                        );
                    })
                    .catch((err) => console.error('Erro ao excluir venda:', err));
            }
        });
    }

    monthYearSelected(selectedDate: moment.Moment, datepicker: MatDatepicker<moment.Moment>) {
        this.monthYearControl.setValue(selectedDate);
        const year = selectedDate.year();
        const month = selectedDate.month() + 1;
        this.loadSalesData(year, month);
        datepicker.close();
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    async logout() {
        await this.authService.logout();
        this.router.navigate(['/login']);
    }
}