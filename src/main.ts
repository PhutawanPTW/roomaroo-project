// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component'; // หรือ MainComponent ถ้าเป็นชื่อนั้นจริงๆ
import { appConfig } from './app/app.config'; // <--- IMPORT appConfig เข้ามา

bootstrapApplication(AppComponent, appConfig) // <--- ใช้ appConfig ตรงนี้
  .catch(err => console.error(err));