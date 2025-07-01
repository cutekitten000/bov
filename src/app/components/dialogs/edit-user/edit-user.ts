import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AppUser } from '../../../services/auth';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [ ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './edit-user.html',
})
export class EditUser {
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<EditUser>);
  public data: { user: AppUser } = inject(MAT_DIALOG_DATA);

  editForm: FormGroup;

  constructor() {
    // Inicializa o formulário com os dados do usuário que estamos editando
    this.editForm = this.fb.group({
      name: [this.data.user.name, Validators.required],
      email: [this.data.user.email, [Validators.required, Validators.email]],
      th: [this.data.user.th, Validators.required],
    });
  }

  onSave(): void {
    if (this.editForm.valid) {
      // Ao salvar, fecha o dialog e retorna os novos dados do formulário
      this.dialogRef.close(this.editForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}