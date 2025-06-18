import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class OwnerGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate() {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user && user.memberType === 'owner') {
          return true;
        }
        // Redirect to login page if not owner
        this.router.navigate(['/login'], { queryParams: { type: 'owner' } });
        return false;
      })
    );
  }
} 