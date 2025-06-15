import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

// Imports do Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';

import { AppUser } from '../../../services/auth';

@Component({
  selector: 'app-user-profile-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatIconModule
  ],
  templateUrl: './user-profile-dialog.html',
  styleUrl: './user-profile-dialog.scss'
})
export class UserProfileDialog implements OnInit {
  dialogRef = inject(MatDialogRef<UserProfileDialog>);
  // Recebe os dados do agente que abriu o modal
  data: { user: AppUser } = inject(MAT_DIALOG_DATA);

  goalControl: FormControl;

  constructor() {
    // Inicializa o campo de formulário com a meta atual do agente
    const currentGoal = this.data.user?.salesGoal || 26;
    this.goalControl = new FormControl(currentGoal, [Validators.required, Validators.min(1)]);
  }

  ngOnInit(): void {}

  onSave(): void {
    if (this.goalControl.valid) {
      // Fecha o modal e retorna o novo valor da meta
      this.dialogRef.close(this.goalControl.value);
    }
  }
}