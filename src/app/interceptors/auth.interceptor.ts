// src/app/interceptors/auth.interceptor.ts
import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpHandlerFn
} from '@angular/common/http';
import { Observable, from, throwError, of } from 'rxjs';
import { switchMap, catchError, retryWhen, mergeMap, delay, take } from 'rxjs/operators';
import { Auth } from '@angular/fire/auth'; // Import Auth from @angular/fire/auth
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Function-based interceptor for use with withInterceptors
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const auth = inject(Auth);
  const router = inject(Router);
  const authService = inject(AuthService);

  // ถ้า request ไปยัง backend ของเรา
  if (req.url.startsWith('http://localhost:3000/api')) {
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      return from(authService.refreshToken()).pipe(
        switchMap(idToken => {
          // Clone the request เพื่อเพิ่ม Authorization header
          const clonedRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${idToken}`
            }
          });
          return next(clonedRequest);
        }),
        catchError((error) => {
          console.error('[AuthInterceptor] Error getting auth token:', error);
          if (error instanceof HttpErrorResponse) {
            // Handle 401 Unauthorized or 403 Forbidden responses
            if (error.status === 401 || error.status === 403) {
              console.log('[AuthInterceptor] Token expired or invalid, redirecting to login');
              router.navigate(['/login/member']);
            }
          }
          return throwError(() => error);
        })
      );
    }
  }
  
  // ถ้าไม่มี user หรือไม่ใช่ request ไป Backend ของเรา
  return next(req);
}

// Keep the class-based interceptor for backward compatibility
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private auth: Auth, private router: Router, private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip authentication for auth-related endpoints to prevent circular dependencies
    if (request.url.includes('/auth/verify-token')) {
      return next.handle(request);
    }
    
    // ถ้า request ไปยัง backend ของเรา
    if (request.url.startsWith('http://localhost:3000/api')) { // ตรวจสอบ URL ของ Backend
      const currentUser = this.auth.currentUser;
      
      if (currentUser) {
        return from(this.authService.refreshToken()).pipe(
          switchMap(idToken => {
            // Clone the request เพื่อเพิ่ม Authorization header
            const clonedRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${idToken}`
              }
            });
            return next.handle(clonedRequest);
          }),
          catchError((error) => {
            console.error('[AuthInterceptor] Error getting auth token:', error);
            if (error instanceof HttpErrorResponse) {
              // Handle 401 Unauthorized or 403 Forbidden responses
              if (error.status === 401 || error.status === 403) {
                console.log('[AuthInterceptor] Token expired or invalid, redirecting to login');
                this.router.navigate(['/login/member']);
              }
            }
            return throwError(() => error);
          })
        );
      } else {
        // ถ้าไม่มี user หรือ idToken ให้ส่ง request เดิมไป
        return next.handle(request);
      }
    } else {
      // สำหรับ request ที่ไม่ได้ส่งไป Backend ของเรา ให้ส่งไปโดยไม่แก้ไข
      return next.handle(request);
    }
  }
}