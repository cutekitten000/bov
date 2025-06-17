import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// Imports de Animação e Material
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

// Imports dos nossos Serviços e Validadores
import { AuthService } from '../../services/auth';
import { DatabaseService } from '../../services/database.service';
import { emailDomainValidator, matchPasswordValidator } from '../../validators/custom-validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, CommonModule, RouterLink
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
      const userEmail = userCredential.user.email;

      if (userEmail?.endsWith('@admin.com')) {
        this.router.navigate(['/admin/dashboard']);
      } else if (userEmail?.endsWith('@tahto.com.br')) {
        this.router.navigate(['/agent/dashboard']);
      } else {
        await this.authService.logout();
        alert('Tipo de usuário não reconhecido.');
      }
    } catch (error) {
      alert('Email ou senha inválidos.');
    }
  }

  // Submissão do formulário de Cadastro
  async onSignUpSubmit(): Promise<void> {
    if (this.signUpForm.invalid) return;
    try {
      const { email, password, name, th } = this.signUpForm.value;
      const userCredential = await this.authService.signUp(email!, password!);
      await this.dbService.createUserProfile(userCredential.user, { name: name!, th: th! });
      
      alert('Cadastro realizado com sucesso! Por favor, faça o login.');
      this.togglePanel(false); // Volta para a tela de login
      this.signUpForm.reset();

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        alert('Erro: Este e-mail já está em uso.');
      } else {
        alert('Ocorreu um erro no cadastro.');
      }
    }
  }
}