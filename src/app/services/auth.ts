import { inject, Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, authState, User, sendPasswordResetEmail } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);

  // Observable para saber o estado do usuário (logado ou não)
  readonly authState$: Observable<User | null> = authState(this.auth);

  // Função de Login
  login(email: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  // Função de Logout
  logout(): Promise<void> {
    return signOut(this.auth);
  }

  sendPasswordResetEmail(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }
}