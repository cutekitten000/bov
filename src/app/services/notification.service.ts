// src/app/services/notification.service.ts

import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from './auth';
import { ChatService } from './chat.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private authService = inject(AuthService);
  private chatService = inject(ChatService);

  private conversationsSubscription: Subscription | null = null;
  private knownConversations = new Map<string, any>();
  private notificationSound: HTMLAudioElement;
  private isFirstLoad = true;
  private isAudioReady = false; // <-- NOVA PROPRIEDADE

  constructor() {
    // Apenas cria o objeto de áudio.
    this.notificationSound = new Audio('assets/notification.mp3');

    this.authService.authState$.subscribe(user => {
      if (user && user.uid) {
        this.startListeningForNotifications(user.uid);
      } else {
        this.stopListeningForNotifications();
      }
    });
  }

  /**
   * NOVO MÉTODO: Prepara o áudio para ser tocado.
   * Deve ser chamado após uma interação do usuário (ex: clique).
   */
  public primeAudio(): void {
    if (this.isAudioReady) {
      return;
    }

    console.log('[NotificationService] Tentando preparar o áudio após interação do usuário.');
    // Tenta tocar o áudio sem som para obter a permissão do navegador.
    this.notificationSound.muted = true;
    this.notificationSound.play().then(() => {
        this.notificationSound.pause();
        this.notificationSound.currentTime = 0;
        this.notificationSound.muted = false;
        this.isAudioReady = true;
        console.log('[NotificationService] Áudio preparado com sucesso. Notificações sonoras ativadas.');
    }).catch(error => {
        console.warn('[NotificationService] Não foi possível preparar o áudio. As notificações podem ficar sem som.', error);
    });
  }

  startListeningForNotifications(userId: string): void {
    if (this.conversationsSubscription) {
      return;
    }

    console.log('[NotificationService] Iniciando ouvinte de notificações para o usuário:', userId);

    // Pré-carrega o arquivo de áudio para que ele toque mais rápido quando necessário.
    this.notificationSound.load();

    this.conversationsSubscription = this.chatService.getConversations(userId).subscribe(conversations => {
      if (this.isFirstLoad) {
        conversations.forEach(conv => this.knownConversations.set(conv.id, conv.lastMessage?.timestamp));
        this.isFirstLoad = false;
        return;
      }

      conversations.forEach(conv => {
        const knownTimestamp = this.knownConversations.get(conv.id);
        const newTimestamp = conv.lastMessage?.timestamp;
        
        if (newTimestamp && (!knownTimestamp || newTimestamp.toMillis() > knownTimestamp.toMillis()) && conv.lastMessage?.senderUid !== userId) {
          console.log(`[NotificationService] Nova mensagem detectada na conversa ${conv.id}. Tocando som.`);
          this.playNotificationSound();
        }

        this.knownConversations.set(conv.id, newTimestamp);
      });
    });
  }

  stopListeningForNotifications(): void {
    if (this.conversationsSubscription) {
      console.log('[NotificationService] Parando ouvinte de notificações.');
      this.conversationsSubscription.unsubscribe();
      this.conversationsSubscription = null;
      this.knownConversations.clear();
      this.isFirstLoad = true;
    }
  }

  private playNotificationSound(): void {
    if (!this.isAudioReady) {
      console.warn("O áudio não foi preparado por uma interação do usuário. A notificação pode não tocar.");
      // Mesmo assim, tentamos tocar. Pode funcionar em alguns cenários.
    }

    this.notificationSound.currentTime = 0;
    this.notificationSound.play().catch(error => {
      console.warn("Navegador bloqueou a reprodução automática do som. O usuário precisa interagir com a página primeiro (clicar em algo).", error);
    });
  }
}
