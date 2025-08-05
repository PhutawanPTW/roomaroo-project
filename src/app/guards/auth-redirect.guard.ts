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
      filter(user => user !== undefined),
      tap(user => console.log('[AuthRedirectGuard] Auth state determined:', user ? 'User found' : 'No user')),
      first(),
      map(user => {
        const destPath = route.routeConfig?.path || '';
        const isLoginPage = destPath.startsWith('login');
        const isRegisterPage = destPath.startsWith('register');
        const isMainPage = destPath === 'main';
        const isTenantListPage = destPath === 'tenant-list';
        const queryParams = route.queryParams;

        console.log(`[AuthRedirectGuard] Checking access to ${destPath}, user:`, user ? `${user.memberType}` : 'null');
        console.log('[AuthRedirectGuard] Query params:', queryParams);

        if (user) {
          // ถ้าผู้ใช้มาจาก Google flow และยังไม่มีข้อมูลครบ
          if (user.provider === 'google' && user.needsProfileSetup) {
            if (isRegisterPage) {
              console.log('[AuthRedirectGuard] Google user needs profile setup, allowing register access');
              return true;
            }
            console.log('[AuthRedirectGuard] Google user needs profile setup, redirecting to register');
            return this.router.createUrlTree(['/register', user.memberType], {
              queryParams: { fromGoogle: 'true' }
            });
          }

          // ถ้าผู้ใช้มีข้อมูลครบแล้ว
          if (!user.needsProfileSetup) {
            if (isLoginPage || isRegisterPage) {
              console.log('[AuthRedirectGuard] User has complete profile, redirecting to dashboard');
              if (user.memberType === 'owner') {
                return this.router.createUrlTree(['/owner']);
              } else {
                return this.router.createUrlTree(['/main']);
              }
            }
            
            // ป้องกัน owner เข้า main page
            if (isMainPage && user.memberType === 'owner') {
              console.log('[AuthRedirectGuard] Owner trying to access main page, redirecting to owner dashboard');
              return this.router.createUrlTree(['/owner']);
            }
            
            // ป้องกัน owner เข้า tenant-list ใน main
            if (isTenantListPage && user.memberType === 'owner') {
              console.log('[AuthRedirectGuard] Owner trying to access tenant-list in main, redirecting to owner tenant-list');
              return this.router.createUrlTree(['/owner/tenant-list']);
            }
            
            return true;
          }

          // ถ้าผู้ใช้ยังไม่มีข้อมูลครบ (ไม่ใช่ Google)
          if (user.needsProfileSetup) {
            if (isRegisterPage) {
              console.log('[AuthRedirectGuard] User needs profile setup, allowing register access');
              return true;
            }
            console.log('[AuthRedirectGuard] User needs profile setup, redirecting to register');
            return this.router.createUrlTree(['/register', user.memberType]);
          }
        }
        
        // User not logged in - allow access to login/register pages, redirect main to login
        if (isLoginPage || isRegisterPage) {
          console.log('[AuthRedirectGuard] No user, allowing access to login/register pages');
          return true;
        }
        
        // ไม่ redirect ไป login เมื่อเข้าหน้า main ครั้งแรก
        // ให้ผู้ใช้สามารถดูหน้า main ได้แม้ไม่ได้ล็อกอิน
        if (isMainPage) {
          console.log('[AuthRedirectGuard] No user accessing main page - allowing access');
          return true;
        }
        
        // สำหรับหน้าอื่นๆ ให้เข้าถึงได้
        console.log('[AuthRedirectGuard] No user, allowing access to other pages');
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