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
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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

type ChatSelection =
    | { type: 'group'; id: 'equipe'; name: string }
    | { type: 'dm'; id: string; name: string };

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

    @ViewChild('messageContainer') private messageContainer!: ElementRef;

    messages$: Observable<ChatMessage[]> = of([]);
    newMessageControl = new FormControl('', { nonNullable: true });
    currentUser: AppUser | null = null;
    isLoading = true;
    isUploading = false; // Flag para controlar o estado de upload

    chatListItems$: Observable<any[]> = of([]);
    selectedChat: ChatSelection = {
        type: 'group',
        id: 'equipe',
        name: 'Chat da Equipe',
    };

    private messagesSubscription: Subscription | null = null;

    ngOnInit(): void {
        this.loadInitialData();
    }
    ngAfterViewChecked() {
        this.scrollToBottom();
    }
    ngOnDestroy(): void {
        if (this.messagesSubscription) {
            this.messagesSubscription.unsubscribe();
        }
    }

    private async uploadFile(file: File): Promise<void> {
        if (!file) return;

        // 1. Validação de Tamanho (3MB)
        const maxSize = 3 * 1024 * 1024;
        if (file.size > maxSize) {
            this.snackBar.open(
                'Erro: O arquivo excede o limite de 3MB.',
                'Fechar',
                { duration: 3000 }
            );
            return;
        }

        // 2. Validação de Tipo
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

        // 3. Lógica de Upload (exatamente como antes)
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
            const messageType = file.type.startsWith('image/')
                ? 'image'
                : file.type;

            const message: Partial<ChatMessage> = {
                fileType: messageType,
                fileUrl: downloadUrl,
                fileName: file.name,
                text: this.newMessageControl.value?.trim() || '', // Envia o texto junto se houver
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
            this.newMessageControl.reset(); // Limpa o campo de texto após o envio
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
            await this.chatService.markAsRead(chatRoomId, this.currentUser.uid);
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
        // Limpa o input para permitir selecionar o mesmo arquivo novamente
        fileInput.value = '';
    }

    @HostListener('paste', ['$event'])
    handlePaste(event: ClipboardEvent): void {
        // Impede que o texto/imagem seja colado no campo de input
        event.preventDefault();

        const items = event.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    console.log('Imagem colada detectada!', file);
                    // CRIA UM NOVO ARQUIVO COM UM NOME ÚNICO
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
