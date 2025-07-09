import { Injectable, inject } from '@angular/core';
import { Firestore, Timestamp, addDoc, collection, collectionData, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from '@angular/fire/firestore';
import { Storage, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { map, Observable } from 'rxjs';
import { ChatMessage } from '../models/chat-message.model';
import { AppUser } from './auth';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private firestore: Firestore = inject(Firestore);
  private storage: Storage = inject(Storage);

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
   * Faz o upload de um arquivo para um caminho específico no Firebase Storage.
   * @param file O arquivo a ser enviado.
   * @param path O caminho completo no Storage (ex: 'uploads/file123.jpg').
   * @returns A URL de download pública do arquivo.
   */
  async uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(this.storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
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
  sendGroupChatMessage(messageData: Partial<ChatMessage>, user: AppUser): Promise<any> {
    const messagesColRef = collection(this.firestore, 'group-chat');
    const newMessage: Omit<ChatMessage, 'id'> = {
      senderUid: user.uid,
      senderName: user.name,
      senderRole: user.role,
      timestamp: Timestamp.now(),
      // Adiciona os novos dados
      text: messageData.text || '',
      fileUrl: messageData.fileUrl || '',
      fileName: messageData.fileName || '',
      fileType: messageData.fileType || 'text',
      filePath: messageData.filePath || ''
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
   async sendDirectMessage(messageData: Partial<ChatMessage>, sender: AppUser, recipientUid: string) {
    if (!sender.uid) return;

    const chatRoomId = this.getChatRoomId(sender.uid, recipientUid);
    const chatRoomRef = doc(this.firestore, `direct-messages/${chatRoomId}`);
    const messagesCollectionRef = collection(chatRoomRef, 'messages');
    const batch = writeBatch(this.firestore);
    const newMessageRef = doc(messagesCollectionRef);
    const newTimestamp = Timestamp.now();
    
    const newMessage: ChatMessage = {
      id: newMessageRef.id,
      senderUid: sender.uid,
      senderName: sender.name,
      senderRole: sender.role,
      timestamp: newTimestamp,
      // Adiciona os novos dados
      text: messageData.text || '',
      fileUrl: messageData.fileUrl || '',
      fileName: messageData.fileName || '',
      fileType: messageData.fileType || 'text',
      filePath: messageData.filePath || ''
    };
    
    batch.set(newMessageRef, newMessage);

    batch.update(chatRoomRef, {
      lastMessage: {
        // Atualiza lastMessage para mostrar o nome do arquivo se for um anexo
        text: messageData.fileType === 'text' ? messageData.text : messageData.fileName || 'Arquivo',
        timestamp: newTimestamp
      },
      [`lastRead.${sender.uid}`]: newTimestamp
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

   /**
   * Fixa uma mensagem específica no chat de equipe.
   * @param message A mensagem completa a ser fixada.
   */
  async pinMessageInGroupChat(message: ChatMessage): Promise<void> {
    if (!message.id) throw new Error("ID da mensagem é necessário para fixá-la.");
    
    // Primeiro, remove o pino de qualquer outra mensagem que possa estar fixada
    await this.unpinAllMessagesInGroupChat();

    // Agora, fixa a nova mensagem
    const messageRef = doc(this.firestore, `group-chat/${message.id}`);
    return updateDoc(messageRef, { isPinned: true });
  }

  /**
   * Desafixa uma mensagem específica no chat de equipe.
   * @param messageId O ID da mensagem a ser desafixada.
   */
  async unpinMessageInGroupChat(messageId: string): Promise<void> {
    const messageRef = doc(this.firestore, `group-chat/${messageId}`);
    return updateDoc(messageRef, { isPinned: false });
  }

  /**
   * Busca a mensagem atualmente fixada no chat de equipe.
   * Retorna a mensagem ou null se não houver nenhuma.
   */
  getPinnedMessageFromGroupChat(): Observable<ChatMessage | null> {
    const messagesRef = collection(this.firestore, 'group-chat');
    const q = query(messagesRef, where("isPinned", "==", true), limit(1));
    
    return collectionData(q, { idField: 'id' }).pipe(
      map((messages: string | any[]) => messages.length > 0 ? messages[0] as ChatMessage : null)
    );
  }

  /**
   * Método auxiliar para garantir que apenas uma mensagem esteja fixada por vez.
   */
  private async unpinAllMessagesInGroupChat(): Promise<void> {
    const messagesRef = collection(this.firestore, 'group-chat');
    const q = query(messagesRef, where("isPinned", "==", true));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(this.firestore);
    querySnapshot.forEach(document => {
      batch.update(document.ref, { isPinned: false });
    });
    
    return batch.commit();
  }
}