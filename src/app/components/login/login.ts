import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; // Importe o Router
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
    CommonModule,
    RouterLink
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
            animate('300ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' }))
          ])
        ]),
        // Animação escalonada para o conteúdo do formulário
        query('.login-card > *', [
          style({ opacity: 0, transform: 'translateY(30px)' }),
          stagger(100, [
            animate('300ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' }))
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
    if (this.loginForm.invalid) return;

    try {
        const email = this.loginForm.value.email!;
        const password = this.loginForm.value.password!;

        const userCredential = await this.authService.login(email, password);

        // **LÓGICA DE REDIRECIONAMENTO**
        if (userCredential.user.email?.endsWith('@admin.com')) {
            this.router.navigate(['/admin/dashboard']);
        } else if (userCredential.user.email?.endsWith('@tahto.com.br')) {
            this.router.navigate(['/agent/dashboard']);
        } else {
            // Usuário com domínio não reconhecido é deslogado por segurança
            await this.authService.logout();
            alert('Tipo de usuário não reconhecido.');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Email ou senha inválidos.');
    }
}
}



    