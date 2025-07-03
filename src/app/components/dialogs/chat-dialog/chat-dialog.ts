// Imports necessários, incluindo OnDestroy e Subscription para gerenciar o "ouvinte"
import { CommonModule, DatePipe } from '@angular/common';
import {
    AfterViewChecked,
    Component,
    ElementRef,
    inject,
    OnInit,
    ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { combineLatest, from, map, Observable, of } from 'rxjs';

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

type ChatSelection =
    | {
          type: 'group';
          id: 'equipe';
          name: string;
      }
    | {
          type: 'dm';
          id: string; // UID do outro usuário
          name: string;
      };

// Adicionamos 'OnDestroy' para garantir que vamos limpar nosso "ouvinte" ao fechar o chat
@Component({
    selector: 'app-chat-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSidenavModule,
        MatListModule,
        DatePipe,
    ],
    templateUrl: './chat-dialog.html',
    styleUrl: './chat-dialog.scss',
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

    chatListItems$: Observable<any[]> = of([]);
    selectedChat: ChatSelection = {
        type: 'group',
        id: 'equipe',
        name: 'Chat da Equipe',
    };

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
            if (!firebaseUser) {
                this.isLoading = false;
                throw new Error('Usuário não autenticado.');
            }
            this.currentUser = await this.dbService.getUserProfile(
                firebaseUser.uid
            );
            if (!this.currentUser) {
                this.isLoading = false;
                throw new Error('Perfil do usuário não encontrado.');
            }
            const users$ = from(this.dbService.getAllUsers());
            const conversations$ = this.chatService.getConversations(
                this.currentUser.uid
            );

            console.log('%c[ESPIÃO ChatDialog] Tentando chamar getConversations com o userId:', 'color: cyan; font-weight: bold;', this.currentUser.uid);

            this.chatListItems$ = combineLatest([users$, conversations$]).pipe(
                map(([users, conversations]) => {
                    const otherUsers = users.filter(
                        (u) =>
                            u &&
                            u.uid &&
                            u.name &&
                            u.uid !== this.currentUser?.uid
                    );
                    const conversationsMap = new Map(
                        conversations.map((c) => [c.id, c])
                    );
                    return otherUsers.map((user) => {
                        const chatRoomId = this.getChatRoomId(
                            this.currentUser!.uid,
                            user.uid
                        );
                        const conversationData =
                            conversationsMap.get(chatRoomId);
                        return {
                            id: chatRoomId,
                            uid: user.uid,
                            name: user.name,
                            lastMessage: conversationData?.lastMessage,
                            lastRead: conversationData?.lastRead,
                        };
                    });
                })
            );
            this.loadMessagesForSelection();
        } catch (error) {
            console.error('Erro ao carregar dados do chat:', error);
            this.isLoading = false;
        }
    }

    loadMessagesForSelection(): void {
        if (!this.currentUser) return;
        this.isLoading = true;
        if (this.selectedChat.type === 'group') {
            this.messages$ = this.chatService.getGroupChatMessages();
        } else {
            this.messages$ = this.chatService.getDirectMessages(
                this.currentUser.uid,
                this.selectedChat.id
            );
        }
        const subscription = this.messages$.subscribe(() => {
            this.isLoading = false;
            setTimeout(() => this.scrollToBottom(), 50);
            subscription.unsubscribe(); // A inscrição volta a ser de curta duração
        });
    }

    // O restante dos métodos permanece igual
    async selectChat(
        selection: ChatSelection,
        chatRoomId?: string
    ): Promise<void> {
        if (this.selectedChat.id === selection.id) return;
        this.selectedChat = selection;
        if (selection.type === 'dm' && this.currentUser && chatRoomId) {
            this.isLoading = true;
            await this.chatService.ensureChatRoomExists(
                this.currentUser.uid,
                selection.id
            );
            await this.chatService.markAsRead(chatRoomId, this.currentUser.uid);
        }
        // Ao selecionar uma nova conversa, a função abaixo é chamada,
        // reativando o "ouvinte" para a conversa correta.
        this.loadMessagesForSelection();
    }

    sendMessage(): void {
    if (this.newMessageControl.invalid || !this.currentUser) return;
    
    const messageText = this.newMessageControl.value?.trim();
    if (!messageText) return; // Não envia mensagens vazias

    // Cria um objeto de mensagem do tipo 'text'
    const message: Partial<ChatMessage> = {
      text: messageText,
      fileType: 'text', // Define explicitamente o tipo
    };

    if (this.selectedChat.type === 'group') {
      // Envia o objeto 'message' em vez do 'messageText'
      this.chatService.sendGroupChatMessage(message, this.currentUser);
    } else {
      // Envia o objeto 'message' em vez do 'messageText'
      this.chatService.sendDirectMessage(message, this.currentUser, this.selectedChat.id);
    }
    
    this.newMessageControl.reset();
  }

    close(): void {
        this.dialogRef.close();
    }

    private scrollToBottom(): void {
        try {
            if (this.messageContainer) {
                this.messageContainer.nativeElement.scrollTop =
                    this.messageContainer.nativeElement.scrollHeight;
            }
        } catch (err) {}
    }

    private getChatRoomId(uid1: string, uid2: string): string {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }
}
