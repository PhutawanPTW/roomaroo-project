import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthRedirectGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot) {
    return this.authService.currentUser$.pipe(
      take(1),
      timeout(5000), // เพิ่ม timeout
      map(user => {
        // Use target route (snapshot) instead of current router.url to avoid stale value during navigation
        const destPath = route.routeConfig?.path || '';
        const isLoginPage = destPath.startsWith('login');
        const isRegisterPage = destPath.startsWith('register');
        
        console.log('[AuthRedirectGuard] Current URL:', destPath);
        console.log('[AuthRedirectGuard] User:', user ? `${user.memberType} (needs setup: ${user.needsProfileSetup})` : 'null');

        if (user) {
          // Owner should always go to /owner (regardless of needsProfileSetup)
          if (user.memberType === 'owner') {
            if (!destPath.startsWith('/owner')) {
              console.log('[AuthRedirectGuard] Owner detected, redirecting to /owner');
              this.router.navigate(['/owner']);
              return false;
            }
            // ถ้าอยู่ในหน้า /owner แล้ว ให้ผ่าน
            return true;
          } 
          // Member with completed profile goes to main
          else if (user.memberType === 'member' && !user.needsProfileSetup) {
            if (isLoginPage || isRegisterPage) {
              console.log('[AuthRedirectGuard] Member already logged in, redirecting to main');
              this.router.navigate(['/main']);
              return false;
            }
            // ถ้าไม่ใช่หน้า login/register ให้ผ่าน
            return true;
          } 
          // Member needs profile setup - allow access to register page only
          else if (user.memberType === 'member' && user.needsProfileSetup) {
            if (isRegisterPage) {
              console.log('[AuthRedirectGuard] Member needs profile setup, allowing access to register page');
              return true;
            }
            // ถ้าไม่ใช่ register ให้ redirect
            console.log('[AuthRedirectGuard] Member needs profile setup, redirecting to register');
            this.router.navigate(['/register', 'member']);
            return false;
          } 
          // Unknown state - redirect to main
          else {
            if (!destPath.startsWith('/main')) {
              console.log('[AuthRedirectGuard] User exists but unknown state, redirecting to main');
              this.router.navigate(['/main']);
              return false;
            }
            return true;
          }
        }
        
        // User not logged in, allow access to login/register pages
        console.log('[AuthRedirectGuard] No user logged in, allowing access to auth pages');
        return true;
      }),
      catchError(error => {
        console.error('[AuthRedirectGuard] Error checking user state:', error);
        // ในกรณีเกิด error ให้อนุญาตเข้าถึงหน้า login/register
        return of(true);
      })
    );
  }
}