import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
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
    private location: Location,  // เพิ่ม Location service
    private auth: Auth  // เพิ่ม Auth service จาก Firebase
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      confirmPassword: [''],
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern('^[0-9]{10}$'),
        Validators.minLength(10),
        Validators.maxLength(10)
      ]],
      managerName: ['', [Validators.minLength(2), Validators.maxLength(100)]],
      secondaryPhone: ['', [
        Validators.pattern('^[0-9]{10}$'),
        Validators.minLength(10),
        Validators.maxLength(10)
      ]],
      lineId: [''],
      dormitory: [''],
    }, {
      validators: this.passwordMatchValidator
    });

    // Read userType from route param (member/owner) and fromGoogle from query param
    this.route.paramMap.subscribe(paramMap => {
      // Prevent userType change during submission
      if (this.isSubmitting) {
        return;
      }

      const typeParam = paramMap.get('type');
      if (typeParam === 'owner' || typeParam === 'member') {
        this.userType = typeParam;
      }

      // Read fromGoogle flag from query param
      const fromGoogle = this.route.snapshot.queryParamMap.get('fromGoogle');
      if (fromGoogle === 'true') {
        this.isFromGoogle = true;
        // Remove password validators for Google sign-in
        this.registerForm.get('password')?.clearValidators();
        this.registerForm.get('confirmPassword')?.clearValidators();
      } else {
        // Add password validators for normal sign-up
        this.registerForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
        this.registerForm.get('confirmPassword')?.setValidators([Validators.required]);
      }

      // Update validators and end initializing
      this.updateFormValidation();
      this.isInitializing = false;
    });

    // Subscribe to queryParamMap to catch fromGoogle changes when navigating within same component
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

    // Initialize filteredDorms
    this.filteredDorms = [...this.groupedDorms];

    // ตรวจสอบและป้องกันการเข้าถึงหน้า registration โดยตรง
    this.validateRegistrationAccess();

    // เพิ่ม history state เพื่อจัดการการย้อนกลับ
    this.setupHistoryState();

    // เพิ่มการจัดการ history state ที่แข็งแกร่งขึ้น
    setTimeout(() => {
      // เพิ่ม entry ของหน้าแรกเข้าไปใน history
      window.history.pushState({ page: 'home' }, '', '/main');
      // แทนที่ entry ปัจจุบันด้วยหน้า registration
      window.history.replaceState({ page: 'register' }, '', this.router.url);
    }, 100);

    // เพิ่มการจัดการ history state อีกครั้งหลังจาก component initialize เสร็จ
    setTimeout(() => {
      // ตรวจสอบว่า URL ยังคงเป็น registration page หรือไม่
      if (this.router.url.includes('/register')) {
        // เพิ่ม entry ของหน้าแรกเข้าไปใน history อีกครั้ง
        window.history.pushState({ page: 'home' }, '', '/main');
        // แทนที่ entry ปัจจุบันด้วยหน้า registration
        window.history.replaceState({ page: 'register' }, '', this.router.url);
      }
    }, 500);

    // ตรวจสอบ query params
    this.route.queryParamMap.subscribe(params => {
      const fromGoogle = params.get('fromGoogle') === 'true';
      const additionalInfo = params.get('additionalInfo') === 'true';

      console.log('[RegisterComponent] Query params:', { fromGoogle, additionalInfo });

      // ถ้าเป็น additionalInfo แต่ไม่ได้มาจาก Google ให้ redirect กลับไปหน้าสมัครสมาชิก
      if (additionalInfo && !fromGoogle) {
        this.router.navigate(['/register', this.userType]);
        return;
      }

      if (fromGoogle) {
        console.log('[RegisterComponent] Setting up Google flow');
        this.isFromGoogle = true;
        // Remove password validators
        this.registerForm.get('password')?.clearValidators();
        this.registerForm.get('confirmPassword')?.clearValidators();
        this.registerForm.get('password')?.disable();
        this.registerForm.get('confirmPassword')?.disable();
        this.registerForm.updateValueAndValidity();
        
        // อัปเดต URL เพื่อแสดงสถานะ Google flow
        this.router.navigate([], {
          queryParams: { fromGoogle: 'true' },
          replaceUrl: true
        });
    } else {
        // ถ้าไม่ได้มาจาก Google ให้ reset state
        console.log('[RegisterComponent] Setting up normal registration flow');
        this.isFromGoogle = false;
        this.updateFormValidation();
      }
    });

      // ตรวจสอบ history.state สำหรับกรณีที่ navigation state หายไป
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

    // *** แก้ไขการ subscribe currentUser$ เพื่อป้องกัน redirect ระหว่าง registration ***
    this.authService.currentUser$.subscribe(userProfile => {
      // *** ป้องกันการ redirect ระหว่าง submit ***
      if (this.isSubmitting) {
        return;
      }

      // เติมข้อมูลอัตโนมัติให้ Google flow หลัง refresh
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
        // Remove password validators
        this.registerForm.get('password')?.clearValidators();
        this.registerForm.get('confirmPassword')?.clearValidators();
        this.registerForm.get('password')?.disable();
        this.registerForm.get('confirmPassword')?.disable();
        this.registerForm.updateValueAndValidity();
      }

      // ป้องกันการ redirect ถ้ายังอยู่ใน registration flow
      if (userProfile && !userProfile.needsProfileSetup && !this.isFromGoogle) {
        const expectedDashboard = userProfile.memberType === 'owner' ? '/owner' : '/main';
        if (!this.router.url.startsWith(expectedDashboard) &&
          !this.router.url.startsWith('/login') &&
          !this.router.url.startsWith('/register')) {
          this.router.navigate([expectedDashboard]);
        }
      }
    });

    // โหลดโซนก่อน
    this.loadZones();
  }

  // เพิ่ม method สำหรับตรวจสอบการเข้าถึงหน้า registration
  private validateRegistrationAccess(): void {
    // ตรวจสอบว่าผู้ใช้เข้าถึงหน้า registration ผ่านทางที่ถูกต้องหรือไม่
    const currentUrl = this.router.url;
    const referrer = document.referrer;
    
    // ถ้าเข้าถึงโดยตรง (ไม่มี referrer) และไม่ได้มาจาก Google flow
    if (!referrer && !currentUrl.includes('fromGoogle=true')) {
      // Redirect ไปหน้าแรก
      this.router.navigate(['/'], { replaceUrl: true });
      return;
    }
    
    // ตรวจสอบว่า URL มีรูปแบบที่ถูกต้อง
    const validRegistrationPatterns = [
      /^\/register\/owner(\?.*)?$/,
      /^\/register\/member(\?.*)?$/
    ];
    
    const isValidUrl = validRegistrationPatterns.some(pattern => pattern.test(currentUrl));
    if (!isValidUrl) {
      this.router.navigate(['/'], { replaceUrl: true });
      return;
    }
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

  // *** ปรับปรุง updateFormValidation ให้ชัดเจนขึ้น ***
  private updateFormValidation() {
    // Clear all business fields first
    const businessFields = ['businessName', 'businessAddress', 'businessRegistration'];
    businessFields.forEach(field => {
      const control = this.registerForm.get(field);
      if (control) {
        control.clearValidators();
        control.updateValueAndValidity();
      }
    });

    // *** 1. จัดการ Email และ FullName สำหรับ Google OAuth ***
    const emailControl = this.registerForm.get('email');
    const fullNameControl = this.registerForm.get('fullName');

    if (this.isFromGoogle) {
      // สำหรับ Google OAuth: ข้อมูลจาก Google ไม่สามารถแก้ไขได้
      emailControl?.disable();
      fullNameControl?.disable();
      // ยังคง validation ไว้เพื่อให้แน่ใจว่ามีข้อมูล แต่จะ enable ชั่วคราวตอน submit
      emailControl?.setValidators([Validators.required, Validators.email]);
      fullNameControl?.setValidators([Validators.required]);
    } else {
      // สำหรับการสมัครธรรมดา: สามารถแก้ไขได้
      emailControl?.enable();
      fullNameControl?.enable();
      emailControl?.setValidators([Validators.required, Validators.email]);
      fullNameControl?.setValidators([Validators.required]);
    }

    // *** 2. จัดการ Password fields ***
    const passwordControl = this.registerForm.get('password');
    const confirmPasswordControl = this.registerForm.get('confirmPassword');

    if (this.isFromGoogle) {
      // Google OAuth: ไม่ต้องรหัสผ่าน
      passwordControl?.clearValidators();
      passwordControl?.disable();
      confirmPasswordControl?.clearValidators();
      confirmPasswordControl?.disable();
      // ซ่อน fields ด้วยการเซ็ตค่าเป็น empty string
      passwordControl?.setValue('');
      confirmPasswordControl?.setValue('');
    } else {
      // การสมัครธรรมดา: ต้องมีรหัสผ่าน
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      passwordControl?.enable();
      confirmPasswordControl?.setValidators([Validators.required]);
      confirmPasswordControl?.enable();
    }

    // *** 3. จัดการ Phone Number validation - บังคับทั้ง member และ owner ***
    const phoneNumberControl = this.registerForm.get('phoneNumber');
    if (phoneNumberControl) {
      // เบอร์โทรบังคับสำหรับทั้งสมาชิกและเจ้าของหอพัก
      phoneNumberControl.setValidators([Validators.required, Validators.pattern('^[0-9]{10}$')]);
      phoneNumberControl.updateValueAndValidity();
    }

    // *** 4. จัดการ Manager Name สำหรับ Owner (บังคับ) ***
    const managerNameControl = this.registerForm.get('managerName');
    if (managerNameControl) {
      if (this.userType === 'owner') {
        managerNameControl.setValidators([Validators.required]);
      } else {
        managerNameControl.clearValidators();
      }
      managerNameControl.updateValueAndValidity();
    }

    // *** 5. จัดการ Secondary Phone สำหรับ Owner (ไม่บังคับ) ***
    const secondaryPhoneControl = this.registerForm.get('secondaryPhone');
    if (secondaryPhoneControl) {
      if (this.userType === 'owner') {
        secondaryPhoneControl.setValidators([Validators.pattern('^[0-9]{10}$')]);
      } else {
        secondaryPhoneControl.clearValidators();
      }
      secondaryPhoneControl.updateValueAndValidity();
    }

    // *** 6. จัดการ Line ID สำหรับ Owner (ไม่บังคับ) ***
    const lineIdControl = this.registerForm.get('lineId');
    if (lineIdControl) {
      // Line ID ไม่บังคับเสมอ ไม่ต้อง validation
      lineIdControl.clearValidators();
      lineIdControl.updateValueAndValidity();
    }

    // *** 7. จัดการ Dormitory สำหรับ Member (บังคับ) ***
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

    // Update validity for all controls
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

    // *** เซ็ต flag ป้องกันการเปลี่ยน userType ***
    this.isSubmitting = true;
    this.isRegisterLoading = true;
    this.errorMessage = null;

    if (this.userType === 'general') {
      this.errorMessage = 'กรุณาเลือกประเภทสมาชิก (เจ้าของหอพัก หรือ สมาชิก)';
      this.isRegisterLoading = false;
      this.isSubmitting = false;
      return;
    }

    // *** เฉพาะ member เท่านั้นที่ต้องเลือกหอพัก ***
    if (this.userType === 'member') {
      const dormValue = this.registerForm.get('dormitory')?.value;
      if (!dormValue || dormValue === '') {
        this.errorMessage = 'กรุณาเลือกหอพัก';
        this.registerForm.get('dormitory')?.markAsTouched();
        this.isRegisterLoading = false;
        this.isSubmitting = false;
        return;
      }
    }

    // *** เฉพาะ owner เท่านั้นที่ต้องกรอก managerName ***
    if (this.userType === 'owner' && !this.registerForm.get('managerName')?.value) {
      this.errorMessage = 'กรุณากรอกชื่อผู้จัดการ/เจ้าของหอพัก';
      this.isRegisterLoading = false;
      this.isSubmitting = false;
      return;
    }

    // *** Enable disabled fields temporarily for form submission ***
    const fieldsToReEnable: string[] = [];
    if (this.isFromGoogle) {
      // เฉพาะ Google OAuth fields ที่ disabled - ไม่รวม password
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
      let userProfile: UserProfile;

      // *** เก็บ userType ไว้ในตัวแปร local ป้องกันการเปลี่ยน ***
      const currentUserType = this.userType;

      if (this.isFromGoogle) {
        console.log('[RegisterComponent] Completing Google OAuth profile');

        // Prepare owner data for Google OAuth
        const ownerData = currentUserType === 'owner' ? {
          managerName: formData.managerName,
          secondaryPhone: formData.secondaryPhone || undefined,
          lineId: formData.lineId || undefined
        } : undefined;

        userProfile = await this.authService.completeUserProfile(
          formData.phoneNumber || undefined, // ส่ง undefined ถ้าไม่มีค่า
          currentUserType as 'member' | 'owner',
          currentUserType === 'member' && formData.dormitory ? parseInt(formData.dormitory, 10) : undefined,
          ownerData
        );

        this.receivedUsername = userProfile?.username || null;
        console.log('[RegisterComponent] Google user profile completed successfully');
      } else {
        console.log('[RegisterComponent] Regular signup process');
        const submitFormData = new FormData();
        submitFormData.append('email', formData.email);
        submitFormData.append('password', formData.password);
        submitFormData.append('memberType', currentUserType);
        submitFormData.append('fullName', formData.fullName);

        // ส่ง phoneNumber เฉพาะเมื่อมีค่า
        if (formData.phoneNumber) {
          submitFormData.append('phoneNumber', formData.phoneNumber);
        }

        if (currentUserType === 'member' && formData.dormitory) {
          submitFormData.append('dormitoryId', formData.dormitory);
        }

        if (this.selectedFile) submitFormData.append('profileImage', this.selectedFile);

        if (currentUserType === 'owner') {
          submitFormData.append('managerName', formData.managerName);
          if (formData.secondaryPhone) {
            submitFormData.append('secondaryPhone', formData.secondaryPhone);
          }
          if (formData.lineId) {
            submitFormData.append('lineId', formData.lineId);
          }
        }

        userProfile = await this.authService.signUpWithFormData(submitFormData);
      }

      // รอให้ auth state update เสร็จ
      await new Promise(resolve => setTimeout(resolve, 200));

      // *** อัปเดต userType ใน component หากจำเป็น ***
      if (userProfile.memberType && userProfile.memberType !== currentUserType) {
        console.log('[RegisterComponent] Updating userType from', currentUserType, 'to', userProfile.memberType);
        this.userType = userProfile.memberType;
      }

      // Debug: แสดงข้อมูล userProfile
      console.log('[RegisterComponent] User profile after registration:', {
        memberType: userProfile.memberType,
        needsProfileSetup: userProfile.needsProfileSetup,
        managerName: userProfile.managerName,
        provider: userProfile.provider,
        hasManagerName: !!userProfile.managerName,
        isFromGoogle: this.isFromGoogle
      });

      // *** Navigate ตรงไปยัง dashboard ทันที ***
      // ตรวจสอบว่าผู้ใช้มีข้อมูลครบหรือไม่
      if (userProfile.needsProfileSetup && this.isFromGoogle) {
        // ถ้ายังไม่มีข้อมูลครบและมาจาก Google ให้ไปหน้า main
        const targetRoute = '/main';
        console.log('[RegisterComponent] Google user needs profile setup, navigating to:', targetRoute);
        await this.router.navigate([targetRoute]);
      } else {
        // ถ้ามีข้อมูลครบแล้ว หรือเป็นการสมัครแบบปกติ ให้ไปหน้า owner
      const targetRoute = userProfile.memberType === 'owner' ? '/owner' : '/main';
        console.log('[RegisterComponent] User has complete profile or normal registration, navigating to:', targetRoute, 'based on memberType:', userProfile.memberType);
      await this.router.navigate([targetRoute]);
      }
      return;
    } catch (error: any) {
      console.error('[RegisterComponent] Registration error:', error);
      const errorMsg = this.authService.errorMessageHandler(error);
      
      // ตรวจสอบ Firebase email already in use error
      if (error.code === 'auth/email-already-in-use' || errorMsg === 'อีเมลนี้ถูกใช้งานแล้ว') {
        this.registerForm.get('email')?.setErrors({ emailInUse: true });
        this.errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น';
      } else if (errorMsg === 'อีเมลนี้ถูกใช้งานแล้ว') {
        this.registerForm.get('email')?.setErrors({ emailInUse: true });
        this.errorMessage = errorMsg;
      } else {
        this.errorMessage = errorMsg || 'เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองอีกครั้ง';
      }
      
      // Sign out เมื่อเกิดข้อผิดพลาด
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