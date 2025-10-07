import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  oobCode: string | null = null;
  userType: 'member' | 'owner' = 'member'; // เพิ่ม userType
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(10)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Get the oobCode and userType from URL parameters
    this.route.queryParams.subscribe(params => {
      this.oobCode = params['oobCode'];
      this.userType = params['userType'] || 'member'; // fallback เป็น member
      
      if (!this.oobCode) {
        this.errorMessage = 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว';
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  validatePassword(password: string): string | null {
    if (password.length < 10) {
      return 'รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร';
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return 'รหัสผ่านต้องประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และสัญลักษณ์พิเศษ';
    }

    return null;
  }

  async onSubmit(): Promise<void> {
    if (!this.resetForm.valid || !this.oobCode) {
      return;
    }

    const { newPassword } = this.resetForm.value;
    
    // Validate password strength
    const passwordError = this.validatePassword(newPassword);
    if (passwordError) {
      this.errorMessage = passwordError;
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    try {
      // First verify the reset code to get the email
      const email = await this.authService.verifyResetCode(this.oobCode);
      
      // Confirm password reset
      await this.authService.confirmResetPassword(this.oobCode, newPassword);
      
      this.successMessage = 'เปลี่ยนรหัสผ่านสำเร็จแล้ว! กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...';
      
      // Redirect to login with pre-filled email using userType from query params
      setTimeout(() => {
        const loginPath = this.userType === 'owner' ? '/login/owner' : '/login/member';
        this.router.navigate([loginPath], { 
          queryParams: { 
            email: email, 
            resetSuccess: 'true'
          }
        });
      }, 2000);
      
    } catch (error: any) {
      console.error('[ResetPasswordComponent] Reset password error:', error);
      
      if (error.code === 'auth/expired-action-code') {
        this.errorMessage = 'ลิงก์รีเซ็ตรหัสผ่านหมดอายุแล้ว กรุณาขอลิงก์ใหม่';
      } else if (error.code === 'auth/invalid-action-code') {
        this.errorMessage = 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง';
      } else {
        this.errorMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      }
    } finally {
      this.isLoading = false;
    }
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async goToLogin(): Promise<void> {
    // Try to get user type if we have oobCode
    if (this.oobCode) {
      try {
        const email = await this.authService.verifyResetCode(this.oobCode);
        const loginPath = this.userType === 'owner' ? '/login/owner' : '/login/member';
        console.log(`[ResetPasswordComponent] Redirecting to ${loginPath} for user type: ${this.userType}`);
        this.router.navigate([loginPath]);
        return;
      } catch (error) {
        console.log('[ResetPasswordComponent] Could not verify reset code, defaulting to member login');
      }
    }
    
    // Fallback to member login
    this.router.navigate(['/login/member']);
  }
}