import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  id?: string;
  senderUid: string;
  senderName: string;
  senderRole?: 'admin' | 'agent';
  timestamp: Timestamp;

  // Campos principais
  text?: string; // O texto agora é opcional, pois uma mensagem pode ser só um arquivo

  // Novos campos para o anexo
  fileUrl?: string;   // A URL para baixar ou ver o arquivo
  fileName?: string;  // O nome original do arquivo (ex: "relatorio.pdf")
  fileType?: string;  // O tipo do arquivo (ex: "image/jpeg" ou "application/pdf")
  filePath?: string;
  isPinned?: boolean;
}