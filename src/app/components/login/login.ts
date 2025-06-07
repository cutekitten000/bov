import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router'; // Importe o Router
import { AuthService } from '../../services/auth'; // Importe nosso serviço

// Imports de Animação e Material...
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    CommonModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  // ADICIONE ESTE BLOCO DE ANIMAÇÕES
  animations: [
    trigger('pageAnimations', [
      transition(':enter', [
        // Animação para os dois painéis principais
        query('.branding-pane, .form-pane', [
          style({ opacity: 0, transform: 'translateY(50px)' }),
          stagger(150, [
            animate('800ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' }))
          ])
        ]),
        // Animação escalonada para o conteúdo do formulário
        query('.login-card > *', [
          style({ opacity: 0, transform: 'translateY(30px)' }),
          stagger(100, [
            animate('600ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' }))
          ])
        ], { delay: 300 }) // Começa depois que os painéis começam a aparecer
      ])
    ])
  ]
})
export class Login {
  // Injeção de dependências
  private fb = inject(FormBuilder);
  private authService = inject(AuthService); // Injete o AuthService
  private router = inject(Router);         // Injete o Router

  hidePassword = true;
  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Mude o método onSubmit para async para usar await
  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return; // Se o formulário for inválido, não faz nada
    }

    try {
      const email = this.loginForm.value.email;
      const password = this.loginForm.value.password;

      // Chama o método de login do nosso serviço
      await this.authService.login(email, password);

      // Se o login for bem-sucedido, navega para o dashboard
      this.router.navigate(['/dashboard']);

    } catch (error) {
      // Em caso de erro (senha errada, etc.), exibe no console
      console.error('Erro no login:', error);
      // Futuramente, podemos mostrar uma notificação de erro para o usuário aqui
    }
  }
}



    