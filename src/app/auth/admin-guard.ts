import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, switchMap, of, take, from } from 'rxjs';
import { AuthService } from '../services/auth';
import { DatabaseService } from '../services/database.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const dbService = inject(DatabaseService);
  const router = inject(Router);

  return authService.authState$.pipe(
    take(1), // Pega o estado de login atual uma única vez
    switchMap(user => {
      // Se não houver usuário logado, emite 'null' para o próximo passo
      if (!user) {
        return of(null); 
      }
      // Se houver, busca o perfil correspondente no banco de dados
      return from(dbService.getUserProfile(user.uid));
    }),
    map(userProfile => {
      // --- LÓGICA CORRIGIDA AQUI ---

      // Caso 1: O perfil foi encontrado e a role é 'admin'
      if (userProfile && userProfile.role === 'admin') {
        return true; // Acesso permitido!
      }
      
      // Caso 2: O perfil foi encontrado, mas NÃO é admin
      if (userProfile && userProfile.role !== 'admin') {
        // Redireciona para o dashboard do agente
        return router.createUrlTree(['/agent/dashboard']);
      }

      // Caso 3: Não está logado ou o perfil não foi encontrado.
      // Nestes casos, redireciona para a página de login.
      return router.createUrlTree(['/login']);
    })
  );
};