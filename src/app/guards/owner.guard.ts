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

    // ตรวจสอบว่าผู้ใช้กำลังพยายามออกจาก registration page หรือไม่
    const isNavigatingFromRegister = route.queryParams['fromGoogle'] === 'true' || 
                                   route.queryParams['additionalInfo'] === 'true' ||
                                   this.router.url.includes('/register');

    // ตรวจสอบว่าผู้ใช้กำลังพยายามไปที่ /main หรือไม่
    const isNavigatingToMain = this.router.url.includes('/main') || 
                              window.location.pathname === '/main';

    return this.authService.currentUser$.pipe(
      filter(user => user !== undefined),
      tap(user => console.log('[OwnerGuard] Auth state determined:', user ? 'User found' : 'No user')),
      first(),
      map(user => {
        if (!user) {
          console.log('[OwnerGuard] No user found, redirecting to login');
          return this.router.createUrlTree(['/login/owner']);
        }

        if (user.memberType === 'owner') {
          // ตรวจสอบว่าผู้ใช้กำลังอยู่ใน Google flow หรือไม่
          const isTemporaryGoogleUser = this.authService.isTemporaryUser();
          
          // console.log('[OwnerGuard] User details:', {
          //   isTemporaryGoogleUser,
          //   isNavigatingFromRegister,
          //   isNavigatingToMain,
          //   hasManagerName: !!user.managerName,
          //   provider: user.provider,
          //   needsProfileSetup: user.needsProfileSetup
          // });
          
          // ถ้าผู้ใช้เป็น temporary Google user หรือกำลังอยู่ใน registration flow
          if (isTemporaryGoogleUser || isNavigatingFromRegister) {
            console.log('[OwnerGuard] User is in Google flow or registration, allowing navigation to main');
            return this.router.createUrlTree(['/main']);
          }

          // ถ้าผู้ใช้มาจาก Google และยังไม่มีข้อมูลครบ ให้อนุญาตไป main
          if (user.provider === 'google' && !user.managerName && user.needsProfileSetup) {
            console.log('[OwnerGuard] Google user without complete info, allowing navigation to main');
            return this.router.createUrlTree(['/main']);
          }

          // ถ้าผู้ใช้มาจาก Google และมีข้อมูลครบแล้ว ให้อนุญาตเข้าหน้า owner
          if (user.provider === 'google' && user.managerName && !user.needsProfileSetup) {
            console.log('[OwnerGuard] Google user with complete info, allowing access to owner page');
            return true;
          }

          // ถ้าผู้ใช้กำลังพยายามไปที่ /main และไม่มีข้อมูลครบ ให้อนุญาต
          if (isNavigatingToMain && !user.managerName) {
            console.log('[OwnerGuard] User navigating to main without complete info, allowing access');
            return true;
          }

          // เพิ่มเงื่อนไขตรวจสอบว่ามีข้อมูลครบหรือไม่
          if (!user.managerName) {
            console.log('[OwnerGuard] Owner needs additional info, redirecting to register');
            return this.router.createUrlTree(['/register', 'owner'], {
              queryParams: { additionalInfo: 'true' }
            });
          }

          console.log('[OwnerGuard] User is owner with complete info, allowing access');
          return true;
        }

        console.log('[OwnerGuard] User is not owner, redirecting');
        return this.router.createUrlTree(['/login/owner']);
      }),
      catchError(error => {
        console.error('[OwnerGuard] Error in guard:', error);
        return of(this.router.createUrlTree(['/login/owner']));
      })
    );
  }
}