import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

// Imports do Material
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';

// Nossos serviços e modelos
import { ChatMessage } from '../../../models/chat-message.model';
import { AppUser, AuthService } from '../../../services/auth';
import { ChatService } from '../../../services/chat.service';
import { DatabaseService } from '../../../services/database.service';

@Component({
  selector: 'app-chat-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule,
    MatSidenavModule, MatListModule, DatePipe
  ],
  templateUrl: './chat-dialog.html',
  styleUrl: './chat-dialog.scss'
})
export class ChatDialog implements OnInit, AfterViewChecked {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private dbService = inject(DatabaseService);
  private dialogRef = inject(MatDialogRef<ChatDialog>);

  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  messages$!: Observable<ChatMessage[]>;
  newMessageControl = new FormControl('', [Validators.required]);
  currentUser: AppUser | null = null;
  isLoading = true;

  ngOnInit(): void {
    this.loadUserAndMessages();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  async loadUserAndMessages(): Promise<void> {
    this.isLoading = true;
    try {
      const firebaseUser = await this.authService.getCurrentUser();
      if (firebaseUser) {
        this.currentUser = await this.dbService.getUserProfile(firebaseUser.uid);
      }
      
      this.messages$ = this.chatService.getGroupChatMessages();
      this.messages$.subscribe(() => {
        this.isLoading = false;
        setTimeout(() => this.scrollToBottom(), 50);
      });
    } catch (error) {
      console.error("Erro ao carregar dados do chat:", error);
      this.isLoading = false;
    }
  }

  sendMessage(): void {
    if (this.newMessageControl.invalid || !this.currentUser) return;

    const messageText = this.newMessageControl.value!;
    this.chatService.sendGroupChatMessage(messageText, this.currentUser);
    this.newMessageControl.reset();
  }

  close(): void {
    this.dialogRef.close();
  }

  private scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }
}