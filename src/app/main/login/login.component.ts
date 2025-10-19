import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, UserProfile as BaseUserProfile } from '../../services/auth.service';
import { DormitoryService, Dorm } from '../../services/dormitory.service';
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
  isSliderLoading = true;

  // Forgot Password Modal
  showForgotPassword = false;
  forgotPasswordEmail = '';
  forgotPasswordError: string | null = null;
  forgotPasswordSuccess: string | null = null;
  isForgotPasswordLoading = false;


  sliderImages: Array<{ id?: number; src: string; alt: string; title?: string; subtitle?: string } > = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private googleAuthService: GoogleAuthService,
    private dormSvc: DormitoryService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadSliderImagesFromDorms();

    // Read user type from path parameter
    this.route.paramMap.subscribe(paramMap => {
      const typeParam = paramMap.get('type');
      this.userType = typeParam === 'owner' ? 'owner' : 'member';
    });

    // Check for query params
    this.route.queryParams.subscribe(params => {
      if (params['error'] === 'not-owner') {
        this.errorMessage = 'บัญชีนี้ไม่ใช่เจ้าของหอพัก ไม่สามารถเข้าสู่ระบบในหน้านี้ได้';
      }
      
      // Pre-fill email if provided (from password reset)
      if (params['email']) {
        this.loginForm.patchValue({ email: params['email'] });
      }
      
      // Show success message if password reset was successful
      if (params['resetSuccess'] === 'true') {
        // Don't show as error, just clear any existing error
        this.errorMessage = null;
      }
      
      // Show message if provided
      if (params['message']) {
        this.errorMessage = params['message'];
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
    // Minimal: navigation handled without verbose logs

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
      // Minimal: no verbose console logs for OAuth start

      if (this.userType !== 'member' && this.userType !== 'owner') {
        this.errorMessage = 'ประเภทผู้ใช้ไม่ถูกต้อง';
        this.isGoogleLoading = false;
        return;
      }

      const userProfile = await this.googleAuthService.signInWithGoogle(this.userType);

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

        // Minimal: log removed per request
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

  private async loadSliderImagesFromDorms(): Promise<void> {
    try {
      this.isSliderLoading = true;
      const [recommended, latest] = await Promise.all([
        this.dormSvc.getRecommended().toPromise(),
        this.dormSvc.getLatest().toPromise(),
      ]);

      let pool: Dorm[] = [];
      if (Array.isArray(recommended)) pool = pool.concat(recommended);
      if (Array.isArray(latest)) pool = pool.concat(latest);

      if (pool.length === 0) {
        const all = await this.dormSvc.getAllDormitories({ limit: 50 }).toPromise();
        if (Array.isArray(all)) pool = all;
      }

      const slides = pool
        .map(d => {
          const src = d.main_image_url || d.thumbnail_url || '';
          if (!src) return null;
          const title = d.dorm_name || 'หอพัก';
          const zoneText = d.zone_name ? `โซน${d.zone_name}` : '';
          return { id: d.dorm_id!, src, alt: title, title, subtitle: zoneText };
        })
        .filter((x): x is { id: number; src: string; alt: string; title: string; subtitle: string } => !!x && x.id !== undefined && x.title !== undefined && x.subtitle !== undefined);

      if (slides.length === 0) {
        this.sliderImages = [{ src: 'assets/images/photo.png', alt: 'Dormitory' }];
      } else {
        const uniqueMap = new Map<string, { id?: number; src: string; alt: string; title?: string; subtitle?: string }>();
        for (const s of slides) {
          if (!uniqueMap.has(s.src)) uniqueMap.set(s.src, s);
        }
        const unique = Array.from(uniqueMap.values());
        for (let i = unique.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [unique[i], unique[j]] = [unique[j], unique[i]];
        }
        this.sliderImages = unique.slice(0, Math.min(6, unique.length));
      }

      this.isSliderLoading = false;
      this.startSlideshow();
    } catch (err) {
      console.error('[LoginComponent] Failed to load slider images from dorms:', err);
      this.sliderImages = [{ src: 'assets/images/photo.png', alt: 'Dormitory' }];
      this.isSliderLoading = false;
      this.startSlideshow();
    }
  }

  onClickSlide(i: number): void {
    const s = this.sliderImages[i];
    if (s?.id != null) {
      this.router.navigate(['/dorm-detail', s.id]);
    }
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

  async sendForgotPasswordEmail(): Promise<void> {
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

    try {
      // 1) เรียก backend ตรวจสอบสิทธิ์ก่อน
      const precheck = await this.authService.precheckForgotPassword(this.forgotPasswordEmail);

      if (precheck && precheck.code === 'reset-allowed' && precheck.allowed) {
        // 2) อนุญาตให้ส่งอีเมลผ่าน Firebase
        await this.authService.sendForgotPasswordEmail(this.forgotPasswordEmail, this.userType);

        // แสดงข้อความสำเร็จ
        this.forgotPasswordSuccess = 'ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบอีเมล';

        // ปิด modal หลังจาก 3 วินาที
        setTimeout(() => {
          this.closeForgotPasswordModal();
        }, 3000);
        return;
      }

      if (precheck && precheck.code === 'google-only') {
        this.forgotPasswordError = 'บัญชีนี้เข้าสู่ระบบด้วย Google เท่านั้น';
        return;
      }

      // เงื่อนไขอื่นให้โยนไป catch เพื่อ map ข้อความจาก status code
      throw new Error('invalid_precheck_state');

    } catch (error: any) {
      console.error('[LoginComponent] Forgot password error:', error);
      // แปลตามสเปคของ backend
      if (error?.status === 400 && error?.error?.code === 'invalid-email-format') {
        this.forgotPasswordError = 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
      } else if (error?.status === 404 && error?.error?.code === 'email-not-found') {
        this.forgotPasswordError = 'ไม่พบอีเมลนี้ในระบบ';
      } else if (error?.ok === false && error?.message) {
        this.forgotPasswordError = error.message;
      } else {
        this.forgotPasswordError = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      }
    } finally {
      this.isForgotPasswordLoading = false;
    }
  }


}