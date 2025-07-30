import { CommonModule, DatePipe } from '@angular/common';
import {
    AfterViewChecked,
    Component,
    ElementRef,
    HostListener,
    inject,
    OnDestroy,
    OnInit,
    ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
    MatDialog,
    MatDialogModule,
    MatDialogRef,
    MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { combineLatest, from, map, Observable, of, Subscription } from 'rxjs';
import { ChatMessage } from '../../../models/chat-message.model';
import { AppUser, AuthService } from '../../../services/auth';
import { ChatService } from '../../../services/chat.service';
import { DatabaseService } from '../../../services/database.service';
import { NotificationService } from '../../../services/notification.service'; // <-- IMPORT ADICIONADO

type ChatSelection =
    | { type: 'group'; id: 'equipe'; name: string }
    | { type: 'dm'; id: string; name: string };

// --- Componente de Diálogo com Estilo Corrigido (sem alterações aqui) ---
@Component({
    selector: 'pinned-message-dialog',
    template: `
        <div class="header">
            <h2 mat-dialog-title>
                <mat-icon>push_pin</mat-icon>
                <span>Mensagem Fixada</span>
            </h2>
            <button
                mat-icon-button
                mat-dialog-close
                aria-label="Fechar modal"
            >
                <mat-icon>close</mat-icon>
            </button>
        </div>

        <mat-dialog-content class="mat-typography">
            <p class="sender-name">{{ data.senderName }}:</p>
            <p class="pinned-dialog-text">
                {{ data.text || 'Esta mensagem contém apenas um anexo.' }}
            </p>
            <a
                *ngIf="data.fileUrl"
                [href]="data.fileUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="attachment-link"
            >
                <mat-icon>attachment</mat-icon>
                <span>{{ data.fileName }}</span>
            </a>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button mat-flat-button mat-dialog-close color="primary">
                Fechar
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            :host {
                --border-color: rgba(255, 255, 255, 0.1);
                --primary-color: #3b82f6;
                --text-light: rgba(255, 255, 255, 0.7);
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 12px 0 24px;
                border-bottom: 1px solid var(--border-color);
            }
            h2[mat-dialog-title] {
                margin: 0;
                padding: 20px 0;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            mat-dialog-content {
                padding: 24px !important;
                line-height: 1.6;
            }
            .sender-name {
                font-weight: 600;
                margin-bottom: 4px;
                opacity: 0.9;
                display: block;
            }
            .pinned-dialog-text {
                white-space: pre-wrap;
                word-break: break-word;
                margin-top: 0;
                opacity: 0.8;
            }
            .attachment-link {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-top: 16px;
                color: var(--primary-color);
                text-decoration: none;
                font-weight: 500;
                transition: opacity 0.2s;
            }
            .attachment-link:hover {
                opacity: 0.8;
            }
        `,
    ],
    standalone: true,
    imports: [MatDialogModule, MatButtonModule, CommonModule, MatIconModule],
})
export class PinnedMessageDialog {
    data: ChatMessage = inject(MAT_DIALOG_DATA);
}

