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
// ATUALIZAÇÃO: Trocamos forkJoin por combineLatest e adicionamos 'from' e 'map'
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

            // LÓGICA HÍBRIDA CORRIGIDA com combineLatest
            // Converte a Promise de getAllUsers para um Observable
            const users$ = from(this.dbService.getAllUsers());
            // Pega o Observable em tempo real das conversas
            const conversations$ = this.chatService.getConversations(
                this.currentUser.uid
            );

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
                            id: chatRoomId, // <-- ADICIONE ESTA LINHA
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
            subscription.unsubscribe();
        });
    }

    async selectChat(selection: ChatSelection, chatRoomId?: string): Promise<void> {
        if (this.selectedChat.id === selection.id) return;
        this.selectedChat = selection;
        if (selection.type === 'dm' && this.currentUser && chatRoomId) {
            this.isLoading = true;
            await this.chatService.ensureChatRoomExists(
                this.currentUser.uid,
                selection.id
            );
            const chatRoomId = this.getChatRoomId(
                this.currentUser.uid,
                selection.id
            );
            await this.chatService.markAsRead(chatRoomId, this.currentUser.uid);
        }
        this.loadMessagesForSelection();
    }

    private getChatRoomId(uid1: string, uid2: string): string {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    public getOtherMemberId(conversation: any): string | undefined {
        if (!this.currentUser || !conversation?.members) {
            return undefined;
        }
        return conversation.members.find(
            (id: string) => id !== this.currentUser!.uid
        );
    }

    sendMessage(): void {
        if (this.newMessageControl.invalid || !this.currentUser) return;
        const messageText = this.newMessageControl.value!;
        if (this.selectedChat.type === 'group') {
            this.chatService.sendGroupChatMessage(
                messageText,
                this.currentUser
            );
        } else {
            this.chatService.sendDirectMessage(
                messageText,
                this.currentUser,
                this.selectedChat.id
            );
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
}
