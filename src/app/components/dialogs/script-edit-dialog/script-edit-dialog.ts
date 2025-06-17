import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Script } from '../../../models/script.model';

@Component({
  selector: 'app-script-edit-dialog',
  standalone: true,
  imports: [ ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule ],
  templateUrl: './script-edit-dialog.html',
})
export class ScriptEditDialog implements OnInit {
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<ScriptEditDialog>);
  public data: { script?: Script, category: string } = inject(MAT_DIALOG_DATA);

  isEditMode = false;
  scriptForm: FormGroup;

  constructor() {
    this.scriptForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.isEditMode = !!this.data.script;
    if (this.isEditMode) {
      this.scriptForm.patchValue(this.data.script!);
    }
  }

  onSave(): void {
    if (this.scriptForm.valid) {
      this.dialogRef.close(this.scriptForm.value);
    }
  }
}