import { Injectable, inject } from '@angular/core';
import { Firestore, Timestamp, addDoc, collection, collectionData, limit, orderBy, query } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ChatMessage } from '../models/chat-message.model';
import { AppUser } from './auth';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private firestore: Firestore = inject(Firestore);

  /**
   * Busca as mensagens do chat em grupo em tempo real, ordenadas por data.
   * @returns Um Observable com o array de mensagens.
   */
  getGroupChatMessages(): Observable<ChatMessage[]> {
    const messagesColRef = collection(this.firestore, 'group-chat');
    // Cria uma query para ordenar as mensagens pela data e pegar as últimas 100
    const q = query(messagesColRef, orderBy('timestamp', 'asc'), limit(100));

    // collectionData escuta as mudanças em tempo real
    return collectionData(q, { idField: 'id' }) as Observable<ChatMessage[]>;
  }

  /**
   * Envia uma nova mensagem para o chat em grupo.
   * @param text O conteúdo da mensagem.
   * @param user O usuário que está enviando.
   */
  sendGroupChatMessage(text: string, user: AppUser): Promise<any> {
    const messagesColRef = collection(this.firestore, 'group-chat');
    const newMessage: Omit<ChatMessage, 'id'> = {
      text: text,
      senderUid: user.uid,
      senderName: user.name,
      timestamp: Timestamp.now()
    };
    return addDoc(messagesColRef, newMessage);
  }

  // --- MÉTODOS PARA MENSAGENS DIRETAS (serão implementados na Parte 3) ---

  // getDirectMessages(chatRoomId: string): Observable<ChatMessage[]> { ... }
  // sendDirectMessage(chatRoomId: string, text: string, user: AppUser) { ... }
}