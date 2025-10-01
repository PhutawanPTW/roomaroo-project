import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { signInWithEmailAndPassword } from '@angular/fire/auth';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
  form: FormGroup;
  isSubmitting = false;
  showPassword = false;
  errorMessage: string | null = null;
  showModal = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService,
    private adminService: AdminService,
    private firebaseAuth: Auth
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [true]
    });
  }

  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }
  
    this.isSubmitting = true;
    this.errorMessage = null;
  
    try {
      const { email, password } = this.form.value;
      
      // ใช้ Firebase Auth โดยตรง (ไม่ผ่าน AuthService เพื่อไม่ให้เรียก /api/auth/me)
      const userCredential = await signInWithEmailAndPassword(this.firebaseAuth, email, password);
      const user = userCredential.user;
      
      // ดึง Firebase ID Token โดยตรง
      const firebaseToken = await user.getIdToken();
      
      console.log('Firebase token obtained:', firebaseToken.substring(0, 50) + '...');
      
      // เรียก API admin login เพื่อยืนยันสิทธิ์แอดมิน
      const adminProfile = await this.adminService.adminLogin(firebaseToken).toPromise();
      
      console.log('Admin profile received:', adminProfile);
      
      // บันทึกข้อมูลแอดมินและ Firebase token ใน localStorage
      localStorage.setItem('adminProfile', JSON.stringify(adminProfile));
      localStorage.setItem('firebaseToken', firebaseToken);
      
      await this.router.navigate(['/admin']);
    } catch (error: any) {
      console.error('Admin login error:', error);
      
      // จัดการ error จาก API
      if (error.error && error.error.message) {
        this.errorMessage = error.error.message;
      } else {
        this.errorMessage = this.auth.errorMessageHandler(error);
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  showContactModal(): void {
    this.showModal = true;
  }

  closeContactModal(): void {
    this.showModal = false;
  }
}


