import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// Imports de Animação e Material
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // 1. IMPORTADO O SNACKBAR

// Imports dos nossos Serviços e Validadores
import { AuthService } from '../../services/auth';
import { DatabaseService } from '../../services/database.service';
import { emailDomainValidator, matchPasswordValidator } from '../../validators/custom-validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, CommonModule, RouterLink,
    MatSnackBarModule // Adicionado para garantir a disponibilidade no template, se necessário
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  // Injeção de dependências
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private dbService = inject(DatabaseService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar); // 2. SNACKBAR INJETADO

  // Controle do painel
  isSignUpActive = false;

  // Formulários
  loginForm: FormGroup;
  signUpForm: FormGroup;

  // Controles de visibilidade de senha
  hideLoginPassword = true;
  hideSignUpPassword = true;
  hideConfirmPassword = true;

  constructor() {
    // Formulário de Login
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Formulário de Cadastro
    this.signUpForm = this.fb.group({
      th: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email, emailDomainValidator('tahto.com.br')]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: matchPasswordValidator('password', 'confirmPassword') });
  }

  // Alterna entre o painel de Login e Cadastro
  togglePanel(state: boolean): void {
    this.isSignUpActive = state;
  }

  // Submissão do formulário de Login
  async onLoginSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    try {
      const { email, password } = this.loginForm.value;
      const userCredential = await this.authService.login(email!, password!);
      const userProfile = await this.dbService.getUserProfile(userCredential.user.uid);

      if (userProfile) {
        // VERIFICAÇÃO DE STATUS ADICIONADA AQUI
        if (userProfile.status !== 'active') {
          await this.authService.logout(); // Desloga imediatamente
          // 3. ALERT SUBSTITUÍDO
          this.snackBar.open('Sua conta está pendente ou inativa. Fale com um administrador.', 'Fechar', {
            duration: 7000,
          });
          return;
        }

        // Se o status for 'active', continua com o redirecionamento por role
        if (userProfile.role === 'admin') {
          this.router.navigate(['/admin']);
        } else { // Assume que qualquer outra role ativa é 'agent'
          this.router.navigate(['/agent/dashboard']);
        }
      } else {
        await this.authService.logout();
        // 3. ALERT SUBSTITUÍDO
        this.snackBar.open('Não foi possível encontrar o perfil para este usuário.', 'Fechar', {
            duration: 5000,
        });
      }
    } catch (error) {
      console.error("Erro no login:", error);
      // 3. ALERT SUBSTITUÍDO
      this.snackBar.open('Email ou senha inválidos.', 'Fechar', {
        duration: 3000,
      });
    }
  }

  // Submissão do formulário de Cadastro
  async onSignUpSubmit(): Promise<void> {
    if (this.signUpForm.invalid) return;
    try {
      const { email, password, name, th } = this.signUpForm.value;
      const userCredential = await this.authService.signUp(email!, password!);
      await this.dbService.createUserProfile(userCredential.user, { name: name!, th: th! });

      // 3. ALERT SUBSTITUÍDO
      this.snackBar.open('Cadastro realizado! Sua conta precisa ser aprovada por um administrador.', 'Fechar', {
        duration: 7000,
      });
      this.togglePanel(false); // Volta para a tela de login
      this.signUpForm.reset();

    } catch (error: any) {
      // 3. ALERT SUBSTITUÍDO
      if (error.code === 'auth/email-already-in-use') {
        this.snackBar.open('Erro: Este e-mail já está em uso.', 'Fechar', {
            duration: 5000,
        });
      } else {
        this.snackBar.open('Ocorreu um erro no cadastro.', 'Fechar', {
            duration: 5000,
        });
      }
    }
  }
}