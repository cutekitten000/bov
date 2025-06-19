// src/app/services/notification.service.ts

import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
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
  private notificationSound = new Audio('assets/notification.mp3');
  private isFirstLoad = true;

  constructor() {
    // Observa o estado de autenticação do usuário
    // MUDANÇA AQUI: de currentUser$ para authState$
    this.authService.authState$.pipe(
      filter(user => !!user) // Continua apenas se o usuário estiver logado
    ).subscribe(user => {
      if (user) {
        this.startListeningForNotifications(user.uid);
      } else {
        this.stopListeningForNotifications();
      }
    });
  }

  startListeningForNotifications(userId: string): void {
    if (this.conversationsSubscription) {
      return;
    }

    console.log('[NotificationService] Iniciando ouvinte de notificações para o usuário:', userId);

    this.conversationsSubscription = this.chatService.getConversations(userId).subscribe(conversations => {
      if (this.isFirstLoad) {
        conversations.forEach(conv => this.knownConversations.set(conv.id, conv.lastMessage?.timestamp));
        this.isFirstLoad = false;
        return;
      }

      conversations.forEach(conv => {
        const knownTimestamp = this.knownConversations.get(conv.id);
        const newTimestamp = conv.lastMessage?.timestamp;
        
        if (newTimestamp && newTimestamp > knownTimestamp && conv.lastMessage?.senderUid !== userId) {
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
    this.notificationSound.currentTime = 0;
    this.notificationSound.play().catch(error => {
      console.warn("Navegador pode ter bloqueado a reprodução automática do som.", error);
    });
  }
}