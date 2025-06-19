import { Injectable, inject } from '@angular/core';
import { Firestore, Timestamp, addDoc, collection, collectionData, doc, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ChatMessage } from '../models/chat-message.model';
import { AppUser } from './auth';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private firestore: Firestore = inject(Firestore);

  /**
  * NOVO MÉTODO: Garante que uma sala de DM exista entre dois usuários.
  * Cria o documento da sala com os membros se ele ainda não existir.
  */
  async ensureChatRoomExists(uid1: string, uid2: string): Promise<string> {
    const chatRoomId = this.getChatRoomId(uid1, uid2);
    const chatRoomRef = doc(this.firestore, `direct-messages/${chatRoomId}`);

    // Usa setDoc com 'merge: true' para criar o documento apenas se ele não existir,
    // sem sobrescrever dados se ele já existir.
    await setDoc(chatRoomRef, {
      members: [uid1, uid2]
    }, { merge: true });

    return chatRoomId;
  }

  /**
   * Busca as mensagens do chat em grupo em tempo real, ordenadas por data.
   * @returns Um Observable com o array de mensagens.
   */
  /**
   * Busca as mensagens do chat em grupo em tempo real, ordenadas por data.
   */
  getGroupChatMessages(): Observable<ChatMessage[]> {
    const messagesColRef = collection(this.firestore, 'group-chat');
    const q = query(messagesColRef, orderBy('timestamp', 'asc'), limit(100));
    return collectionData(q, { idField: 'id' }) as Observable<ChatMessage[]>;
  }

  /**
   * Envia uma nova mensagem para o chat em grupo.
   */
  sendGroupChatMessage(text: string, user: AppUser): Promise<any> {
    const messagesColRef = collection(this.firestore, 'group-chat');
    const newMessage: Omit<ChatMessage, 'id'> = {
      text: text,
      senderUid: user.uid,
      senderName: user.name, // Assumindo que AppUser tem 'name'
      timestamp: Timestamp.now()
    };
    return addDoc(messagesColRef, newMessage);
  }

  // --- MÉTODOS PARA MENSAGENS DIRETAS (IMPLEMENTADOS) ---

  /**
   * Gera um ID de sala de chat único e consistente entre dois usuários.
   * @param uid1 UID do primeiro usuário.
   * @param uid2 UID do segundo usuário.
   * @returns O ID da sala de chat.
   */
  private getChatRoomId(uid1: string, uid2: string): string {
    // Ordena os UIDs alfabeticamente para garantir consistência
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  }

  /**
   * Busca as mensagens de uma conversa direta em tempo real.
   * @param user1Uid UID do usuário logado.
   * @param user2Uid UID do outro usuário na conversa.
   * @returns Um Observable com o array de mensagens da DM.
   */
  getDirectMessages(user1Uid: string, user2Uid: string): Observable<ChatMessage[]> {
    const chatRoomId = this.getChatRoomId(user1Uid, user2Uid);
    const messagesCollectionRef = collection(this.firestore, `direct-messages/${chatRoomId}/messages`);
    const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'), limit(100));
    return collectionData(q, { idField: 'id' }) as Observable<ChatMessage[]>;
  }

  /**
   * Envia uma mensagem direta para outro usuário.
   * @param text O conteúdo da mensagem.
   * @param sender O usuário que está enviando.
   * @param recipientUid O UID do usuário que receberá a mensagem.
   */
   async sendDirectMessage(text: string, sender: AppUser, recipientUid: string) {
    

    if (!sender.uid) {
      console.error('8. [CHAT SERVICE] Bloqueado: UID do remetente é nulo!');
      return;
    }

    const chatRoomId = this.getChatRoomId(sender.uid, recipientUid);

    const chatRoomRef = doc(this.firestore, `direct-messages/${chatRoomId}`);
    const messagesCollectionRef = collection(chatRoomRef, 'messages');

    // Usar um batch para garantir que todas as escritas aconteçam juntas
    const batch = writeBatch(this.firestore);
    
    // 1. Prepara a nova mensagem
    const newMessageRef = doc(messagesCollectionRef); // Cria a referência para a nova mensagem
    const newTimestamp = Timestamp.now(); // <-- USA A MESMA TIMESTAMP PARA TUDO
    
    const newMessageData = {
      text: text,
      senderUid: sender.uid,
      senderName: sender.name,
      timestamp: newTimestamp // <-- Usa a timestamp gerada
    };
    
    batch.set(newMessageRef, newMessageData);

    // 2. Atualiza o documento principal da sala
    batch.update(chatRoomRef, {
      lastMessage: { // Atualiza a cópia da última mensagem
        text: text,
        timestamp: newTimestamp // <-- Usa a mesma timestamp
      },
      // Atualiza o timestamp de 'lido' para quem enviou a mensagem
      [`lastRead.${sender.uid}`]: newTimestamp // <-- Usa a mesma timestamp
    });

    return await batch.commit();
  }

  // NOVO MÉTODO: Marca uma conversa como lida
  markAsRead(chatRoomId: string, userId: string): Promise<void> {
    const chatRoomRef = doc(this.firestore, `direct-messages/${chatRoomId}`);
    return updateDoc(chatRoomRef, {
      [`lastRead.${userId}`]: serverTimestamp()
    });
  }

  // NOVO MÉTODO: Busca a lista de conversas, e não as mensagens
  getConversations(userId: string): Observable<any[]> {
    const roomsCollection = collection(this.firestore, 'direct-messages');
    // Query para pegar apenas as salas das quais o usuário é membro
    const q = query(roomsCollection, where('members', 'array-contains', userId));
    return collectionData(q, { idField: 'id' });
  }
}