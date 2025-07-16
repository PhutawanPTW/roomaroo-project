import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, UserProfile, DormitoryOption } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  private subscription: any;
  
  // เพิ่ม properties สำหรับแก้ไขโปรไฟล์
  isEditing = false;
  profileForm: FormGroup;
  dormitoryOptions: DormitoryOption[] = [];
  selectedFile: File | null = null;
  isUploading = false;
  isUpdating = false;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.profileForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      userType: ['member', Validators.required],
      dormitoryId: ['']
    });
  }

  ngOnInit() {
    this.subscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log('[ProfileComponent] Current user updated:', user);
      if (user) {
        this.loadDormitoryOptions();
        this.updateFormWithUserData(user);
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  // อัปเดตฟอร์มด้วยข้อมูลผู้ใช้ปัจจุบัน
  private updateFormWithUserData(user: UserProfile) {
    this.profileForm.patchValue({
      displayName: user.displayName || '',
      phoneNumber: user.phoneNumber || '',
      userType: user.memberType,
      dormitoryId: user.residenceDormId || ''
    });
    
    // อัปเดต validation ตามประเภทผู้ใช้
    this.updatePhoneNumberValidation(user.memberType);
  }

  // อัปเดต validation สำหรับเบอร์โทรศัพท์
  private updatePhoneNumberValidation(userType: 'member' | 'owner') {
    const phoneNumberControl = this.profileForm.get('phoneNumber');
    const dormitoryIdControl = this.profileForm.get('dormitoryId');
    
    if (phoneNumberControl) {
      if (userType === 'owner') {
        // สำหรับ owner เบอร์โทรไม่บังคับ
        phoneNumberControl.setValidators([Validators.pattern(/^[0-9]{10}$/)]);
      } else {
        // สำหรับ member เบอร์โทรบังคับ
        phoneNumberControl.setValidators([Validators.required, Validators.pattern(/^[0-9]{10}$/)]);
      }
      phoneNumberControl.updateValueAndValidity();
    }

    if (dormitoryIdControl) {
      if (userType === 'member') {
        // สำหรับ member หอพักบังคับ
        dormitoryIdControl.setValidators([Validators.required]);
      } else {
        // สำหรับ owner หอพักไม่บังคับ
        dormitoryIdControl.clearValidators();
      }
      dormitoryIdControl.updateValueAndValidity();
    }
  }

  // โหลดรายการหอพัก
  private async loadDormitoryOptions() {
    try {
      this.dormitoryOptions = await this.authService.getDormitoryOptions();
    } catch (error) {
      console.error('[ProfileComponent] Error loading dormitory options:', error);
    }
  }

  // เริ่มการแก้ไข
  startEditing() {
    if (!this.currentUser) {
      alert('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      return;
    }
    this.isEditing = true;
    this.updateFormWithUserData(this.currentUser);
  }

  // ยกเลิกการแก้ไข
  cancelEditing() {
    this.isEditing = false;
    this.selectedFile = null;
    
    // ล้าง input file
    const fileInput = document.getElementById('profileImage') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    this.updateFormWithUserData(this.currentUser!);
  }

  // เลือกไฟล์รูป
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // ตรวจสอบประเภทไฟล์
      if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        event.target.value = '';
        return;
      }

      // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
        event.target.value = '';
        return;
      }

      this.selectedFile = file;
      console.log('[ProfileComponent] File selected:', file.name, file.size, file.type);
    }
  }

  // จัดการการเปลี่ยนแปลงประเภทผู้ใช้
  onUserTypeChange() {
    const userType = this.profileForm.get('userType')?.value;
    this.updatePhoneNumberValidation(userType);
  }



  // บันทึกการแก้ไขโปรไฟล์
  async saveProfile() {
    // ตรวจสอบ fields ที่ใช้งานได้
    const displayNameControl = this.profileForm.get('displayName');
    const phoneNumberControl = this.profileForm.get('phoneNumber');
    const userTypeControl = this.profileForm.get('userType');
    const dormitoryIdControl = this.profileForm.get('dormitoryId');
    
    if (displayNameControl?.invalid || phoneNumberControl?.invalid || userTypeControl?.invalid || dormitoryIdControl?.invalid) {
      alert('กรุณากรอกข้อมูลให้ถูกต้อง');
      return;
    }

    if (!this.currentUser) {
      alert('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    this.isUpdating = true;
    try {
      const formValue = this.profileForm.value;
      
      // ตรวจสอบว่าชื่อที่แสดงไม่ว่าง
      if (!formValue.displayName || !formValue.displayName.trim()) {
        alert('กรุณากรอกชื่อที่แสดง');
        return;
      }

      // ตรวจสอบว่าเบอร์โทรศัพท์ไม่ว่างถ้าเป็น member
      if (formValue.userType === 'member' && !formValue.phoneNumber) {
        alert('กรุณากรอกเบอร์โทรศัพท์สำหรับผู้เช่า');
        return;
      }

      // ตรวจสอบว่าเลือกหอพักแล้วถ้าเป็น member
      if (formValue.userType === 'member' && !formValue.dormitoryId) {
        alert('กรุณาเลือกหอพักสำหรับผู้เช่า');
        return;
      }
      
      // ส่งข้อมูลและรูปไปพร้อมกัน
      await this.authService.updateProfileWithImage(
        formValue.displayName || '',
        formValue.phoneNumber || '',
        formValue.userType,
        formValue.dormitoryId,
        this.selectedFile || undefined
      );
      
      alert('บันทึกข้อมูลโปรไฟล์สำเร็จ');
      this.isEditing = false;
      this.selectedFile = null;
      
      // ล้าง input file
      const fileInput = document.getElementById('profileImage') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error: any) {
      console.error('[ProfileComponent] Error saving profile:', error);
      
      // แสดงข้อความ error ที่เฉพาะเจาะจง
      let errorMessage = this.authService.errorMessageHandler(error);
      
      if (this.selectedFile) {
        if (error.status === 500) {
          errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ กรุณาลองใหม่อีกครั้ง';
        } else if (error.status === 413) {
          errorMessage = 'ไฟล์รูปภาพมีขนาดใหญ่เกินไป กรุณาเลือกไฟล์ที่มีขนาดเล็กกว่า';
        } else if (error.status === 415) {
          errorMessage = 'รูปแบบไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์รูปภาพเท่านั้น';
        } else if (error.status === 0) {
          errorMessage = 'ไม่สามารถเชื่อมต่อกับ backend ได้ กรุณาตรวจสอบการเชื่อมต่อ';
        } else if (error.status === 404) {
          errorMessage = 'Backend ไม่รองรับการอัปโหลดรูปภาพ';
        }
      }
      
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + errorMessage);
    } finally {
      this.isUpdating = false;
    }
  }

  // เลือกหอพัก
  async selectDormitory(dormId: string) {
    try {
      await this.authService.selectCurrentDormitory(dormId);
      alert('เลือกหอพักสำเร็จ');
    } catch (error: any) {
      alert('เกิดข้อผิดพลาดในการเลือกหอพัก: ' + this.authService.errorMessageHandler(error));
    }
  }

  // ทดสอบการอัปโหลดรูป (สำหรับ debug)
  async testImageUpload() {
    if (!this.selectedFile) {
      alert('กรุณาเลือกไฟล์รูปภาพก่อน');
      return;
    }

    try {
      console.log('[ProfileComponent] Testing image upload...');
      const imageUrl = await this.authService.uploadProfileImage(this.selectedFile);
      console.log('[ProfileComponent] Image upload successful:', imageUrl);
      
      if (imageUrl.includes('placeholder.com')) {
        alert('อัปโหลดรูปสำเร็จ (ใช้ URL จำลอง): ' + imageUrl + '\n\nหมายเหตุ: Backend ไม่รองรับการอัปโหลดรูป จึงใช้ URL จำลองแทน');
      } else {
        alert('อัปโหลดรูปสำเร็จ: ' + imageUrl);
      }
    } catch (error: any) {
      console.error('[ProfileComponent] Image upload failed:', error);
      
      let errorMessage = this.authService.errorMessageHandler(error);
      if (error.status === 0) {
        errorMessage = 'ไม่สามารถเชื่อมต่อกับ backend ได้ กรุณาตรวจสอบการเชื่อมต่อ';
      } else if (error.status === 404) {
        errorMessage = 'Backend ไม่รองรับการอัปโหลดรูปภาพ';
      }
      
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูป: ' + errorMessage);
    }
  }
}
