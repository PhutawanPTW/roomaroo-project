// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http'; // เพิ่มถ้าใช้ HttpClient
import { routes } from './app.routes'; // ตรวจสอบว่า path ถูกต้อง
import { environment } from '../environments/environment'; // import environment

// สำหรับ Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
// import { getStorage, provideStorage } from '@angular/fire/storage'; // ถ้าคุณใช้ Cloud Storage
// import { getDatabase, provideDatabase } from '@angular/fire/database'; // ถ้าคุณใช้ Realtime Database

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), // สำหรับจัดการ Routing
    provideHttpClient(), // สำหรับ HttpClient ใน AuthService

    // --- ตั้งค่า Firebase ---
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
  ]
};