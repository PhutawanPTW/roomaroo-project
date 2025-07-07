import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, take, filter, catchError, switchMap, tap, first } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthRedirectGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    console.log('[AuthRedirectGuard] Checking route access');
    
    return this.authService.currentUser$.pipe(
      // Wait until auth state is definitely determined (not undefined)
      filter(user => user !== undefined),
      // Add logging to see the auth state
      tap(user => console.log('[AuthRedirectGuard] Auth state determined:', user ? 'User found' : 'No user')),
      // Take only the first emission after auth is determined
      first(),
      // Map the user to a boolean or UrlTree
      map(user => {
        const destPath = route.routeConfig?.path || '';
        const isLoginPage = destPath.startsWith('login');
        const isRegisterPage = destPath.startsWith('register');

        console.log(`[AuthRedirectGuard] Checking access to ${destPath}, user:`, user ? `${user.memberType}` : 'null');

        if (user) {
          if (user.memberType === 'owner') {
            if (!destPath.startsWith('owner')) {
              console.log('[AuthRedirectGuard] Owner accessing non-owner page, redirecting to owner dashboard');
              return this.router.createUrlTree(['/owner']);
            }
            return true;
          } else if (user.memberType === 'member' && !user.needsProfileSetup) {
            if (isLoginPage || isRegisterPage) {
              console.log('[AuthRedirectGuard] Member accessing login/register page, redirecting to main');
              return this.router.createUrlTree(['/main']);
            }
            return true;
          } else if (user.memberType === 'member' && user.needsProfileSetup) {
            if (isRegisterPage) return true;
            console.log('[AuthRedirectGuard] Member needs profile setup, redirecting to register');
            return this.router.createUrlTree(['/register', 'member']);
          } else {
            return this.router.createUrlTree(['/main']);
          }
        }
        
        // User not logged in, allow access to login/register pages
        console.log('[AuthRedirectGuard] No user, allowing access');
        return true;
      }),
      catchError(error => {
        console.error('[AuthRedirectGuard] Error in guard:', error);
        // In case of error, allow access (default behavior)
        return of(true);
      })
    );
  }
}