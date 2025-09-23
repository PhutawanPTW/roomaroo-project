import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
  form: FormGroup;
  isSubmitting = false;
  showPassword = false;
  errorMessage: string | null = null;

  constructor(private fb: FormBuilder, private router: Router) {
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
      // TODO: Wire with real admin auth. For now, simulate success and navigate.
      await new Promise(resolve => setTimeout(resolve, 600));
      await this.router.navigate(['/admin']);
    } catch (error: any) {
      this.errorMessage = error?.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้ง';
    } finally {
      this.isSubmitting = false;
    }
  }
}


