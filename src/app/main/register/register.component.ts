import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [ReactiveFormsModule, FormsModule, NgIf, NgFor, CommonModule],
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

  // Properties สำหรับป๊อปอัพเพิ่มรูปภาพ
  showImagePopup = false;
  selectedFile: File | null = null;
  previewImage: string | null = null;
  isImageLoading = false;
  imageError = '';

  sliderImages = [
    { src: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Modern Dormitory Building' },
    { src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Dormitory Room Interior' },
    { src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Student Common Area' },
    { src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', alt: 'Campus Dormitory View' },
  ];

  dormList = [
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
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.userType = params['type'] === 'owner' ? 'owner' : (params['type'] === 'member' ? 'member' : 'general');
      }
      this.updateFormValidation();
    });

    const nav = this.router.getCurrentNavigation();
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
        this.registerForm.get('email')?.disable();
      }
      if (state.photoURL) {
        this.photoURL = state.photoURL;
      }
      if (state.isFromGoogle) {
        this.isFromGoogle = true;
        this.registerForm.get('password')?.disable();
        this.registerForm.get('confirmPassword')?.disable();
      }
      this.updateFormValidation();
    }

    this.authService.currentUser$.subscribe(userProfile => {
      if (userProfile && !userProfile.needsProfileSetup) {
        const expectedDashboard = userProfile.memberType === 'owner' ? '/owner' : '/main/member/dashboard';
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
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  private updateFormValidation() {
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

    if (this.userType === 'general') {
      this.errorMessage = 'กรุณาเลือกประเภทสมาชิก (เจ้าของหอพัก หรือ สมาชิก)';
      this.isRegisterLoading = false;
      return;
    }

    if (!this.isFromGoogle) {
      this.registerForm.get('password')?.enable();
      this.registerForm.get('confirmPassword')?.enable();
    }
    this.registerForm.get('email')?.enable();
    this.registerForm.updateValueAndValidity();

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.isRegisterLoading = false;
      this.errorMessage = 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง';
      if (this.isFromGoogle) {
        this.registerForm.get('email')?.disable();
        this.registerForm.get('password')?.disable();
        this.registerForm.get('confirmPassword')?.disable();
      }
      return;
    }

    try {
      const formData = this.registerForm.getRawValue();
      console.log('[RegisterComponent] Starting registration process for:', {
        email: formData.email,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        userType: this.userType,
        hasImage: !!(this.selectedFile || this.previewImage),
        selectedFile: this.selectedFile ? {
          name: this.selectedFile.name,
          size: this.selectedFile.size,
          type: this.selectedFile.type
        } : null,
        previewImage: this.previewImage
      });

      if (this.isFromGoogle) {
        const userProfile = await this.authService.completeUserProfile(
          formData.phoneNumber,
          this.userType as 'member' | 'owner',
          this.userType === 'member' ? formData.dormitory : undefined
        );
        this.receivedUsername = userProfile?.username || null;
        console.log('[RegisterComponent] Google user profile completed successfully');
      } else {
        const submitFormData = new FormData();

        if (formData.email) {
          submitFormData.append('email', formData.email);
        } else {
          console.error('[RegisterComponent] Email is missing or undefined');
        }

        if (formData.password) {
          submitFormData.append('password', formData.password);
        } else {
          console.error('[RegisterComponent] Password is missing or undefined');
        }

        if (this.userType) {
          submitFormData.append('memberType', this.userType);
        } else {
          console.error('[RegisterComponent] memberType is missing or undefined');
        }

        if (formData.fullName) {
          submitFormData.append('fullName', formData.fullName);
        } else {
          console.error('[RegisterComponent] fullName is missing or undefined');
        }

        if (formData.phoneNumber) {
          submitFormData.append('phoneNumber', formData.phoneNumber);
        } else {
          console.error('[RegisterComponent] phoneNumber is missing or undefined');
        }

        if (this.userType === 'member' && formData.dormitory) {
          submitFormData.append('dormitory', formData.dormitory);
          console.log('[RegisterComponent] Adding dormitory for member:', formData.dormitory);
        }

        if (this.selectedFile) {
          submitFormData.append('profileImage', this.selectedFile);
          console.log('[RegisterComponent] ✅ Profile image file added:', {
            name: this.selectedFile.name,
            size: this.selectedFile.size,
            type: this.selectedFile.type
          });
        } else {
          console.log('[RegisterComponent] ❌ No profile image file selected');
          console.log('[RegisterComponent] Debug info:', {
            photoURL: this.photoURL,
            selectedFile: this.selectedFile,
            previewImage: this.previewImage
          });
          if (this.photoURL && this.photoURL !== 'assets/icon/Rectangle 6.png') {
            console.warn('[RegisterComponent] ⚠️ photoURL exists but no selectedFile - this might indicate an issue with image processing');
          }
        }

        await this.authService.signUpWithFormData(submitFormData);
        console.log('[RegisterComponent] Registration completed successfully');
      }
    } catch (error: any) {
      this.errorMessage = this.authService.errorMessageHandler(error);
      console.error('[RegisterComponent] Registration error:', error);
    } finally {
      this.isRegisterLoading = false;
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
      await this.authService.signInWithGoogle(this.userType === 'owner' ? 'owner' : 'member');
      console.log('[RegisterComponent] Google sign-in initiated successfully');
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user') {
        this.errorMessageGoogle = 'ยกเลิกการลงชื่อเข้าใช้ด้วย Google';
        if (this.googleErrorTimeout) clearTimeout(this.googleErrorTimeout);
        this.googleErrorTimeout = setTimeout(() => {
          this.errorMessageGoogle = null;
        }, 3000);
      } else {
        this.errorMessageGoogle = this.authService.errorMessageHandler(error);
        console.error('[RegisterComponent] Google sign-in error:', error);
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
      const reader = new FileReader();
      reader.onload = () => {
        this.photoURL = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onEditAvatar(): void {
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
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.imageError = 'กรุณาเลือกไฟล์รูปภาพเท่านั้น';
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        this.imageError = 'ขนาดไฟล์ต้องไม่เกิน 10MB';
        return;
      }

      this.selectedFile = file;
      this.imageError = '';

      // Create preview
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
      // Here you would typically upload to your storage service
      // For now, we'll just set the photoURL to the preview
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

  getPageTitle(): string {
    return this.userType === 'owner' ? 'สมัครสมาชิกสำหรับเจ้าของหอพัก' : 'สมัครสมาชิกสำหรับสมาชิก';
  }

  getPageDescription(): string {
    return this.userType === 'owner'
      ? 'สร้างบัญชีเพื่อเริ่มต้นจัดการหอพักของคุณ'
      : 'สร้างบัญชีเพื่อเริ่มต้นค้นหาหอพักที่คุณต้องการ';
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
}