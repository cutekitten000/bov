import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    map(user => {
      // Se existe um usuário logado, permite o acesso à rota
      if (user) {
        return true;
      }

      // Se não há usuário, redireciona para a página de login
      return router.createUrlTree(['/login']);
    })
  );
};