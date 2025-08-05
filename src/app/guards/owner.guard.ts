import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, take, filter, catchError, switchMap, tap, first } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class OwnerGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    console.log('[OwnerGuard] Checking if user can access owner page');

    return this.authService.currentUser$.pipe(
      filter(user => user !== undefined),
      tap(user => console.log('[OwnerGuard] Auth state determined:', user ? 'User found' : 'No user')),
      first(),
      map(user => {
        if (!user) {
          console.log('[OwnerGuard] No user found, redirecting to login');
          return this.router.createUrlTree(['/login/owner']);
        }

        console.log('[OwnerGuard] User details:', {
          memberType: user.memberType,
          provider: user.provider,
          needsProfileSetup: user.needsProfileSetup,
          hasManagerName: !!user.managerName,
          hasPhoneNumber: !!user.phoneNumber
        });

        // ถ้าผู้ใช้ไม่ใช่ owner
        if (user.memberType !== 'owner') {
          console.log('[OwnerGuard] User is not owner, redirecting to login');
          return this.router.createUrlTree(['/login/owner']);
        }

        // ถ้าผู้ใช้ยังไม่มีข้อมูลครบ
        if (user.needsProfileSetup) {
          console.log('[OwnerGuard] Owner needs profile setup, redirecting to register');
          return this.router.createUrlTree(['/register', 'owner'], {
            queryParams: { fromGoogle: user.provider === 'google' ? 'true' : undefined }
          });
        }

        // ถ้าผู้ใช้มีข้อมูลครบแล้ว
        console.log('[OwnerGuard] Owner has complete profile, allowing access');
        return true;
      }),
      catchError(error => {
        console.error('[OwnerGuard] Error in guard:', error);
        return of(this.router.createUrlTree(['/login/owner']));
      })
    );
  }
}