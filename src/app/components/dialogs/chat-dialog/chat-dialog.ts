import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

// Imports do Material (sem alterações)
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

// Definição para o tipo de chat selecionado
type ChatSelection = {
  type: 'group';
  id: 'equipe';
  name: string;
} | {
  type: 'dm';
  id: string; // UID do outro usuário
  name: string;
};

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

  messages$: Observable<ChatMessage[]> = of([]); // Inicia com um array vazio
  newMessageControl = new FormControl('', [Validators.required]);
  currentUser: AppUser | null = null;
  isLoading = true;

  // Propriedades para gerenciar a lista de usuários e a seleção
  users: AppUser[] = [];
  selectedChat: ChatSelection = { type: 'group', id: 'equipe', name: 'Chat da Equipe' };

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  async loadInitialData(): Promise<void> {
    this.isLoading = true;
    try {
      const firebaseUser = await this.authService.getCurrentUser();
      if (!firebaseUser) throw new Error("Usuário não autenticado.");
      
      this.currentUser = await this.dbService.getUserProfile(firebaseUser.uid);
      if (!this.currentUser) throw new Error("Perfil do usuário não encontrado.");

      const allUsers = await this.dbService.getAllUsers();
      
      // MUDANÇA AQUI: Adicionamos um filtro para ignorar usuários sem UID ou sem nome
      this.users = allUsers.filter(u => 
        u && u.uid && u.name && u.uid !== this.currentUser?.uid
      );

      this.loadMessagesForSelection();

    } catch (error) {
      console.error("Erro ao carregar dados do chat:", error);
      this.isLoading = false;
    }
  }

  // Carrega as mensagens com base no `this.selectedChat`
  loadMessagesForSelection(): void {
    if (!this.currentUser) return;
    this.isLoading = true;

    if (this.selectedChat.type === 'group') {
      this.messages$ = this.chatService.getGroupChatMessages();
    } else {
      this.messages$ = this.chatService.getDirectMessages(this.currentUser.uid, this.selectedChat.id);
    }

    // Se inscreve para saber quando as mensagens chegam e parar o loading
    const subscription = this.messages$.subscribe(() => {
      this.isLoading = false;
      setTimeout(() => this.scrollToBottom(), 50);
      subscription.unsubscribe(); // Cancela a inscrição após o primeiro carregamento
    });
  }

  // Método chamado ao clicar em um chat na barra lateral
  // ATUALIZAÇÃO: Transforme o método selectChat em 'async'
  async selectChat(selection: ChatSelection): Promise<void> {
    if (this.selectedChat.id === selection.id) return;

    this.selectedChat = selection;

    // Se for uma DM, primeiro garanta que a sala existe
    if (this.selectedChat.type === 'dm' && this.currentUser) {
      this.isLoading = true; // Mostra o spinner enquanto cria a sala
      await this.chatService.ensureChatRoomExists(this.currentUser.uid, this.selectedChat.id);
    }
    
    // Agora, carregue as mensagens com segurança
    this.loadMessagesForSelection();
  }
  
  sendMessage(): void {
    if (this.newMessageControl.invalid || !this.currentUser) return;

    const messageText = this.newMessageControl.value!;

    if (this.selectedChat.type === 'group') {
      this.chatService.sendGroupChatMessage(messageText, this.currentUser);
    } else {
      this.chatService.sendDirectMessage(messageText, this.currentUser, this.selectedChat.id);
    }
    
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