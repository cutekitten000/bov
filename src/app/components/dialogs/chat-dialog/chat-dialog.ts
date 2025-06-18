import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

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

  messages$: Observable<ChatMessage[]> = of([]);
  newMessageControl = new FormControl('', [Validators.required]);
  currentUser: AppUser | null = null;
  isLoading = true;

  conversations$: Observable<any[]> = of([]);
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

      // Carrega a lista de conversas e busca o nome do outro participante
      this.conversations$ = this.chatService.getConversations(this.currentUser.uid).pipe(
        switchMap(conversations => {
          if (conversations.length === 0) {
            return of([]);
          }
          // Para cada conversa, busca o perfil do outro usuário para pegar o nome
          const enrichedConversations$ = conversations.map(conv => {
            const otherUserId = conv.members.find((uid: string) => uid !== this.currentUser?.uid);
            if (!otherUserId) {
              return of({ ...conv, otherUserName: 'Desconhecido' });
            }
            return this.dbService.getUserProfile(otherUserId).then(userProfile => {
              // Retorna a conversa original com o nome do outro usuário adicionado
              return { ...conv, otherUserName: userProfile?.name || 'Agente' };
            });
          });
          return forkJoin(enrichedConversations$);
        })
      );

      this.loadMessagesForSelection();

    } catch (error) {
      console.error("Erro ao carregar dados do chat:", error);
      this.isLoading = false;
    }
  }

  // ****** ADICIONE ESTA NOVA FUNÇÃO AQUI ******
  public getOtherMemberId(conversation: any): string | undefined {
    if (!this.currentUser || !conversation?.members) {
      return undefined;
    }
    return conversation.members.find((id: string) => id !== this.currentUser!.uid);
  }

  loadMessagesForSelection(): void {
    if (!this.currentUser) return;
    this.isLoading = true;

    if (this.selectedChat.type === 'group') {
      this.messages$ = this.chatService.getGroupChatMessages();
    } else {
      this.messages$ = this.chatService.getDirectMessages(this.currentUser.uid, this.selectedChat.id);
    }

    const subscription = this.messages$.subscribe(() => {
      this.isLoading = false;
      setTimeout(() => this.scrollToBottom(), 50);
      subscription.unsubscribe();
    });
  }

  async selectChat(selection: ChatSelection, chatRoomId?: string): Promise<void> {
    if (this.selectedChat.id === selection.id) return;

    this.selectedChat = selection;

    if (selection.type === 'dm' && this.currentUser && chatRoomId) {
      this.isLoading = true;
      // Garante que a sala existe e marca como lida
      await this.chatService.ensureChatRoomExists(this.currentUser.uid, selection.id);
      await this.chatService.markAsRead(chatRoomId, this.currentUser.uid);
    }

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
    } catch (err) { }
  }
}