// --- COMPONENTE PRINCIPAL DO CHAT ---
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
        MatTooltipModule,
    ],
    templateUrl: './chat-dialog.html',
    styleUrl: './chat-dialog.scss',
})
export class ChatDialog implements OnInit, AfterViewChecked, OnDestroy {
    private chatService = inject(ChatService);
    private authService = inject(AuthService);
    private dbService = inject(DatabaseService);
    private dialogRef = inject(MatDialogRef<ChatDialog>);
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);
    private notificationService = inject(NotificationService); // <-- SERVIÇO INJETADO

    @ViewChild('messageContainer') private messageContainer!: ElementRef;

    messages$: Observable<ChatMessage[]> = of([]);
    newMessageControl = new FormControl('', { nonNullable: true });
    currentUser: AppUser | null = null;
    isLoading = true;
    isUploading = false;

    chatListItems$: Observable<any[]> = of([]);
    selectedChat: ChatSelection = {
        type: 'group',
        id: 'equipe',
        name: 'Chat da Equipe',
    };

    pinnedMessage$: Observable<ChatMessage | null> = of(null);

    private messagesSubscription: Subscription | null = null;

    ngOnInit(): void {
        // A abertura do diálogo é uma interação do usuário.
        // Chamamos o método para preparar o áudio.
        this.notificationService.primeAudio(); // <-- CHAMADA DO NOVO MÉTODO

        this.loadInitialData();
        this.pinnedMessage$ = this.chatService.getPinnedMessageFromGroupChat();
    }

    // ... O restante do seu componente continua igual ...

    ngAfterViewChecked() {
        this.scrollToBottom();
    }
    ngOnDestroy(): void {
        if (this.messagesSubscription) {
            this.messagesSubscription.unsubscribe();
        }
    }

    showPinnedMessage(message: ChatMessage): void {
        this.dialog.open(PinnedMessageDialog, {
            data: message,
            width: '500px',
            panelClass: 'custom-dialog-container',
        });
    }

    loadPinnedMessage(): void {
        if (this.selectedChat.type === 'group') {
            this.pinnedMessage$ =
                this.chatService.getPinnedMessageFromGroupChat();
        } else {
            this.pinnedMessage$ = of(null);
        }
    }

    async pinMessage(message: ChatMessage): Promise<void> {
        try {
            await this.chatService.pinMessageInGroupChat(message);
            this.snackBar.open('Mensagem fixada!', 'Fechar', {
                duration: 2000,
            });
        } catch (error) {
            console.error('Erro ao fixar mensagem:', error);
            this.snackBar.open('Não foi possível fixar a mensagem.', 'Fechar', {
                duration: 3000,
            });
        }
    }

    async unpinMessage(messageId: string): Promise<void> {
        try {
            await this.chatService.unpinMessageInGroupChat(messageId);
            this.snackBar.open('Mensagem desafixada.', 'Fechar', {
                duration: 2000,
            });
        } catch (error) {
            console.error('Erro ao desafixar mensagem:', error);
            this.snackBar.open(
                'Não foi possível desafixar a mensagem.',
                'Fechar',
                { duration: 3000 }
            );
        }
    }

    private async uploadFile(file: File): Promise<void> {
        if (!file) return;

        const maxSize = 3 * 1024 * 1024;
        if (file.size > maxSize) {
            this.snackBar.open(
                'Erro: O arquivo excede o limite de 3MB.',
                'Fechar',
                { duration: 3000 }
            );
            return;
        }

        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
        ];
        if (!allowedMimeTypes.includes(file.type)) {
            this.snackBar.open(
                'Erro: Tipo de arquivo não permitido.',
                'Fechar',
                { duration: 3000 }
            );
            return;
        }

        if (!this.currentUser) return;
        this.isUploading = true;

        try {
            const chatScope =
                this.selectedChat.type === 'group'
                    ? 'group-chat'
                    : this.getChatRoomId(
                          this.currentUser.uid,
                          this.selectedChat.id
                      );
            const path = `uploads/${chatScope}/${Date.now()}_${file.name}`;
            const downloadUrl = await this.chatService.uploadFile(file, path);

            const message: Partial<ChatMessage> = {
                fileType: file.type,
                fileUrl: downloadUrl,
                fileName: file.name,
                text: this.newMessageControl.value?.trim() || '',
            };

            if (this.selectedChat.type === 'group') {
                await this.chatService.sendGroupChatMessage(
                    message,
                    this.currentUser
                );
            } else {
                await this.chatService.sendDirectMessage(
                    message,
                    this.currentUser,
                    this.selectedChat.id
                );
            }
            this.newMessageControl.reset();
        } catch (error) {
            console.error('Erro no upload do arquivo:', error);
            this.snackBar.open(
                'Ocorreu um erro ao enviar o arquivo.',
                'Fechar',
                { duration: 3000 }
            );
        } finally {
            this.isUploading = false;
        }
    }

    async loadInitialData(): Promise<void> {
        this.isLoading = true;
        try {
            const firebaseUser = await this.authService.getCurrentUser();
            if (!firebaseUser) throw new Error('Usuário não autenticado.');
            this.currentUser = await this.dbService.getUserProfile(
                firebaseUser.uid
            );
            if (!this.currentUser)
                throw new Error('Perfil do usuário não encontrado.');
            this.setupChatList();
            this.loadMessagesForSelection();
        } catch (error) {
            console.error('Erro ao carregar dados do chat:', error);
            this.isLoading = false;
        }
    }

    setupChatList(): void {
        const users$ = from(this.dbService.getAllUsers());
        const conversations$ = this.chatService.getConversations(
            this.currentUser!.uid
        );
        this.chatListItems$ = combineLatest([users$, conversations$]).pipe(
            map(([users, conversations]) => {
                const otherUsers = users.filter(
                    (u) =>
                        u && u.uid && u.name && u.uid !== this.currentUser?.uid
                );
                const conversationsMap = new Map(
                    conversations.map((c) => [c.id, c])
                );
                return otherUsers.map((user) => {
                    const chatRoomId = this.getChatRoomId(
                        this.currentUser!.uid,
                        user.uid
                    );
                    const conversationData = conversationsMap.get(chatRoomId);
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
    }

    loadMessagesForSelection(): void {
        if (!this.currentUser) return;
        this.isLoading = true;
        if (this.messagesSubscription) {
            this.messagesSubscription.unsubscribe();
        }
        const messages$ =
            this.selectedChat.type === 'group'
                ? this.chatService.getGroupChatMessages()
                : this.chatService.getDirectMessages(
                      this.currentUser.uid,
                      this.selectedChat.id
                  );
        this.messages$ = messages$;
        this.messagesSubscription = messages$.subscribe(() => {
            if (this.isLoading) this.isLoading = false;
            setTimeout(() => this.scrollToBottom(), 50);
        });
    }

    async selectChat(
        selection: ChatSelection,
        chatRoomId?: string
    ): Promise<void> {
        if (this.selectedChat.id === selection.id) return;
        this.selectedChat = selection;
        if (selection.type === 'dm' && this.currentUser && chatRoomId) {
            await this.chatService.ensureChatRoomExists(
                this.currentUser.uid,
                selection.id
            );
            await this.chatService.markAsRead(
                chatRoomId,
                this.currentUser.uid
            );
        }
        this.loadMessagesForSelection();
    }

    sendMessage(): void {
        if (this.newMessageControl.invalid || !this.currentUser) return;
        const messageText = this.newMessageControl.value.trim();
        if (!messageText) return;

        const message: Partial<ChatMessage> = {
            text: messageText,
            fileType: 'text',
        };

        if (this.selectedChat.type === 'group') {
            this.chatService.sendGroupChatMessage(message, this.currentUser);
        } else {
            this.chatService.sendDirectMessage(
                message,
                this.currentUser,
                this.selectedChat.id
            );
        }
        this.newMessageControl.reset();
    }

    onFileSelected(event: any): void {
        const fileInput = event.target as HTMLInputElement;
        const file = fileInput.files?.[0];
        if (file) {
            this.uploadFile(file);
        }
        fileInput.value = '';
    }

    @HostListener('paste', ['$event'])
    handlePaste(event: ClipboardEvent): void {
        event.preventDefault();

        const items = event.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    const newFileName = `colado_${Date.now()}.png`;
                    const namedFile = new File([file], newFileName, {
                        type: file.type,
                    });
                    this.uploadFile(namedFile);
                    return;
                }
            }
        }
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
