import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, take, filter, catchError, switchMap, tap, first } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class OwnerGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(): Observable<boolean | UrlTree> {
    console.log('[OwnerGuard] Checking if user can access owner page');
    
    return this.authService.currentUser$.pipe(
      // Wait until auth state is definitely determined (not undefined)
      filter(user => user !== undefined),
      // Add delay to ensure Firebase has time to restore the session
      tap(user => console.log('[OwnerGuard] Auth state determined:', user ? 'User found' : 'No user')),
      // Take only the first emission after auth is determined
      first(),
      // Map the user to a boolean or UrlTree
      map(user => {
        if (!user) {
          console.log('[OwnerGuard] No user found, redirecting to login');
          return this.router.createUrlTree(
            ['/login/owner'],
            { queryParams: { error: 'access-denied', message: 'กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของหอพัก' } }
          );
        }
        
        if (user.memberType === 'owner') {
          console.log('[OwnerGuard] User is owner, allowing access');
          return true;
        }
        
        console.log('[OwnerGuard] User is not owner, redirecting');
        return this.router.createUrlTree(
          ['/login/owner'],
          { queryParams: { error: 'access-denied', message: 'กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของหอพัก' } }
        );
      }),
      catchError(error => {
        console.error('[OwnerGuard] Error in guard:', error);
        return of(this.router.createUrlTree(
          ['/login/owner'],
          { queryParams: { error: 'auth-error', message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' } }
        ));
      })
    );
  }
}