import { inject, Injectable } from '@angular/core';
// IMPORTANTE: Adicione 'createUserWithEmailAndPassword' na linha abaixo
import { Auth, authState, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, User, UserCredential } from '@angular/fire/auth';
import { firstValueFrom, Observable } from 'rxjs';
import { Functions, httpsCallable } from '@angular/fire/functions'; // <-- ADICIONE ESTE IMPORT

export interface AppUser {
  uid: string;
  email: string | null;
  name: string;
  th: string;
  role: 'agent' | 'admin';
  salesGoal: number;
  status: 'active' | 'pending' | 'inactive';
} 

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private functions: Functions = inject(Functions);

  // Observable para saber o estado do usuário (logado ou não)
  readonly authState$: Observable<User | null> = authState(this.auth);

  // Função de Login
  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }
  /** Retorna o usuário logado atualmente como uma Promise */
  getCurrentUser(): Promise<User | null> {
    return firstValueFrom(this.authState$);
  }

  // --- MÉTODO FALTANTE ADICIONADO AQUI ---
  // Função de Cadastro
  signUp(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  // Função de Logout
  logout(): Promise<void> {
    return signOut(this.auth);
  }

  // Função de Redefinição de Senha
  sendPasswordResetEmail(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  // ****** ADICIONE ESTE NOVO MÉTODO ******
  /**
   * Chama a Cloud Function para enviar um email de reset de senha para um usuário.
   * @param email O email do usuário alvo.
   */
  resetPasswordForUser(email: string): Promise<any> {
    // Cria uma referência para a nossa função na nuvem
    const resetFunction = httpsCallable(this.functions, 'sendPasswordResetEmailFromAdmin');
    // Chama a função, passando o email como dado
    return resetFunction({ email: email });
  }
}