import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  id?: string;
  text: string;
  senderUid: string;
  senderName: string;
  timestamp: Timestamp;
}