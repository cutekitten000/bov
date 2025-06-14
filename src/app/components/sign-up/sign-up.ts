import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth';
import { DatabaseService } from '../../services/database.service';
import { emailDomainValidator, matchPasswordValidator } from '../../validators/custom-validators';

// Imports do Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss'
})
export class SignUp {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  dbService = inject(DatabaseService);
  router = inject(Router);

  hidePassword = true;
  submitting = false;

  signUpForm: FormGroup = this.fb.group({
    th: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email, emailDomainValidator('tahto.com.br')]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: matchPasswordValidator('password', 'confirmPassword') });

  async onSubmit() {
    if (this.signUpForm.invalid || this.submitting) return;

    this.submitting = true;
    try {
      const { email, password, name, th } = this.signUpForm.value;
      const userCredential = await this.authService.signUp(email!, password!);
      await this.dbService.createUserProfile(userCredential.user, { name: name!, th: th! });

      alert('Cadastro realizado com sucesso! Você será redirecionado para o login.');
      this.router.navigate(['/login']);

    } catch (error: any) { // Captura o erro com um tipo explícito
      console.error('Erro no cadastro:', error);

      // LÓGICA DE ERRO MELHORADA
      if (error.code === 'auth/email-already-in-use') {
        alert('Erro: Este endereço de e-mail já está sendo utilizado por outra conta.');
      } else if (error.code === 'permission-denied') {
          alert('Erro de permissão ao salvar os dados. Verifique as regras de segurança do Firestore.');
      }
      else {
        alert('Ocorreu um erro inesperado durante o cadastro. Tente novamente.');
      }

    } finally {
      this.submitting = false;
    }
  }
}