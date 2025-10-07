// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component'; // หรือ MainComponent ถ้าเป็นชื่อนั้นจริงๆ
import { appConfig } from './app/app.config'; // <--- IMPORT appConfig เข้ามา
import { FirebaseCleanupService } from './app/services/firebase-cleanup.service';
import { inject } from '@angular/core';

bootstrapApplication(AppComponent, appConfig) // <--- ใช้ appConfig ตรงนี้
  .then((appRef) => {
    // เพิ่ม cleanup service ไปที่ window object สำหรับ development
    if (window.location.hostname.includes('localhost')) {
      const cleanupService = appRef.injector.get(FirebaseCleanupService);
      (window as any).firebaseCleanup = cleanupService;
      console.log('🧹 Firebase Cleanup Service available at window.firebaseCleanup');
    }
  })
  .catch(err => console.error(err));