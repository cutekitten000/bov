import { inject, Injectable } from '@angular/core';
// IMPORTANTE: Adicione 'createUserWithEmailAndPassword' na linha abaixo
import { Auth, signInWithEmailAndPassword, signOut, authState, User, sendPasswordResetEmail, createUserWithEmailAndPassword, UserCredential } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);

  // Observable para saber o estado do usuário (logado ou não)
  readonly authState$: Observable<User | null> = authState(this.auth);

  // Função de Login
  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
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
}