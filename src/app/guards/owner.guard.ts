import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, filter, timeout, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OwnerGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      // รอจนกว่า auth state จะ settle (ไม่ใช่ loading state)
      filter(user => user !== undefined), // รอจนกว่าจะได้ค่าที่แน่นอน (ไม่ใช่ undefined)
      take(1),
      timeout(10000), // เพิ่ม timeout เป็น 10 วินาที
      map(user => {
        console.log('[OwnerGuard] Checking user:', JSON.stringify(user));
        console.log('[OwnerGuard] User memberType:', user?.memberType);
        console.log('[OwnerGuard] User member_type:', (user as any)?.member_type);

        // อนุญาตเฉพาะ owner - ไม่เช็ค needsProfileSetup
        if (user && (user.memberType === 'owner' || (user as any)?.member_type === 'owner')) {
          console.log('[OwnerGuard] Owner access granted');
          return true;
        }

        // ถ้าเป็น member ให้ redirect ไปหน้า main
        if (user && (user.memberType === 'member' || (user as any)?.member_type === 'member')) {
          console.log('[OwnerGuard] Member detected, redirecting to /main');
          this.router.navigate(['/main']);
          return false;
        }

        // ถ้าไม่มี user หรือไม่มี memberType ให้ redirect ไปหน้า login
        console.log('[OwnerGuard] No valid user or memberType, redirecting to login');
        this.router.navigate(['/login', 'owner'], { 
          queryParams: { 
            error: 'access-denied',
            message: 'กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของหอพัก'
          } 
        });
        return false;
      }),
      catchError(error => {
        console.error('[OwnerGuard] Error checking user access:', error);
        this.router.navigate(['/login', 'owner'], { 
          queryParams: { 
            error: 'auth-error',
            message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
          } 
        });
        return of(false);
      })
    );
  }
}