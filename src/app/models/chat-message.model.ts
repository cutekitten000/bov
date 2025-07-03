import { Timestamp } from 'firebase/firestore';
import { AppUser } from '../services/auth';

export interface ChatMessage {
  id?: string;
  text: string;
  senderUid: string;
  senderName: string;
  timestamp: Timestamp;
  senderRole?: AppUser['role'];
}