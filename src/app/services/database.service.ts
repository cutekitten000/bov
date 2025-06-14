import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';

// Definindo uma interface para o nosso modelo de usuário no banco de dados
export interface AppUser {
  uid: string;
  email: string | null;
  name: string;
  th: string;
  role: 'agent' | 'admin';
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private firestore: Firestore = inject(Firestore);

  /**
   * Cria um novo documento de usuário na coleção 'users' do Firestore.
   * @param user O objeto User retornado pelo Firebase Authentication.
   * @param additionalData Dados extras do formulário de cadastro.
   * @returns Uma promessa que é resolvida quando o documento é escrito.
   */
  createUserProfile(user: User, additionalData: { name: string; th: string }): Promise<void> {
    // Cria uma referência para o documento do usuário. O ID do documento será o mesmo UID da autenticação.
    const userDocRef = doc(this.firestore, `users/${user.uid}`);

    // Define os dados do documento
    const userData: AppUser = {
      uid: user.uid,
      email: user.email,
      name: additionalData.name,
      th: additionalData.th,
      role: 'agent' // Todo novo usuário cadastrado pelo app é um 'agent'
    };

    // Salva o documento no Firestore
    return setDoc(userDocRef, userData);
  }
}