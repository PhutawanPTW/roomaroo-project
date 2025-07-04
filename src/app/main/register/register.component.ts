import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { AuthService, UserProfile, DormitoryOption, ZoneOption } from '../../services/auth.service';

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
    private authService: AuthService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      fullName: ['', Validators.required],
      phoneNumber: ['', [Validators.pattern('^[0-9]{10}$')]],
      businessName: [''],
      businessAddress: [''],
      businessRegistration: [''],
      dormitory: [''],
    }, {
      validators: this.passwordMatchValidator
    });

    // Read userType from route param (member/owner) and fromGoogle from query param
    this.route.paramMap.subscribe(paramMap => {
      // Prevent userType change during submission
      if (this.isSubmitting) {
        console.log('[RegisterComponent] Ignoring paramMap change during submission');
        return;
      }

      const typeParam = paramMap.get('type');
      if (typeParam === 'owner' || typeParam === 'member') {
        this.userType = typeParam;
        console.log('[RegisterComponent] User type set from path param:', this.userType);
      }

      // Read fromGoogle flag from query param
      const fromGoogle = this.route.snapshot.queryParamMap.get('fromGoogle');
      if (fromGoogle === 'true') {
        this.isFromGoogle = true;
        console.log('[RegisterComponent] Google OAuth detected from query params');
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
        console.log('[RegisterComponent] queryParamMap detected isFromGoogle change:', this.isFromGoogle);
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
  
    // ตรวจสอบ navigation state
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras.state as {
      fullName?: string;
      email?: string;
      photoURL?: string;
      userType?: 'member' | 'owner' | 'general';
      isFromGoogle?: boolean;
    };
  
    if (state && state.isFromGoogle) {
      console.log('[RegisterComponent] Google OAuth state detected:', state);
      this.populateGoogleData(state);
    } else {
      // ตรวจสอบ history.state สำหรับกรณีที่ navigation state หายไป
      const historyState = history.state as {
        fullName?: string;
        email?: string;
        photoURL?: string;
        userType?: 'member' | 'owner' | 'general';
        isFromGoogle?: boolean;
      };
  
      if (historyState && historyState.isFromGoogle) {
        console.log('[RegisterComponent] Google OAuth state detected from history:', historyState);
        this.populateGoogleData(historyState);
      }
    }
  
    // *** แก้ไขการ subscribe currentUser$ เพื่อป้องกัน redirect ระหว่าง registration ***
    this.authService.currentUser$.subscribe(userProfile => {
      // *** ป้องกันการ redirect ระหว่าง submit ***
      if (this.isSubmitting) {
        console.log('[RegisterComponent] Ignoring currentUser$ change during submission');
        return;
      }
  
      // เติมข้อมูลอัตโนมัติให้ Google flow หลัง refresh
      if (this.isFromGoogle && userProfile) {
        if (userProfile.displayName) {
          this.registerForm.get('fullName')?.setValue(userProfile.displayName);
        }
        if (userProfile.email) {
          this.registerForm.get('email')?.setValue(userProfile.email);
        }
        if (userProfile.photoURL) {
          this.photoURL = userProfile.photoURL;
        }
      }
  
      if (userProfile && !userProfile.needsProfileSetup) {
        const expectedDashboard = userProfile.memberType === 'owner' ? '/owner' : '/main';
        if (!this.router.url.startsWith(expectedDashboard) &&
          !this.router.url.startsWith('/login') &&
          !this.router.url.startsWith('/register')) {
          console.log('[RegisterComponent] Auto-redirecting to dashboard:', expectedDashboard);
          this.router.navigate([expectedDashboard]);
        }
      } else if (userProfile && userProfile.needsProfileSetup && !this.isFromGoogle) {
        // Auto-populate ข้อมูลจาก userProfile ถ้ามี (เฉพาะเมื่อไม่ใช่ Google OAuth)
        if (userProfile.displayName) {
          this.registerForm.get('fullName')?.setValue(userProfile.displayName);
        }
        if (userProfile.email) {
          this.registerForm.get('email')?.setValue(userProfile.email);
        }
        if (userProfile.photoURL) {
          this.photoURL = userProfile.photoURL;
        }
  
        // *** เฉพาะกรณีนี้เท่านั้นที่ navigate ไป register ***
        if (!this.router.url.startsWith('/register')) {
          console.log('[RegisterComponent] User needs profile setup, staying on register page');
          this.router.navigate(['/register', userProfile.memberType || 'member']);
        }
      }
    });

    // โหลดโซนก่อน
    this.loadZones();
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
      console.log('[RegisterComponent] Loaded dormitories:', this.dormList);
      
      // Group dormitories by zone
      this.updateGroupedDorms(dormitories);
      
      // Initialize filteredDorms with all loaded dormitories
      this.filteredDorms = [...this.groupedDorms];
    } catch (error) {
      console.error('[RegisterComponent] Error loading dormitories:', error);
      // คงค่า dormList เดิมไว้เป็น fallback หรือใช้ข้อมูลจำลองถ้าจำเป็น
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
    
    console.log('[RegisterComponent] Grouped dormitories:', this.groupedDorms);
  }

  // เพิ่ม method สำหรับ populate ข้อมูล Google
  private populateGoogleData(state: any): void {
    this.isFromGoogle = true;
    if (state.userType) this.userType = state.userType;

    // ใช้ setTimeout เพื่อให้ form initialize เสร็จก่อน
    setTimeout(() => {
      if (state.fullName) {
        this.registerForm.get('fullName')?.setValue(state.fullName);
        console.log('[RegisterComponent] Auto-filled fullName:', state.fullName);
      }
      if (state.email) {
        this.registerForm.get('email')?.setValue(state.email);
        console.log('[RegisterComponent] Auto-filled email:', state.email);
      }
      if (state.photoURL) {
        this.photoURL = state.photoURL;
        console.log('[RegisterComponent] Auto-filled photoURL:', state.photoURL);
      }
      this.updateFormValidation();
      this.isInitializing = false; // ปิด initializing flag เมื่อเสร็จ
    }, 100);
  }

  // แก้ไข getPageTitle() method
  getPageTitle(): string {
    if (this.isInitializing || this.isNavigating) {
      return 'กำลังโหลด...';
    }
    return this.userType === 'owner' ? 'สมัครสมาชิกสำหรับเจ้าของหอพัก' : 'สมัครสมาชิกสำหรับสมาชิก';
  }

  // แก้ไข getPageDescription() method
  getPageDescription(): string {
    if (this.isInitializing || this.isNavigating) {
      return 'กำลังเตรียมข้อมูล...';
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
  }

  private updateFormValidation() {
    console.log('[RegisterComponent] updateFormValidation called with:', {
      userType: this.userType,
      isFromGoogle: this.isFromGoogle
    });

    const businessFields = ['businessName', 'businessAddress', 'businessRegistration'];
    businessFields.forEach(field => {
      const control = this.registerForm.get(field);
      if (control) {
        control.clearValidators();
        control.updateValueAndValidity();
      }
    });

    // Update phoneNumber validation based on userType
    const phoneNumberControl = this.registerForm.get('phoneNumber');
    if (phoneNumberControl) {
      if (this.userType === 'member') {
        // For members, phoneNumber is required
        phoneNumberControl.setValidators([Validators.required, Validators.pattern('^[0-9]{10}$')]);
      } else {
        // For owners, phoneNumber is optional but must be valid if provided
        phoneNumberControl.setValidators([Validators.pattern('^[0-9]{10}$')]);
      }
      phoneNumberControl.updateValueAndValidity();
    }

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

    const passwordControl = this.registerForm.get('password');
    const confirmPasswordControl = this.registerForm.get('confirmPassword');

    if (this.isFromGoogle) {
      passwordControl?.clearValidators();
      passwordControl?.disable();
      confirmPasswordControl?.clearValidators();
      confirmPasswordControl?.disable();
      this.registerForm.get('email')?.disable();
      this.registerForm.get('fullName')?.disable();
      console.log('[RegisterComponent] Password fields and basic fields disabled for Google OAuth');
    } else {
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      passwordControl?.enable();
      confirmPasswordControl?.setValidators([Validators.required]);
      confirmPasswordControl?.enable();
      this.registerForm.get('email')?.enable();
      this.registerForm.get('fullName')?.enable();
      console.log('[RegisterComponent] Password fields and basic fields enabled for regular signup');
    }

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
      return 'กรุณากรอกข้อมูล';
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
    if (controlName === 'phoneNumber' && control.hasError('pattern')) {
      return 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก)';
    }
    return '';
  }

  async onSubmit(): Promise<void> {
    if (this.isRegisterLoading) return;
  
    // *** เซ็ต flag ป้องกันการเปลี่ยน userType ***
    this.isSubmitting = true;
    this.isRegisterLoading = true;
    this.errorMessage = null;
  
    console.log('[RegisterComponent] onSubmit called with:', {
      userType: this.userType,
      isFromGoogle: this.isFromGoogle,
      formValid: this.registerForm.valid
    });
  
    if (this.userType === 'general') {
      this.errorMessage = 'กรุณาเลือกประเภทสมาชิก (เจ้าของหอพัก หรือ สมาชิก)';
      this.isRegisterLoading = false;
      this.isSubmitting = false; // รีเซ็ต flag
      return;
    }
  
    // *** เฉพาะ member เท่านั้นที่ต้องเลือกหอพัก ***
    if (this.userType === 'member') {
      const dormValue = this.registerForm.get('dormitory')?.value;
      if (!dormValue || dormValue === '') {
        this.errorMessage = 'กรุณาเลือกหอพัก';
        this.registerForm.get('dormitory')?.markAsTouched();
        this.isRegisterLoading = false;
        this.isSubmitting = false; // รีเซ็ต flag
        return;
      }
    }
  
    const wasEmailDisabled = this.registerForm.get('email')?.disabled;
    const wasFullNameDisabled = this.registerForm.get('fullName')?.disabled;
    const wasPasswordDisabled = this.registerForm.get('password')?.disabled;
    const wasConfirmPasswordDisabled = this.registerForm.get('confirmPassword')?.disabled;
  
    if (this.isFromGoogle) {
      this.registerForm.get('email')?.enable();
      this.registerForm.get('fullName')?.enable();
    } else {
      this.registerForm.get('password')?.enable();
      this.registerForm.get('confirmPassword')?.enable();
    }
  
    this.registerForm.updateValueAndValidity();
  
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง';
      this.restoreFieldsDisabledState(wasEmailDisabled, wasFullNameDisabled, wasPasswordDisabled, wasConfirmPasswordDisabled);
      this.isRegisterLoading = false;
      this.isSubmitting = false; // รีเซ็ต flag
      return;
    }
  
    try {
      const formData = this.registerForm.getRawValue();
      let userProfile: UserProfile;
  
      // *** เก็บ userType ไว้ในตัวแปร local ป้องกันการเปลี่ยน ***
      const currentUserType = this.userType;
  
      if (this.isFromGoogle) {
        console.log('[RegisterComponent] Completing Google OAuth profile');
        
        // *** สำหรับ owner ไม่ต้องกรอกข้อมูลเพิ่มเติม ***
        if (currentUserType === 'owner') {
          console.log('[RegisterComponent] Owner type - completing profile without additional data');
          
          // สำหรับ owner ส่ง undefined สำหรับ phoneNumber ที่ไม่จำเป็น
          userProfile = await this.authService.completeUserProfile(
            formData.phoneNumber || undefined, // ส่ง undefined ถ้าไม่มีค่า
            currentUserType as 'member' | 'owner',
            undefined // owner ไม่ต้องมี dormitoryId
          );
        } else {
          // *** สำหรับ member ต้องเลือกหอพัก ***
          console.log('[RegisterComponent] dormitory value:', formData.dormitory, typeof formData.dormitory);
          const dormitoryId = formData.dormitory ? parseInt(formData.dormitory, 10) : undefined;
          console.log('[RegisterComponent] dormitoryId to send:', dormitoryId);
          
          userProfile = await this.authService.completeUserProfile(
            formData.phoneNumber,
            currentUserType as 'member' | 'owner',
            dormitoryId
          );
        }
        
        this.receivedUsername = userProfile?.username || null;
        console.log('[RegisterComponent] Google user profile completed successfully');
      } else {
        console.log('[RegisterComponent] Regular signup process');
        const submitFormData = new FormData();
        submitFormData.append('email', formData.email);
        submitFormData.append('password', formData.password);
        
        // ส่ง memberType ให้ backend ตามสเปคใหม่
        console.log('[RegisterComponent] Appending memberType:', currentUserType);
        submitFormData.append('memberType', currentUserType);
        
        submitFormData.append('fullName', formData.fullName);
        
        // ส่ง phoneNumber เฉพาะเมื่อมีค่า
        if (formData.phoneNumber) {
        submitFormData.append('phoneNumber', formData.phoneNumber);
        }
        
        if (currentUserType === 'member' && formData.dormitory) {
          // *** แก้ไข: ส่ง dormitoryId ที่ถูกต้อง ***
          submitFormData.append('dormitoryId', formData.dormitory);
        }
        
        if (this.selectedFile) submitFormData.append('profileImage', this.selectedFile);
        
        userProfile = await this.authService.signUpWithFormData(submitFormData);
      }
  
      // รอให้ auth state update เสร็จ
      await new Promise(resolve => setTimeout(resolve, 200));
  
      // *** อัปเดต userType ใน component หากจำเป็น ***
      if (userProfile.memberType && userProfile.memberType !== currentUserType) {
        console.log('[RegisterComponent] Updating userType from', currentUserType, 'to', userProfile.memberType);
        this.userType = userProfile.memberType;
      }
  
      // *** Navigate ตรงไปยัง dashboard ทันที ***
      const targetRoute = userProfile.memberType === 'owner' ? '/owner' : '/main';
      console.log('[RegisterComponent] Navigating to:', targetRoute, 'based on memberType:', userProfile.memberType);
      
      await this.router.navigate([targetRoute]);
      return;
    } catch (error: any) {
      console.error('[RegisterComponent] Registration error:', error);
      const errorMsg = this.authService.errorMessageHandler(error);
      if (errorMsg === 'อีเมลนี้ถูกใช้งานแล้ว') {
        this.registerForm.get('email')?.setErrors({ emailInUse: true });
        this.errorMessage = errorMsg;
      } else {
        this.errorMessage = errorMsg || 'เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองอีกครั้ง';
      }
      // Sign out เมื่อเกิดข้อผิดพลาด
      await this.authService.signOut(null);
    } finally {
      this.isRegisterLoading = false;
      this.isSubmitting = false; // *** รีเซ็ต flag ***
      this.restoreFieldsDisabledState(wasEmailDisabled, wasFullNameDisabled, wasPasswordDisabled, wasConfirmPasswordDisabled);
    }
  }

  private restoreFieldsDisabledState(
    wasEmailDisabled: boolean | undefined,
    wasFullNameDisabled: boolean | undefined,
    wasPasswordDisabled: boolean | undefined,
    wasConfirmPasswordDisabled: boolean | undefined
  ): void {
    if (this.isFromGoogle) {
      if (wasEmailDisabled) this.registerForm.get('email')?.disable();
      if (wasFullNameDisabled) this.registerForm.get('fullName')?.disable();
      if (wasPasswordDisabled) this.registerForm.get('password')?.disable();
      if (wasConfirmPasswordDisabled) this.registerForm.get('confirmPassword')?.disable();
    }
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

      console.log(`[RegisterComponent] Initiating Google OAuth for ${targetUserType}`);

      // Using popup directly - will either complete profile setup or redirect based on result
      const userProfile = await this.authService.signInWithGoogle(targetUserType);
      console.log('[RegisterComponent] Google sign-in successful:', userProfile);

      // Navigation is handled in the authService

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
      return;
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
      console.error('[RegisterComponent] Error loading zones:', error);
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
}