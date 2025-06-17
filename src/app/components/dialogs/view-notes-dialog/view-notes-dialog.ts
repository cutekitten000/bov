import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-view-notes-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './view-notes-dialog.html',
  styleUrl: './view-notes-dialog.scss'
})
export class ViewNotesDialog {
  // Injeta os dados (a nota) que foram passados ao abrir o modal
  public data: { notes: string } = inject(MAT_DIALOG_DATA);
}