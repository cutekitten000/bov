import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// Imports do Angular Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AsyncPipe } from '@angular/common';

// Imports de Serviços
import { AuthService, AppUser } from '../../services/auth';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    AsyncPipe, RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatListModule, MatIconModule, MatDividerModule
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboard implements OnInit {
  private authService = inject(AuthService);
  private dbService = inject(DatabaseService);
  private router = inject(Router);

  adminName = 'Admin';

  ngOnInit(): void {
    this.authService.authState$.pipe(
      switchMap(user => user ? this.dbService.getUserProfile(user.uid) : of(null))
    ).subscribe(admin => {
      if (admin) {
        this.adminName = admin.name;
      }
    });
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}