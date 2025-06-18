// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth'; // Import AngularFireAuth

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private afAuth: AngularFireAuth) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // ถ้า request ไปยัง backend ของเรา
    if (request.url.startsWith('http://localhost:3000/api')) { // ตรวจสอบ URL ของ Backend
      return from(this.afAuth.currentUser).pipe( // รับ Firebase user ปัจจุบัน
        switchMap(user => {
          if (user) {
            return from(user.getIdToken()).pipe( // รับ Firebase ID Token
              switchMap(idToken => {
                // Clone the request เพื่อเพิ่ม Authorization header
                const clonedRequest = request.clone({
                  setHeaders: {
                    Authorization: `Bearer ${idToken}`
                  }
                });
                return next.handle(clonedRequest);
              })
            );
          } else {
            // ถ้าไม่มี user หรือ idToken ให้ส่ง request เดิมไป
            return next.handle(request);
          }
        })
      );
    } else {
      // สำหรับ request ที่ไม่ได้ส่งไป Backend ของเรา ให้ส่งไปโดยไม่แก้ไข
      return next.handle(request);
    }
  }
}