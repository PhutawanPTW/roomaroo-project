import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  userType: 'member' | 'owner' = 'member'; // Default to member, can be overridden by query params
  currentSlide = 0;
  isLoading = false;
  isLoginLoading = false;
  isGoogleLoading = false;
  errorMessageGoogle: string | null = null;
  googleErrorTimeout: any = null;

  sliderImages = [
    { src: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Modern Dormitory Building' },
    { src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Dormitory Room Interior' },
    { src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Student Common Area' },
    { src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Campus Dormitory View' },
  ];
  private slideInterval: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.startSlideshow();
    this.route.queryParams.subscribe(params => {
      this.userType = params['type'] === 'owner' ? 'owner' : 'member';
    });
  }

  ngOnDestroy() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
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

  async onSubmit(): Promise<void> {
    if (this.isLoginLoading) return;
    this.isLoginLoading = true;
    this.errorMessage = null;
    try {
      const { email, password } = this.loginForm.value;
      await this.authService.signInWithEmail(email, password);
      console.log('Login successful');
    } catch (error: any) {
      this.errorMessage = this.authService.errorMessageHandler(error);
      console.error('Login error:', error);
    } finally {
      this.isLoginLoading = false;
    }
  }

  async connectWithGoogle(): Promise<void> {
    if (this.isGoogleLoading) return;
    this.isGoogleLoading = true;
    this.errorMessageGoogle = null;
    try {
      // เรียกใช้ signInWithGoogle จาก AuthService ซึ่งจะจัดการเรื่อง redirect เอง
      await this.authService.signInWithGoogle(this.userType);
      console.log('Google Sign-In successful (handled by AuthService)');
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user') {
        this.errorMessageGoogle = 'ยกเลิกการลงชื่อเข้าใช้ด้วย Google';
        if (this.googleErrorTimeout) clearTimeout(this.googleErrorTimeout);
        this.googleErrorTimeout = setTimeout(() => {
          this.errorMessageGoogle = null;
        }, 3000);
      } else {
        this.errorMessageGoogle = this.authService.errorMessageHandler(error);
        if (this.googleErrorTimeout) clearTimeout(this.googleErrorTimeout);
        this.googleErrorTimeout = setTimeout(() => {
          this.errorMessageGoogle = null;
        }, 3000);
      }
    } finally {
      this.isGoogleLoading = false;
    }
  }

  onRegister(): void {
    this.router.navigate(['/register'], { queryParams: { type: this.userType } });
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
    this.slideInterval = setInterval(() => this.nextSlide(), 5000);
  }
}