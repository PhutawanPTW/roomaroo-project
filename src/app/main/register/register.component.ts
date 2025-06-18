import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [ReactiveFormsModule, NgIf, NgFor, CommonModule],
})
export class RegisterComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  registerForm: FormGroup;
  errorMessage: string | null = null;
  userType: 'member' | 'owner' | 'general' = 'general'; // Default เป็น 'general' เพราะต้องเลือกหรือได้รับมาจาก Google
  currentSlide = 0;
  isLoading = false;
  private slideInterval: any;
  photoURL: string | null = null;
  isFromGoogle: boolean = false;
  isRegisterLoading = false;
  isGoogleLoading = false;
  errorMessageGoogle: string | null = null;
  googleErrorTimeout: any = null;
  receivedUsername: string | null = null;

  sliderImages = [
    { src: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Modern Dormitory Building' },
    { src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Dormitory Room Interior' },
    { src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Student Common Area' },
    { src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Campus Dormitory View' },
  ];

  dormList = [ // ควรดึงจาก Backend จริงๆ
    { id: 'dorm1', name: 'หอพักวีรวิชญ์' },
    { id: 'dorm2', name: 'หอพักเรือนร่มเย็น' },
    { id: 'dorm3', name: 'หอพักวีรวิชญ์ชาย' },
    { id: 'dorm4', name: 'หอพักหญิงเรือนร่มเย็น' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      fullName: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      businessName: [''],
      businessAddress: [''],
      businessRegistration: [''],
      dormitory: [''],
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit() {
    this.startSlideshow();

    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.userType = params['type'] === 'owner' ? 'owner' : (params['type'] === 'member' ? 'member' : 'general');
      }
      this.updateFormValidation();
    });

    const nav = this.router.getCurrentNavigation();
    // State จะถูกส่งมาเมื่อมีการ redirect จาก AuthService (หลัง Google Sign-in)
    const state = nav?.extras.state as { fullName?: string, email?: string, photoURL?: string, userType?: 'member' | 'owner' | 'general', isFromGoogle?: boolean };
    if (state) {
      if (state.userType) {
        this.userType = state.userType;
      }
      if (state.fullName) {
        this.registerForm.get('fullName')?.setValue(state.fullName);
      }
      if (state.email) {
        this.registerForm.get('email')?.setValue(state.email);
        this.registerForm.get('email')?.disable(); // อีเมลจาก Google ไม่ควรแก้ไขได้
      }
      if (state.photoURL) {
        this.photoURL = state.photoURL;
      }
      if (state.isFromGoogle) {
        this.isFromGoogle = true;
        // รหัสผ่านไม่ต้องกรอกถ้ามาจาก Google
        this.registerForm.get('password')?.disable();
        this.registerForm.get('confirmPassword')?.disable();
      }
      this.updateFormValidation();
    }

    // ตรวจสอบ currentUser จาก AuthService ถ้า profile สมบูรณ์แล้ว ให้ redirect ออกจากหน้านี้
    this.authService.currentUser$.subscribe(userProfile => {
      if (userProfile && !userProfile.needsProfileSetup) {
        const expectedDashboard = userProfile.memberType === 'owner' ? '/owner' : '/main/member/dashboard';
        // redirect ถ้าไม่ได้อยู่ที่หน้าปลายทาง และไม่ได้อยู่ที่หน้า login/register อยู่แล้ว
        if (!this.router.url.startsWith(expectedDashboard) && !this.router.url.startsWith('/login') && !this.router.url.startsWith('/register')) {
          this.router.navigate([expectedDashboard]);
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  private updateFormValidation() {
    // businessFields ไม่ต้อง required ไม่ว่าจะเป็น owner หรือ member
    const businessFields = ['businessName', 'businessAddress', 'businessRegistration'];
    businessFields.forEach(field => {
      const control = this.registerForm.get(field);
      if (control) {
          control.clearValidators();
        control.updateValueAndValidity();
      }
    });

    const dormControl = this.registerForm.get('dormitory');
    if (dormControl) {
      if (this.userType === 'member') {
        dormControl.setValidators([Validators.required]);
      } else {
        dormControl.clearValidators();
      }
      dormControl.updateValueAndValidity();
    }

    if (this.isFromGoogle) {
      this.registerForm.get('password')?.clearValidators();
      this.registerForm.get('confirmPassword')?.clearValidators();
      this.registerForm.get('password')?.updateValueAndValidity();
      this.registerForm.get('confirmPassword')?.updateValueAndValidity();
    } else {
      this.registerForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.registerForm.get('confirmPassword')?.setValidators([Validators.required]);
      this.registerForm.get('password')?.updateValueAndValidity();
      this.registerForm.get('confirmPassword')?.updateValueAndValidity();
    }
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && !password.disabled && !confirmPassword.disabled) {
      if (password.value !== confirmPassword.value) {
        confirmPassword.setErrors({ passwordMismatch: true });
      } else {
        confirmPassword.setErrors(null);
      }
    } else if (confirmPassword && confirmPassword.enabled) {
      confirmPassword.setErrors(null);
    }
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.registerForm.get(controlName);
    return control ? control.hasError(errorName) && (control.dirty || control.touched) : false;
  }

  getErrorMessage(controlName: string): string {
    const control = this.registerForm.get(controlName);
    if (!control) return '';

    if (control.hasError('required')) {
      return 'กรุณากรอกข้อมูล';
    }
    if (controlName === 'email' && control.hasError('email')) {
      return 'กรุณากรอกอีเมลให้ถูกต้อง';
    }
    if (controlName === 'password' && control.hasError('minlength')) {
      return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    }
    if (controlName === 'confirmPassword' && control.hasError('passwordMismatch')) {
      return 'รหัสผ่านไม่ตรงกัน';
    }
    if (controlName === 'phoneNumber' && control.hasError('pattern')) {
      return 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก)';
    }
    return '';
  }

  async onSubmit(): Promise<void> {
    if (this.isRegisterLoading) return;
    this.isRegisterLoading = true;
    this.errorMessage = null;

    // Validate if userType is 'general'
    if (this.userType === 'general') {
      this.errorMessage = 'กรุณาเลือกประเภทสมาชิก (เจ้าของหอพัก หรือ สมาชิก)';
      this.isRegisterLoading = false;
      return;
    }

    // If not from Google, enable password fields for validation before submission
    if (!this.isFromGoogle) {
      this.registerForm.get('password')?.enable();
      this.registerForm.get('confirmPassword')?.enable();
    }
    // Always enable email in case it was disabled (e.g., from Google flow)
    this.registerForm.get('email')?.enable();
    this.registerForm.updateValueAndValidity(); // Update validity after enabling/disabling controls

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.isRegisterLoading = false;
      this.errorMessage = 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง';
      // Disable email/password fields again if they were disabled for Google flow
      if (this.isFromGoogle) {
        this.registerForm.get('email')?.disable();
        this.registerForm.get('password')?.disable();
        this.registerForm.get('confirmPassword')?.disable();
      }
      return;
    }

    try {
      const formData = this.registerForm.getRawValue(); // Use getRawValue to get values from disabled controls too

        if (this.isFromGoogle) {
        // สำหรับผู้ใช้ Google ที่ต้องกรอกข้อมูลเพิ่ม
        const userProfile = await this.authService.completeUserProfile(
            formData.phoneNumber,
          this.userType as 'member' | 'owner',
            this.userType === 'member' ? formData.dormitory : undefined,
            this.userType === 'owner' ? formData.businessName : undefined,
            this.userType === 'owner' ? formData.businessAddress : undefined,
            this.userType === 'owner' ? formData.businessRegistration : undefined
          );
        // เก็บ username ที่ได้รับจาก backend
        this.receivedUsername = userProfile?.username || null;
        console.log('[RegisterComponent] Received username from backend:', this.receivedUsername);
        // authService.completeUserProfile จะจัดการ redirect เอง
        } else {
        // สำหรับการสมัครสมาชิกแบบปกติ (อีเมล/รหัสผ่าน)
        await this.authService.signUpWithEmail(
            formData.email,
            formData.password,
          this.userType as 'member' | 'owner',
            formData.fullName,
            formData.phoneNumber,
          this.userType === 'member' ? formData.dormitory : undefined,
          this.userType === 'owner' ? formData.businessName : undefined,
          this.userType === 'owner' ? formData.businessAddress : undefined,
          this.userType === 'owner' ? formData.businessRegistration : undefined
          );
        // signUpWithEmail ไม่ return UserProfile เพราะจะไปหน้า login แทน
        // authService.signUpWithEmail จะจัดการ redirect ไปหน้า Login เอง
        }
      } catch (error: any) {
        this.errorMessage = this.authService.errorMessageHandler(error);
      console.error('Registration/Complete Profile error:', error);
      } finally {
      this.isRegisterLoading = false;
      // Re-disable email/password fields if they were disabled for Google flow
        if (this.isFromGoogle) {
          this.registerForm.get('email')?.disable();
          this.registerForm.get('password')?.disable();
          this.registerForm.get('confirmPassword')?.disable();
      }
    }
  }

  onLogin(): void {
    this.router.navigate(['/login'], { queryParams: { type: this.userType } });
  }

  async connectWithGoogle(): Promise<void> {
    if (this.isGoogleLoading) return;
    this.isGoogleLoading = true;
    this.errorMessageGoogle = null;
    try {
      // เรียกใช้ signInWithGoogle จาก AuthService ซึ่งจะจัดการเรื่อง redirect เอง
      await this.authService.signInWithGoogle(this.userType === 'owner' ? 'owner' : 'member'); // ส่ง userType ที่เลือกไป
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      alert('File selected: ' + file.name + ' (ยังไม่ได้อัปโหลดจริง)');
      const reader = new FileReader();
      reader.onload = () => {
        this.photoURL = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onEditAvatar(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
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

  getPageTitle(): string {
    return this.userType === 'owner' ? 'สมัครสมาชิกสำหรับเจ้าของหอพัก' : 'สมัครสมาชิกสำหรับสมาชิก';
  }

  getPageDescription(): string {
    return this.userType === 'owner'
      ? 'สร้างบัญชีเพื่อเริ่มต้นจัดการหอพักของคุณ'
      : 'สร้างบัญชีเพื่อเริ่มต้นค้นหาหอพักที่คุณต้องการ';
  }
}