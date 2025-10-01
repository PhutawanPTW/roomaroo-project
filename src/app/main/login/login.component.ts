import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, UserProfile as BaseUserProfile } from '../../services/auth.service';
import { GoogleAuthService } from '../../services/google-auth.service';
import { Subscription } from 'rxjs';

interface UserProfile extends BaseUserProfile {
  provider?: 'google' | 'password';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  userType: 'member' | 'owner' = 'member';
  currentSlide = 0;
  isLoading = false;
  isLoginLoading = false;
  isGoogleLoading = false;
  errorMessageGoogle: string | null = null;
  googleTimeout: any = null;
  private slideInterval: any;
  private authSub: Subscription | undefined;

  // Forgot Password Modal
  showForgotPassword = false;
  forgotPasswordEmail = '';
  forgotPasswordError: string | null = null;
  forgotPasswordSuccess: string | null = null;
  isForgotPasswordLoading = false;

  sliderImages = [
    { src: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Modern Dormitory Building' },
    { src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Dormitory Room Interior' },
    { src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Student Common Area' },
    { src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Campus Dormitory View' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private googleAuthService: GoogleAuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.startSlideshow();

    // Read user type from path parameter
    this.route.paramMap.subscribe(paramMap => {
      const typeParam = paramMap.get('type');
      this.userType = typeParam === 'owner' ? 'owner' : 'member';
    });

    // Check for error query params (kept for compatibility)
    this.route.queryParams.subscribe(params => {
      if (params['error'] === 'not-owner') {
        this.errorMessage = 'บัญชีนี้ไม่ใช่เจ้าของหอพัก ไม่สามารถเข้าสู่ระบบในหน้านี้ได้';
      }
    });
  }

  ngOnDestroy() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
    if (this.googleTimeout) {
      clearTimeout(this.googleTimeout);
    }
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }

  private redirectBasedOnUserType(user: UserProfile): void {
    console.log('[LoginComponent] Redirecting user based on memberType:', user.memberType);
    
    if (user.memberType === 'owner') {
      this.router.navigate(['/owner']);
    } else if (user.memberType === 'member') {
      this.router.navigate(['/main']);
    } else {
      // Fallback
      this.router.navigate(['/main']);
    }
  }

  getUserTypeDisplayText(): string {
    return this.userType === 'owner' ? 'เจ้าของหอพัก' : 'สมาชิก';
  }

  getRegisterText(): string {
    return 'สมัครสมาชิก เลย!';
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.loginForm.get(controlName);
    return control ? control.hasError(errorName) && (control.dirty || control.touched) : false;
  }

  getErrorMessage(controlName: string): string {
    const control = this.loginForm.get(controlName);
    if (!control) return '';

    if (control.hasError('required')) {
      return 'กรุณากรอกข้อมูล';
    }
    if (controlName === 'email' && control.hasError('email')) {
      return 'กรุณากรอกอีเมลให้ถูกต้อง';
    }
    return '';
  }

  async connectWithGoogle(): Promise<void> {
    this.isGoogleLoading = true;
    this.errorMessage = null;
    try {
        console.log(`[LoginComponent] Starting Google OAuth for userType: ${this.userType}`);

        if (this.userType !== 'member' && this.userType !== 'owner') {
            this.errorMessage = 'ประเภทผู้ใช้ไม่ถูกต้อง';
            this.isGoogleLoading = false;
            return;
        }

        const userProfile = await this.googleAuthService.signInWithGoogle(this.userType);
        console.log('[LoginComponent] Google sign-in successful:', userProfile);
        
        // รอให้ auth state update เสร็จก่อน redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Navigation ถูก handle โดย authService แล้ว
        // ไม่ต้อง redirect ที่นี่

    } catch (error: any) {
        console.error('[LoginComponent] Google OAuth error:', error);
        this.errorMessage = this.authService.errorMessageHandler(error);
    } finally {
        this.isGoogleLoading = false;
    }
}

  async onSubmit(): Promise<void> {
    this.isLoginLoading = true;
    this.errorMessage = null;
    try {
      const formValue = this.loginForm.getRawValue();
      const userProfile = await this.authService.signInWithEmail(formValue.email, formValue.password, this.userType);

      // ตรวจสอบ provider (ห้ามใช้ email ถ้า provider = google)
      if (userProfile && userProfile.provider === 'google') {
        this.errorMessage = 'บัญชีนี้สมัครผ่าน Google กรุณาใช้ Connect with Google';
        await this.authService.signOut(null);
        return;
      }

      // ถ้าทุกอย่างผ่าน ให้ redirect โดยใช้ memberType จาก backend
      if (userProfile) {
        // รอให้ auth state update เสร็จ
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('[LoginComponent] Login successful, redirecting based on actual memberType:', userProfile.memberType);
        this.redirectBasedOnUserType(userProfile);
      }

    } catch (error: any) {
      console.error('[LoginComponent] Email login error:', error);
      // ปิดบังรายละเอียดสาเหตุความผิดพลาดทั้งหมดด้วยข้อความทั่วไป เพื่อกันเดางาน
      this.errorMessage = this.getGenericLoginError(error);
    } finally {
      this.isLoginLoading = false;
    } 
  }

  private getGenericLoginError(error: any): string {
    const generic = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    const code: string | undefined = error?.code;
    const message: string = (error?.message || '').toString().toLowerCase();

    // รายการโค้ด/ข้อความผิดพลาดที่ควรถูก mask เป็นข้อความเดียวกัน
    const codesToMask = new Set([
      'auth/wrong-password',
      'auth/user-not-found',
      'auth/invalid-credential',
      'auth/invalid-email',
      'auth/too-many-requests',
    ]);

    if (code && codesToMask.has(code)) return generic;

    // กรณีข้อความมาจาก backend ภาษาไทย/อังกฤษ เช่น บัญชีนี้ถูกลงทะเบียนเป็นสมาชิกแล้ว, role mismatch ฯลฯ
    if (
      message.includes('บัญชีนี้ถูกลงทะเบียนเป็นสมาชิกแล้ว') ||
      message.includes('ไม่ใช่เจ้าของหอพัก') ||
      message.includes('ไม่ใช่สมาชิก') ||
      message.includes('role') ||
      message.includes('not owner') ||
      message.includes('not member')
    ) {
      return generic;
    }

    // ดีฟอลต์ให้เป็นข้อความทั่วไปเสมอ เพื่อความปลอดภัย
    return generic;
  }

  onRegister(): void {
    console.log('[LoginComponent] Navigating to register page for userType:', this.userType);
    // ตรวจสอบว่าอยู่ในหน้า login/owner หรือ login/member
    const currentPath = this.router.url;
    let type: 'member' | 'owner' | null = null;
    if (currentPath.includes('/login/owner')) type = 'owner';
    else if (currentPath.includes('/login/member')) type = 'member';
    else if (this.userType === 'owner' || this.userType === 'member') type = this.userType;

    if (!type) return;
    this.router.navigate(['/register', type], { queryParams: { userType: type } });
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.sliderImages.length;
  }

  prevSlide(): void {
    this.currentSlide = this.currentSlide === 0 ? this.sliderImages.length - 1 : this.currentSlide - 1;
  }

  private startSlideshow(): void {
    const intervalId = window.setInterval(() => this.nextSlide(), 5000);
    this.slideInterval = intervalId;
  }

  // ===== FORGOT PASSWORD METHODS =====
  showForgotPasswordModal(): void {
    this.showForgotPassword = true;
    this.forgotPasswordEmail = '';
    this.forgotPasswordError = null;
    this.forgotPasswordSuccess = null;
  }

  closeForgotPasswordModal(): void {
    this.showForgotPassword = false;
    this.forgotPasswordEmail = '';
    this.forgotPasswordError = null;
    this.forgotPasswordSuccess = null;
    this.isForgotPasswordLoading = false;
  }

  sendForgotPasswordEmail(): void {
    if (!this.forgotPasswordEmail) {
      this.forgotPasswordError = 'กรุณากรอกอีเมล';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.forgotPasswordEmail)) {
      this.forgotPasswordError = 'รูปแบบอีเมลไม่ถูกต้อง';
      return;
    }

    this.isForgotPasswordLoading = true;
    this.forgotPasswordError = null;
    this.forgotPasswordSuccess = null;

    // Simulate API call (replace with actual implementation)
    setTimeout(() => {
      this.isForgotPasswordLoading = false;
      this.forgotPasswordSuccess = 'ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบอีเมล';
      
      // Auto close modal after 3 seconds
      setTimeout(() => {
        this.closeForgotPasswordModal();
      }, 3000);
    }, 2000);
  }
}