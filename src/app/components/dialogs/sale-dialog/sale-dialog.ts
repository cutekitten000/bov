import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// --- IMPORTS DO ANGULAR MATERIAL ---
// A maioria dos módulos necessários está aqui.
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { NgxMaskDirective } from 'ngx-mask';

import { Sale } from '../../../models/sale.model';

@Component({
  selector: 'app-sale-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatGridListModule,
    MatIconModule,
    NgxMaskDirective
  ],
  templateUrl: './sale-dialog.html',
  styleUrl: './sale-dialog.scss'
})
export class SaleDialog implements OnInit {
  fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<SaleDialog>);
  data: { sale?: Sale } = inject(MAT_DIALOG_DATA, { optional: true });

  saleForm!: FormGroup;
  isEditMode = false;

  // Opções para os campos <select>
  periodOptions = ['Manhã', 'Tarde'];
  statusOptions = ['Em Aprovisionamento', 'Pendência', 'Cancelada', 'Instalada'];
  saleTypeOptions = ['Legado', 'Nova Fibra'];
  paymentOptions = ['Boleto', 'Cartão de Crédito', 'Débito em Conta'];
  speedOptions = ['500MB', '700MB', '1 GB'];
  ufOptions = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  ngOnInit(): void {
    this.isEditMode = !!this.data?.sale;

    this.saleForm = this.fb.group({
      saleDate: [null, Validators.required],
      customerCpfCnpj: ['', Validators.required],
      installationDate: [null, Validators.required],
      period: ['', Validators.required],
      status: ['', Validators.required],
      customerPhone: ['', Validators.required],
      saleType: ['', Validators.required],
      paymentMethod: ['', Validators.required],
      ticket: ['', Validators.required],
      speed: ['', Validators.required],
      uf: ['', Validators.required],
      os: ['', Validators.required],
      notes: ['']
    });

    if (this.isEditMode && this.data.sale) {
      this.saleForm.patchValue(this.data.sale);
    }
  }

  onSave(): void {
    if (this.saleForm.valid) {
      this.dialogRef.close(this.saleForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}