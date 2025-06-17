import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

// Imports do Material
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';

// Nossos serviços e modelos
import { MatDialogRef } from '@angular/material/dialog';
import { Script } from '../../../models/script.model';
import { AuthService } from '../../../services/auth';
import { DatabaseService } from '../../../services/database.service';

@Component({
    selector: 'app-script-take-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatSidenavModule,
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: './script-take-dialog.html',
    styleUrl: './script-take-dialog.scss',
})
export class ScriptTakeDialog implements OnInit {
    private authService = inject(AuthService);
    private dbService = inject(DatabaseService);
    private dialogRef = inject(MatDialogRef<ScriptTakeDialog>); // <-- Injete a referência

    isLoading = true;
    scripts: Script[] = [];
    categories: string[] = [];
    selectedCategory: string = '';
    filteredScripts: Script[] = [];

    ngOnInit(): void {
        this.loadInitialData();
    }

    // Crie este método para fechar o modal
    close(): void {
        this.dialogRef.close();
    }

    async loadInitialData(): Promise<void> {
        this.isLoading = true;
        const user = await this.authService.getCurrentUser(); // Precisamos de um método para pegar o user atual
        if (!user) {
            this.isLoading = false;
            return;
        }

        try {
            this.scripts = await this.dbService.getScriptsForUser(user.uid);
            // Extrai as categorias únicas e as ordena
            this.categories = [
                ...new Set(this.scripts.map((s) => s.category)),
            ].sort();

            if (this.categories.length > 0) {
                this.selectCategory(this.categories[0]);
            }
        } catch (error) {
            console.error('Erro ao carregar scripts:', error);
        } finally {
            this.isLoading = false;
        }
    }

    selectCategory(category: string): void {
        this.selectedCategory = category;
        this.filteredScripts = this.scripts
            .filter((s) => s.category === category)
            .sort((a, b) => a.order - b.order);
    }
}
