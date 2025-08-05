import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormControl, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { AuthService, UserProfile, DormitoryOption, ZoneOption } from '../../services/auth.service';
import { Location } from '@angular/common';
import { Auth } from '@angular/fire/auth';

// Add interface for grouped dormitories
interface ZoneDormitories {
  id: string;
  name: string;
  dormitories: { id: string, name: string }[];
}

// Custom validators
function emailFormatValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  
  const value = control.value.toString().trim();
  
  // Check if it's a valid email format
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) {
    return { email: true };
  }
  
  return null;
}

function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  
  const value = control.value.toString().trim();
  
  // Remove all non-digit characters (including hyphens, spaces, etc.) and check if it's exactly 10 digits
  const digitsOnly = value.replace(/\D/g, '');
  
  // Check if it's exactly 10 digits
  if (digitsOnly.length !== 10) {
    return { pattern: true };
  }
  
  return null;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [ReactiveFormsModule, FormsModule, NgIf, NgFor, CommonModule],
  standalone: true
})

export class RegisterComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('popupFileInput') popupFileInput!: ElementRef<HTMLInputElement>;
  registerForm: FormGroup;
  errorMessage: string | null = null;
  userType: 'member' | 'owner' | 'general' = 'general';
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
  isLoadingDorms = false;

  // Add zone and dorm list properties
  zoneList: { id: string, name: string }[] = [{ id: '', name: 'ทุกโซน' }];
  selectedZoneId: string = '';
  dormList: { id: string, name: string }[] = [{ id: '', name: 'กรุณาเลือกหอพัก' }];

  // Add groupedDorms property
  groupedDorms: ZoneDormitories[] = [];

  // Add properties for searchable dropdown
  dormSearchControl = new FormControl('');
  showDormList = false;
  filteredDorms: ZoneDormitories[] = [];
  selectedDormName: string = '';

  // Add sliderImages property
  sliderImages = [
    { src: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Modern Dormitory Building' },
    { src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Dormitory Room Interior' },
    { src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Student Common Area' },
    { src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Campus Dormitory View' },
  ];

  // เพิ่ม flag เพื่อป้องกันการแสดงผลก่อนที่จะได้ userType ที่ถูกต้อง
  isInitializing = true;

  // Add isNavigating property
  isNavigating = false;

  // *** เพิ่ม flag เพื่อป้องกันการเปลี่ยน userType ระหว่าง submit ***
  private isSubmitting = false;

  // Properties สำหรับป๊อปอัพเพิ่มรูปภาพ
  showImagePopup = false;
  selectedFile: File | null = null;
  previewImage: string | null = null;
  isImageLoading = false;
  imageError = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private location: Location,
    private auth: Auth
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, emailFormatValidator]],
      password: [''],
      confirmPassword: [''],
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      phoneNumber: ['', [
        Validators.required,
        phoneNumberValidator
      ]],
      managerName: ['', [Validators.minLength(2), Validators.maxLength(100)]],
      secondaryPhone: ['', [
        phoneNumberValidator
      ]],
      lineId: [''],
      dormitory: [''],
    }, {
      validators: this.passwordMatchValidator
    });

    // เริ่มต้น isFromGoogle เป็น false ค่าเริ่มต้น
    this.isFromGoogle = false;

    // อ่าน userType จาก route param (member/owner)
    this.route.paramMap.subscribe(paramMap => {
      if (this.isSubmitting) {
        return;
      }

      const typeParam = paramMap.get('type');
      if (typeParam === 'owner' || typeParam === 'member') {
        this.userType = typeParam;
      }

      // อ่าน fromGoogle จาก query param
      const fromGoogle = this.route.snapshot.queryParamMap.get('fromGoogle');
      this.isFromGoogle = fromGoogle === 'true';
    });

    // สมัครสมาชิก queryParamMap เพื่อจัดการการเปลี่ยนแปลง fromGoogle
    this.route.queryParamMap.subscribe(queryParams => {
      const fromGoogleParam = queryParams.get('fromGoogle');
      const newIsFromGoogle = fromGoogleParam === 'true';
      if (newIsFromGoogle !== this.isFromGoogle) {
        this.isFromGoogle = newIsFromGoogle;
        this.updateFormValidation();
      }
    });
  }

  ngOnInit() {
    this.startSlideshow();
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // ดึงข้อมูลหอพักจาก API
    this.loadDormitories();

    // เริ่มต้น filteredDorms
    this.filteredDorms = [...this.groupedDorms];

    // ตรวจสอบและป้องกันการเข้าถึงหน้า registration โดยตรง
    this.validateRegistrationAccess();

    // เพิ่ม history state เพื่อจัดการการย้อนกลับ
    this.setupHistoryState();

    // เพิ่มการจัดการ history state ที่แข็งแกร่งขึ้น
    setTimeout(() => {
      if (this.router.url.includes('/register')) {
        window.history.pushState({ page: 'home' }, '', '/main');
        window.history.replaceState({ page: 'register' }, '', this.router.url);
      }
    }, 500);

    // ตรวจสอบ query params และจัดการ Google flow
    this.route.queryParamMap.subscribe(params => {
      const fromGoogle = params.get('fromGoogle') === 'true';
      const additionalInfo = params.get('additionalInfo') === 'true';

      console.log('[RegisterComponent] Query params:', { fromGoogle, additionalInfo });

      if (additionalInfo && !fromGoogle) {
        console.log('[RegisterComponent] Additional info required, staying on register page');
        return;
      }

      if (fromGoogle) {
        console.log('[RegisterComponent] Setting up Google flow');
        this.isFromGoogle = true;
        this.registerForm.get('password')?.clearValidators();
        this.registerForm.get('confirmPassword')?.clearValidators();
        this.registerForm.get('password')?.disable();
        this.registerForm.get('confirmPassword')?.disable();
        this.registerForm.updateValueAndValidity();

        this.router.navigate([], {
          queryParams: { fromGoogle: 'true' },
          replaceUrl: true
        });
      } else {
        console.log('[RegisterComponent] Setting up normal registration flow');
        this.isFromGoogle = false;
        this.updateFormValidation();
      }
    });

    const historyState = history.state as {
      fullName?: string;
      email?: string;
      photoURL?: string;
      userType?: 'member' | 'owner' | 'general';
      isFromGoogle?: boolean;
    };

    if (historyState && historyState.isFromGoogle) {
      this.populateGoogleData(historyState);
    }

    this.authService.currentUser$.subscribe(userProfile => {
      if (this.isSubmitting) {
        return;
      }

      if (userProfile && !userProfile.needsProfileSetup) {
        console.log('[RegisterComponent] User has complete profile, redirecting to dashboard');
        const targetRoute = userProfile.memberType === 'owner' ? '/owner' : '/main';
        this.router.navigate([targetRoute]);
        return;
      }

      if (userProfile?.provider === 'google' && this.isFromGoogle) {
        if (userProfile.displayName) {
          this.registerForm.patchValue({ fullName: userProfile.displayName });
          this.registerForm.get('fullName')?.disable();
        }
        if (userProfile.email) {
          this.registerForm.patchValue({ email: userProfile.email });
          this.registerForm.get('email')?.disable();
        }
        if (userProfile.photoURL) {
          this.photoURL = userProfile.photoURL;
        }
        this.registerForm.get('password')?.clearValidators();
        this.registerForm.get('confirmPassword')?.clearValidators();
        this.registerForm.get('password')?.disable();
        this.registerForm.get('confirmPassword')?.disable();
        this.registerForm.updateValueAndValidity();
      }

      // ไม่ redirect เมื่อผู้ใช้ไม่ได้ล็อกอิน
      if (userProfile && !userProfile.needsProfileSetup && !this.isFromGoogle) {
        const expectedDashboard = userProfile.memberType === 'owner' ? '/owner' : '/main';
        if (!this.router.url.startsWith(expectedDashboard) &&
          !this.router.url.startsWith('/login') &&
          !this.router.url.startsWith('/register')) {
          this.router.navigate([expectedDashboard]);
        }
      }
    });

    this.loadZones();

    // ตรวจสอบให้แน่ใจว่าการตรวจสอบฟอร์มถูกอัปเดตหลังจากการเริ่มต้น
    // รอให้ userType และ isFromGoogle ถูกตั้งค่าแล้ว
    setTimeout(() => {
      this.updateFormValidation();
      this.isInitializing = false;
    }, 100);
  }

  // เพิ่ม method สำหรับตรวจสอบการเข้าถึงหน้า registration
  private validateRegistrationAccess(): void {
    // ตรวจสอบว่า URL มีรูปแบบที่ถูกต้อง
    const currentUrl = this.router.url;
    const validRegistrationPatterns = [
      /^\/register\/owner(\?.*)?$/,
      /^\/register\/member(\?.*)?$/
    ];

    const isValidUrl = validRegistrationPatterns.some(pattern => pattern.test(currentUrl));
    if (!isValidUrl) {
      console.log('[RegisterComponent] Invalid registration URL, redirecting to main');
      this.router.navigate(['/main'], { replaceUrl: true });
      return;
    }

    // ตรวจสอบว่าผู้ใช้เข้าถึงหน้า registration ผ่านทางที่ถูกต้องหรือไม่
    const referrer = document.referrer;

    // ถ้าเข้าถึงโดยตรง (ไม่มี referrer) และไม่ได้มาจาก Google flow
    // ให้อนุญาตให้เข้าถึงได้ แต่ไม่ redirect
    if (!referrer && !currentUrl.includes('fromGoogle=true')) {
      console.log('[RegisterComponent] Direct access to registration page - allowing access');
      // ไม่ redirect แล้ว ให้ผู้ใช้สามารถเข้าถึงได้
      return;
    }

    console.log('[RegisterComponent] Registration access validated');
  }

  // เพิ่ม method สำหรับโหลดข้อมูลหอพักจาก API
  private async loadDormitories(zoneId?: number): Promise<void> {
    if (this.isLoadingDorms) return;

    this.isLoadingDorms = true;
    try {
      const dormitories = await this.authService.getDormitoryOptions(zoneId);
      // เพิ่มตัวเลือกแรก "กรุณาเลือกหอพัก"
      this.dormList = [
        { id: '', name: 'กรุณาเลือกหอพัก' },
        ...dormitories.map(dorm => ({
          id: dorm.dorm_id.toString(), // แปลงเป็น string เพื่อใช้กับ form
          name: dorm.dorm_name
        }))
      ];

      // Group dormitories by zone
      this.updateGroupedDorms(dormitories);

      // Initialize filteredDorms with all loaded dormitories
      this.filteredDorms = [...this.groupedDorms];
    } catch (error) {
    } finally {
      this.isLoadingDorms = false;
    }
  }

  // Add method to group dormitories by zone
  private updateGroupedDorms(dormitories: DormitoryOption[]): void {
    // Group dormitories by zone_name
    const zoneMap = new Map<string, { id: string, dormitories: { id: string, name: string }[] }>();

    // First, create a map of zones
    dormitories.forEach(dorm => {
      const zoneName = dorm.zone_name || 'อื่นๆ';
      if (!zoneMap.has(zoneName)) {
        zoneMap.set(zoneName, {
          id: dorm.zone_id?.toString() || '',
          dormitories: []
        });
      }

      // Add this dorm to its zone group
      zoneMap.get(zoneName)?.dormitories.push({
        id: dorm.dorm_id.toString(),
        name: dorm.dorm_name
      });
    });

    // Convert map to array
    this.groupedDorms = Array.from(zoneMap.entries()).map(([name, data]) => ({
      id: data.id,
      name: name,
      dormitories: data.dormitories
    }));
  }

  // เพิ่ม method สำหรับ populate ข้อมูล Google
  private populateGoogleData(state: any): void {
    this.isFromGoogle = true;
    if (state.userType) this.userType = state.userType;

    // ใช้ setTimeout เพื่อให้ form initialize เสร็จก่อน
    setTimeout(() => {
      // ตรวจสอบและเติมข้อมูลจาก Google
      if (state.fullName) {
        this.registerForm.patchValue({ fullName: state.fullName });
      }
      if (state.email) {
        this.registerForm.patchValue({ email: state.email });
      }
      if (state.photoURL) {
        this.photoURL = state.photoURL;
      }

      // Disable fields ที่มาจาก Google
      this.registerForm.get('fullName')?.disable();
      this.registerForm.get('email')?.disable();

      this.updateFormValidation();
      this.isInitializing = false; // ปิด initializing flag เมื่อเสร็จ
    }, 100);
  }

  // แก้ไข getPageTitle() method
  getPageTitle(): string {
    if (this.isInitializing || this.isNavigating) {
      return 'กำลังโหลด...';
    }

    if (this.isFromGoogle) {
      return this.userType === 'owner'
        ? 'สมัครสมาชิกเจ้าของหอพัก'
        : 'สมัครสมาชิก';
    }

    return this.userType === 'owner'
      ? 'สมัครสมาชิกเจ้าของหอพัก'
      : 'สมัครสมาชิก';
  }

  // แก้ไข getPageDescription() method
  getPageDescription(): string {
    if (this.isInitializing || this.isNavigating) {
      return 'กำลังเตรียมข้อมูล...';
    }

    if (this.isFromGoogle) {
      return 'กรุณากรอกข้อมูลเพิ่มเติมเพื่อสมบูรณ์การสมัครสมาชิก';
    }

    return this.userType === 'owner'
      ? 'สร้างบัญชีเพื่อเริ่มต้นจัดการหอพักของคุณ'
      : 'สร้างบัญชีเพื่อเริ่มต้นค้นหาหอพักที่คุณต้องการ';
  }

  ngOnDestroy() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
    document.removeEventListener('keydown', this.handleKeydown.bind(this));

    // ทำความสะอาด event listeners
    window.removeEventListener('popstate', this.onPopState.bind(this));
    window.removeEventListener('beforeunload', this.onBeforeUnload.bind(this));

    // ถ้าอยู่ใน Google flow ให้ sign out ก่อน destroy component
    if (this.isFromGoogle) {
      this.authService.signOut(null);
    }
  }

  private updateFormValidation() {
    // ล้าง validators ของช่องธุรกิจทั้งหมดก่อน
    const businessFields = ['businessName', 'businessAddress', 'businessRegistration'];
    businessFields.forEach(field => {
      const control = this.registerForm.get(field);
      if (control) {
        control.clearValidators();
        control.updateValueAndValidity();
      }
    });

    // 1. จัดการ Email และ FullName สำหรับ Google OAuth และการลงทะเบียนปกติ
    const emailControl = this.registerForm.get('email');
    const fullNameControl = this.registerForm.get('fullName');

    if (this.isFromGoogle) {
      // สำหรับ Google OAuth: ปิดใช้งานช่องและตั้งค่า validators
      emailControl?.disable();
      fullNameControl?.disable();
      emailControl?.setValidators([Validators.required, Validators.email]);
      fullNameControl?.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(100)]);
    } else {
      // สำหรับการลงทะเบียนปกติ: เปิดใช้งานช่องและตั้งค่า validators
      emailControl?.enable();
      fullNameControl?.enable();
      emailControl?.setValidators([Validators.required, Validators.email]);
      fullNameControl?.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(100)]);
    }

    // 2. จัดการช่องรหัสผ่าน
    const passwordControl = this.registerForm.get('password');
    const confirmPasswordControl = this.registerForm.get('confirmPassword');

    if (this.isFromGoogle) {
      // Google OAuth: ไม่ต้องใช้รหัสผ่าน
      passwordControl?.clearValidators();
      passwordControl?.disable();
      confirmPasswordControl?.clearValidators();
      confirmPasswordControl?.disable();
      passwordControl?.setValue('');
      confirmPasswordControl?.setValue('');
    } else {
      // การลงทะเบียนปกติ: ต้องใช้รหัสผ่าน
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      passwordControl?.enable();
      confirmPasswordControl?.setValidators([Validators.required]);
      confirmPasswordControl?.enable();
    }

    // 3. จัดการการตรวจสอบหมายเลขโทรศัพท์ - จำเป็นสำหรับทั้งสมาชิกและเจ้าของ
    const phoneNumberControl = this.registerForm.get('phoneNumber');
    if (phoneNumberControl) {
      phoneNumberControl.setValidators([
        Validators.required,
        Validators.pattern('^[0-9]{10}$'),
        Validators.minLength(10),
        Validators.maxLength(10)
      ]);
      phoneNumberControl.updateValueAndValidity();
    }

    // 4. จัดการชื่อผู้จัดการสำหรับเจ้าของ (จำเป็น)
    const managerNameControl = this.registerForm.get('managerName');
    if (managerNameControl) {
      if (this.userType === 'owner') {
        managerNameControl.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(100)]);
      } else {
        managerNameControl.clearValidators();
      }
      managerNameControl.updateValueAndValidity();
    }

    // 5. จัดการหมายเลขโทรศัพท์สำรองสำหรับเจ้าของ (ไม่บังคับ)
    const secondaryPhoneControl = this.registerForm.get('secondaryPhone');
    if (secondaryPhoneControl) {
      if (this.userType === 'owner') {
        secondaryPhoneControl.setValidators([
          Validators.pattern('^[0-9]{10}$'),
          Validators.minLength(10),
          Validators.maxLength(10)
        ]);
      } else {
        secondaryPhoneControl.clearValidators();
      }
      secondaryPhoneControl.updateValueAndValidity();
    }

    // 6. จัดการ Line ID สำหรับเจ้าของ (ไม่บังคับ)
    const lineIdControl = this.registerForm.get('lineId');
    if (lineIdControl) {
      lineIdControl.clearValidators();
      lineIdControl.updateValueAndValidity();
    }

    // 7. จัดการหอพักสำหรับสมาชิก (จำเป็น)
    const dormControl = this.registerForm.get('dormitory');
    if (dormControl) {
      if (this.userType === 'member') {
        dormControl.setValidators([Validators.required]);
        if (!dormControl.value) dormControl.setValue('');
      } else {
        dormControl.clearValidators();
      }
      dormControl.updateValueAndValidity();
    }

    // อัปเดตความถูกต้องของทุกคอนโทรล
    emailControl?.updateValueAndValidity();
    fullNameControl?.updateValueAndValidity();
    passwordControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
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
      if (controlName === 'phoneNumber') {
        return 'กรุณากรอกเบอร์โทรศัพท์';
      }
      if (controlName === 'managerName') {
        return 'กรุณากรอกชื่อผู้จัดการ/เจ้าของหอพัก';
      }
      if (controlName === 'dormitory') {
        return 'กรุณาเลือกหอพัก';
      }
      if (controlName === 'fullName') {
        return 'กรุณากรอกชื่อ-นามสกุล';
      }
      return 'กรุณากรอกข้อมูล';
    }



    if (controlName === 'fullName') {
      if (control.hasError('minlength')) {
        return 'ชื่อ-นามสกุลต้องมีความยาวอย่างน้อย 2 ตัวอักษร';
      }
      if (control.hasError('maxlength')) {
        return 'ชื่อ-นามสกุลต้องมีความยาวไม่เกิน 100 ตัวอักษร';
      }
    }

    if (controlName === 'email' && control.hasError('email')) {
      return 'กรุณากรอกอีเมลให้ถูกต้อง';
    }
    if (controlName === 'email' && control.hasError('emailInUse')) {
      return 'อีเมลนี้ถูกใช้งานแล้ว';
    }
    if (controlName === 'password' && control.hasError('minlength')) {
      return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    }
    if (controlName === 'confirmPassword' && control.hasError('passwordMismatch')) {
      return 'รหัสผ่านไม่ตรงกัน';
    }
    if ((controlName === 'phoneNumber' || controlName === 'secondaryPhone')) {
      if (control.hasError('pattern')) {
        return 'กรุณากรอกเบอร์โทรศัพท์เป็นตัวเลข 10 หลักเท่านั้น';
      }
      if (control.hasError('minlength') || control.hasError('maxlength')) {
        return 'เบอร์โทรศัพท์ต้องมี 10 หลักเท่านั้น';
      }
    }
    return '';
  }

  // *** ปรับปรุง isFieldRequired method ***
  isFieldRequired(controlName: string): boolean {
    const control = this.registerForm.get(controlName);
    if (!control) return false;

    // ตรวจสอบว่า field นี้มี required validator หรือไม่
    return control.hasValidator(Validators.required);
  }

  // *** เพิ่ม method สำหรับตรวจสอบว่า field สามารถแก้ไขได้หรือไม่ ***
  isFieldEditable(controlName: string): boolean {
    if (this.isFromGoogle) {
      // สำหรับ Google OAuth: เฉพาะข้อมูลจาก Google ที่แก้ไขไม่ได้
      const googleFields = ['email', 'fullName'];
      return !googleFields.includes(controlName);
    }
    return true; // การสมัครธรรมดาแก้ไขได้ทุก field
  }



  async onSubmit(): Promise<void> {
    if (this.isRegisterLoading) return;

    this.isSubmitting = true;
    this.isRegisterLoading = true;
    this.errorMessage = null;

    if (this.userType === 'general') {
      this.errorMessage = 'กรุณาเลือกประเภทสมาชิก (เจ้าของหอพัก หรือ สมาชิก)';
      this.isRegisterLoading = false;
      this.isSubmitting = false;
      return;
    }

    if (this.userType === 'member' && !this.registerForm.get('dormitory')?.value) {
      this.errorMessage = 'กรุณาเลือกหอพัก';
      this.registerForm.get('dormitory')?.markAsTouched();
      this.isRegisterLoading = false;
      this.isSubmitting = false;
      return;
    }

    if (this.userType === 'owner' && !this.registerForm.get('managerName')?.value) {
      this.errorMessage = 'กรุณากรอกชื่อผู้จัดการ/เจ้าของหอพัก';
      this.isRegisterLoading = false;
      this.isSubmitting = false;
      return;
    }

    const fieldsToReEnable: string[] = [];
    if (this.isFromGoogle) {
      ['email', 'fullName'].forEach(fieldName => {
        const control = this.registerForm.get(fieldName);
        if (control && control.disabled) {
          control.enable();
          fieldsToReEnable.push(fieldName);
        }
      });
    }

    this.registerForm.updateValueAndValidity();

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง';
      this.restoreDisabledFields(fieldsToReEnable);
      this.isRegisterLoading = false;
      this.isSubmitting = false;
      return;
    }

    try {
      const formData = this.registerForm.getRawValue();
      const currentUserType = this.userType;

      // Clean up data by trimming whitespace and formatting phone numbers
      const cleanedFormData = {
        ...formData,
        email: formData.email?.toString().trim(),
        fullName: formData.fullName?.toString().trim(),
        phoneNumber: formData.phoneNumber?.toString().trim().replace(/\D/g, ''),
        managerName: formData.managerName?.toString().trim(),
        secondaryPhone: formData.secondaryPhone?.toString().trim().replace(/\D/g, ''),
        lineId: formData.lineId?.toString().trim()
      };

      let userProfile: UserProfile;
      if (this.isFromGoogle) {
        console.log('[RegisterComponent] Completing Google OAuth profile');
        const ownerData = currentUserType === 'owner' ? {
          managerName: cleanedFormData.managerName,
          secondaryPhone: cleanedFormData.secondaryPhone || undefined,
          lineId: cleanedFormData.lineId || undefined
        } : undefined;

        userProfile = await this.authService.completeUserProfile(
          cleanedFormData.phoneNumber || undefined,
          currentUserType as 'member' | 'owner',
          currentUserType === 'member' && cleanedFormData.dormitory ? parseInt(cleanedFormData.dormitory, 10) : undefined,
          ownerData
        );
      } else {
        console.log('[RegisterComponent] Regular signup process');
        const submitFormData = new FormData();
        submitFormData.append('email', cleanedFormData.email);
        submitFormData.append('password', cleanedFormData.password);
        submitFormData.append('memberType', currentUserType);
        submitFormData.append('fullName', cleanedFormData.fullName);
        if (cleanedFormData.phoneNumber) submitFormData.append('phoneNumber', cleanedFormData.phoneNumber);
        if (currentUserType === 'member' && cleanedFormData.dormitory) submitFormData.append('dormitoryId', cleanedFormData.dormitory);
        if (this.selectedFile) submitFormData.append('profileImage', this.selectedFile);
        if (currentUserType === 'owner') {
          submitFormData.append('managerName', cleanedFormData.managerName);
          if (cleanedFormData.secondaryPhone) submitFormData.append('secondaryPhone', cleanedFormData.secondaryPhone);
          if (cleanedFormData.lineId) submitFormData.append('lineId', cleanedFormData.lineId);
        }

        userProfile = await this.authService.signUpWithFormData(submitFormData);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      this.authService.currentUser$.next(userProfile);
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('[RegisterComponent] User profile after registration:', {
        memberType: userProfile.memberType,
        needsProfileSetup: userProfile.needsProfileSetup,
        managerName: userProfile.managerName,
        provider: userProfile.provider
      });

      // แก้ไขการนำทาง: ไปหน้า /owner เฉพาะ owner ที่สมัครสำเร็จ
      const targetRoute = userProfile.memberType === 'owner' && !userProfile.needsProfileSetup ? '/owner' : '/main';
      console.log('[RegisterComponent] Navigating to:', targetRoute);
      
      // ใช้ replaceUrl เพื่อไม่ให้กด back ได้
      await this.router.navigate([targetRoute], { replaceUrl: true });
      
      // รีเซ็ต history state หลัง navigation สำเร็จ
      setTimeout(() => {
        if (window.history.state && window.history.state.page === 'register') {
          window.history.replaceState({ page: 'dashboard' }, '', window.location.href);
        }
      }, 100);
      
    } catch (error: any) {
      console.error('[RegisterComponent] Registration error:', error);
      const errorMsg = this.authService.errorMessageHandler(error);
      if (error.code === 'auth/email-already-in-use' || errorMsg === 'อีเมลนี้ถูกใช้งานแล้ว') {
        this.registerForm.get('email')?.setErrors({ emailInUse: true });
        this.errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น';
      } else {
        this.errorMessage = errorMsg || 'เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองอีกครั้ง';
      }
      await this.authService.signOut(null);
    } finally {
      this.isRegisterLoading = false;
      this.isSubmitting = false;
      this.restoreDisabledFields(fieldsToReEnable);
    }
  }
  
  // *** เพิ่ม helper method สำหรับ restore disabled fields ***
  private restoreDisabledFields(fieldsToReEnable: string[]): void {
    fieldsToReEnable.forEach(fieldName => {
      const control = this.registerForm.get(fieldName);
      if (control) {
        control.disable();
      }
    });
  }

  onLogin(): void {
    this.router.navigate(['/login', this.userType]);
  }

  async connectWithGoogle(): Promise<void> {
    if (this.isGoogleLoading) return;

    this.isGoogleLoading = true;
    this.errorMessageGoogle = null;

    try {
      console.log('[RegisterComponent] Starting Google OAuth for userType:', this.userType);

      let targetUserType: 'member' | 'owner';

      if (this.userType === 'member') {
        targetUserType = 'member';
      } else if (this.userType === 'owner') {
        targetUserType = 'owner';
      } else {
        this.errorMessageGoogle = 'กรุณาเลือกประเภทสมาชิกก่อน (เจ้าของหอพัก หรือ สมาชิก)';
        this.isGoogleLoading = false;
        return;
      }

      // เปลี่ยนจาก signInWithGoogle เป็น getGoogleUserInfo เพื่อไม่ให้บันทึกข้อมูลทันที
      const userInfo = await this.authService.getGoogleUserInfo(targetUserType);

      // นำข้อมูลมาเติมในฟอร์มแทนที่จะบันทึกทันที
      if (userInfo) {
        console.log('[RegisterComponent] Google user info received:', userInfo);
        this.isFromGoogle = true;
        this.registerForm.patchValue({
          email: userInfo.email,
          fullName: userInfo.displayName
        });
        if (userInfo.photoURL) {
          this.photoURL = userInfo.photoURL;
        }

        // Disable fields ที่มาจาก Google
        this.registerForm.get('email')?.disable();
        this.registerForm.get('fullName')?.disable();

        // Clear password validators
        this.registerForm.get('password')?.clearValidators();
        this.registerForm.get('confirmPassword')?.clearValidators();
        this.registerForm.get('password')?.disable();
        this.registerForm.get('confirmPassword')?.disable();

        this.registerForm.updateValueAndValidity();

        // ตรวจสอบข้อมูลเก่าจากฐานข้อมูล
        if (userInfo.email) {
          try {
            const existingUser = await this.authService.checkExistingUserByEmail(userInfo.email);
            if (existingUser) {
              console.log('[RegisterComponent] Found existing user:', existingUser);
              
              // เติมข้อมูลเก่าลงในฟอร์ม
              if (existingUser.phoneNumber) {
                this.registerForm.patchValue({ phoneNumber: existingUser.phoneNumber });
              }
              
              if (existingUser.managerName) {
                this.registerForm.patchValue({ managerName: existingUser.managerName });
              }
              
              if (existingUser.secondaryPhone) {
                this.registerForm.patchValue({ secondaryPhone: existingUser.secondaryPhone });
              }
              
              if (existingUser.lineId) {
                this.registerForm.patchValue({ lineId: existingUser.lineId });
              }
              
              if (existingUser.residenceDormId) {
                this.registerForm.patchValue({ dormitory: existingUser.residenceDormId });
                // หาชื่อหอพักจาก ID
                this.loadDormitories().then(() => {
                  const dorm = this.dormList.find(d => d.id === existingUser.residenceDormId);
                  if (dorm) {
                    this.selectedDormName = dorm.name;
                    this.dormSearchControl.setValue(dorm.name);
                  }
                });
              }
              
              // อัปเดต validation ตามข้อมูลที่มี
              this.updateFormValidation();
            }
          } catch (error) {
            console.error('[RegisterComponent] Error checking existing user:', error);
          }
        }

        // อัปเดต URL เพื่อแสดงสถานะ Google flow
        this.router.navigate([], {
          queryParams: { fromGoogle: 'true' },
          replaceUrl: true
        });

        console.log('[RegisterComponent] Google flow setup completed');
      }

    } catch (error: any) {
      console.error('[RegisterComponent] Google OAuth error:', error);
      this.errorMessageGoogle = this.authService.errorMessageHandler(error);
      this.setGoogleErrorTimeout();
    } finally {
      this.isGoogleLoading = false;
    }
  }

  private setGoogleErrorTimeout(): void {
    // ไม่ต้องเคลียร์ error อัตโนมัติอีกต่อไป
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.photoURL = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onEditAvatar(): void {
    if (this.isFromGoogle && this.photoURL) {
      return; // ไม่สามารถแก้ไขรูป Google ได้
    }
    this.showImagePopup = true;
    this.resetImagePopup();
  }

  resetImagePopup(): void {
    this.selectedFile = null;
    this.previewImage = null;
    this.isImageLoading = false;
    this.imageError = '';
  }

  closeImagePopup(): void {
    this.showImagePopup = false;
  }

  onFileSelectedFromPopup(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      if (!file.type.startsWith('image/')) {
        this.imageError = 'กรุณาเลือกไฟล์รูปภาพเท่านั้น';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        this.imageError = 'ขนาดไฟล์ต้องไม่เกิน 10MB';
        return;
      }

      this.selectedFile = file;
      this.imageError = '';

      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewImage = e.target?.result as string;
        this.isImageLoading = false;
      };
      reader.readAsDataURL(file);
    }
  }

  confirmImageSelection(): void {
    if (this.selectedFile) {
      this.uploadImageFromPopup(this.selectedFile);
    } else {
      console.warn('[RegisterComponent] No selectedFile - unexpected state');
    }
  }

  async uploadImageFromPopup(file: File): Promise<void> {
    try {
      this.photoURL = this.previewImage;
      this.closeImagePopup();
      console.log('[RegisterComponent] Image uploaded successfully');
    } catch (error) {
      console.error('[RegisterComponent] Failed to upload image:', error);
      this.imageError = 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ';
    }
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.previewImage = null;
    this.imageError = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.classList.add('dragover');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('dragover');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('dragover');

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];

      if (!file.type.startsWith('image/')) {
        this.imageError = 'กรุณาเลือกไฟล์รูปภาพเท่านั้น';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        this.imageError = 'ขนาดไฟล์ต้องไม่เกิน 10MB';
        return;
      }

      this.selectedFile = file;
      this.imageError = '';

      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileType(file: File): string {
    const extension = file.name.split('.').pop()?.toUpperCase();
    return extension || 'Unknown';
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

  handleKeydown(event: KeyboardEvent): void {
    if (this.showImagePopup) {
      if (event.key === 'Escape') {
        this.closeImagePopup();
      } else if (event.key === 'Enter' && this.previewImage) {
        this.confirmImageSelection();
      }
    } else {
      if (event.key === 'ArrowRight') {
        this.nextSlide();
      } else if (event.key === 'ArrowLeft') {
        this.prevSlide();
      }
    }
  }

  private async loadZones(): Promise<void> {
    try {
      const zones = await this.authService.getZoneOptions();
      this.zoneList = [
        { id: '', name: 'ทุกโซน' },
        ...zones.map(z => ({ id: z.zone_id.toString(), name: z.zone_name }))
      ];
    } catch (error) {
    }
  }

  onZoneChange(zoneId: string): void {
    this.selectedZoneId = zoneId;
    // Reset dormitory selection
    this.registerForm.get('dormitory')?.setValue('');
    this.loadDormitories(zoneId ? parseInt(zoneId, 10) : undefined);
  }

  // Add method to filter dormitories based on search text
  filterDorms(): void {
    const searchText = this.dormSearchControl.value?.toLowerCase() || '';

    if (!searchText) {
      this.filteredDorms = [...this.groupedDorms];
      return;
    }

    // Filter zones and dormitories that match the search text
    this.filteredDorms = this.groupedDorms
      .map(zone => {
        // First check if zone name matches
        const zoneMatches = zone.name.toLowerCase().includes(searchText);

        // Then filter dormitories
        const matchingDorms = zone.dormitories.filter(dorm =>
          dorm.name.toLowerCase().includes(searchText)
        );

        // Return zone with matching dorms if either zone matches or has matching dorms
        if (zoneMatches || matchingDorms.length > 0) {
          return {
            ...zone,
            dormitories: zoneMatches ? zone.dormitories : matchingDorms
          };
        }

        return null;
      })
      .filter(zone => zone !== null) as ZoneDormitories[];
  }

  // Add method to select a dormitory
  selectDorm(dormId: string, dormName: string): void {
    this.registerForm.get('dormitory')?.setValue(dormId);
    this.selectedDormName = dormName;
    this.dormSearchControl.setValue(dormName);
    this.showDormList = false;
  }

  // Add document click listener to close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Check if click is outside the dropdown
    const clickedElement = event.target as HTMLElement;
    const isClickInsideDropdown = clickedElement.closest('.dorm-dropdown-container');

    if (!isClickInsideDropdown && this.showDormList) {
      this.showDormList = false;
    }
  }

  // เพิ่ม method สำหรับจัดการ history state
  private setupHistoryState(): void {
    // เพิ่ม entry ของหน้าแรกเข้าไปใน history ก่อน
    window.history.pushState({ page: 'home' }, '', '/main');

    // แทนที่ entry ปัจจุบันด้วยหน้า registration
    window.history.replaceState({ page: 'register' }, '', this.router.url);

    // เพิ่ม event listener สำหรับ beforeunload
    window.addEventListener('beforeunload', () => {
      if (this.isFromGoogle) {
        this.authService.signOut(null);
      }
    });
  }

  // Override browser back button - วิธีของ Google/Facebook
  @HostListener('window:popstate', ['$event'])
  onPopState(event: PopStateEvent) {
    console.log('[RegisterComponent] PopState event triggered');
    console.log('[RegisterComponent] Current URL:', this.router.url);
    console.log('[RegisterComponent] isFromGoogle:', this.isFromGoogle);

    // ป้องกันการทำงานปกติ
    event.preventDefault();

    // ถ้าอยู่ใน Google flow ให้ sign out ก่อน
    if (this.isFromGoogle) {
      console.log('[RegisterComponent] Signing out Google user before navigation');
      this.authService.signOut(null);

      // รอสักครู่ให้ sign out เสร็จก่อนนำทาง
      setTimeout(() => {
        console.log('[RegisterComponent] Navigating to /main after sign out');
        window.location.href = '/main';
      }, 500);
    } else {
      // กลับไปหน้าแรกเสมอ - ใช้ window.location.href แทน router.navigate
      // ไปที่ /main แทน /owner เพื่อหลีกเลี่ยง OwnerGuard
      console.log('[RegisterComponent] Navigating to /main');
      window.location.href = '/main';
    }
  }

  // เพิ่ม method สำหรับจัดการ URL changes
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    // ถ้าอยู่ใน Google flow ให้ sign out ก่อนปิดหน้า
    if (this.isFromGoogle) {
      this.authService.signOut(null);
    }
  }
}