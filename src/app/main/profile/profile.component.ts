import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, UserProfile } from '../../services/auth.service';
import { filter } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FormsModule } from '@angular/forms';
import { DormitoryService, Dorm } from '../../services/dormitory.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  userType: 'member' | 'owner' = 'member';
  isEditMode = false;
  isSaving = false;

  // Modal & image upload state
  imageModalOpen = false;
  isDragOver = false;
  // รูปที่เลือกไว้ (ยังไม่อัปโหลดจนกว่าจะกดบันทึก)
  selectedImage: File | null = null;
  imagePreviewUrl: string | null = null;
  imageError: string = '';

  // แสดงสถานะคำขอย้ายหอแบบชั่วคราวหลังส่งคำขอ
  pendingChangeDormName: string | null = null;

  // ฟอร์มแก้ไข
  editForm = {
    username: '',
    displayName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    dormId: '',
  };

  // ข้อมูลหอพักที่เลือกได้ (สำหรับ Member)
  availableDorms: Dorm[] = [];

  private subscription: any;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private dormitoryService: DormitoryService
  ) {}

  ngOnInit() {
    this.route.data.subscribe((data) => {
      this.userType = data['userType'] || 'member';
    });

    this.subscription = this.authService.currentUser$
      .pipe(filter((user): user is UserProfile | null => user !== undefined))
      .subscribe((user) => {
        this.currentUser = user;
        if (user && this.isEditMode) {
          this.loadEditForm(); // Reload form if user data changes while in edit mode
        }
        // โหลดข้อมูลหอพักเมื่อมีข้อมูลผู้ใช้
        if (user && this.isMember) {
          this.loadAvailableDorms();
        }
      });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  get isOwner(): boolean {
    return (
      this.userType === 'owner' || this.currentUser?.memberType === 'owner'
    );
  }

  get isMember(): boolean {
    return (
      this.userType === 'member' || this.currentUser?.memberType === 'member'
    );
  }

  get isGoogleUser(): boolean {
    return this.currentUser?.provider === 'google';
  }

  toggleEditMode() {
    if (this.isEditMode) {
      this.isEditMode = false;
      this.resetEditForm();
    } else {
      this.isEditMode = true;
      this.loadEditForm();
    }
  }

  loadEditForm() {
    if (this.currentUser) {
      this.editForm = {
        username: this.currentUser.username || '',
        displayName: this.currentUser.displayName || '',
        email: this.currentUser.email || '',
        phoneNumber: this.currentUser.phoneNumber || '',
        password: '',
        confirmPassword: '',
        dormId: this.currentUser.residenceDormId != null ? String(this.currentUser.residenceDormId) : '',
      };
    }
  }

  resetEditForm() {
    this.editForm = {
      username: '',
      displayName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      dormId: '',
    };
  }

  // โหลดข้อมูลหอพักที่มีอยู่
  loadAvailableDorms() {
    this.dormitoryService.getAllDormitories().subscribe({
      next: (dorms) => {
        this.availableDorms = dorms;
        console.log('Loaded available dorms:', dorms);
      },
      error: (error) => {
        console.error('Error loading dorms:', error);
        this.availableDorms = [];
      },
    });
  }

  // ดึงชื่อหอพักจาก ID (รองรับทั้ง number และ string)
  getDormName(dormId: string | number | null | undefined): string {
    const key = String(dormId ?? '');
    const dorm = this.availableDorms.find((d) => String(d.dorm_id) === key);
    return dorm ? dorm.dorm_name : '';
  }

  // ตรวจสอบว่าหอพักนี้เป็นหอปัจจุบันหรือไม่
  isCurrentDorm(dormId: string): boolean {
    const currentId = this.currentUser?.residenceDormId;
    return String(currentId ?? '') === String(dormId ?? '');
  }

  // ส่งคำขอย้ายหอ (เฉพาะ Member)
  async requestChangeDormitory() {
    if (!this.isMember) return;
    const target = this.editForm.dormId ? Number(this.editForm.dormId) : NaN;
    if (!target || isNaN(target)) {
      console.warn('No target dorm selected');
      return;
    }
    if (this.isCurrentDorm(String(target))) {
      console.warn('Selected dorm is current dorm');
      return;
    }

    try {
      this.isSaving = true;
      const res = await this.authService.requestChangeDormitory(target);
      console.log('Change dorm response:', res);
      // ไม่อัปเดต residence_dorm_id ทันที ตามเงื่อนไขของระบบ
    } catch (err) {
      console.error('Failed to request change dormitory', err);
    } finally {
      this.isSaving = false;
    }
  }

  saveProfile() {
    console.log('Saving profile:', this.editForm);
    this.isSaving = true;
    const payload = {
      displayName: this.editForm.displayName?.trim() || undefined,
      username: this.editForm.username?.trim() || undefined,
      phone: this.editForm.phoneNumber?.trim() || undefined,
    };

    const doUpdateProfile = async () => {
      await this.authService.updateProfile(payload);
      // Reload profile from backend
      const firebaseUser = (await import('@angular/fire/auth')).getAuth()
        .currentUser;
      if (firebaseUser) {
        const refreshed = await this.authService.fetchUserProfile(firebaseUser);
        this.authService.updateCurrentUser(refreshed);
      }

      // หากสมาชิกเลือกหอใหม่ที่ไม่ใช่หอปัจจุบัน ให้ยื่นคำขอย้ายหอ
      if (this.isMember && this.editForm.dormId && !this.isCurrentDorm(String(this.editForm.dormId))) {
        const targetId = Number(this.editForm.dormId);
        if (!isNaN(targetId)) {
          try {
            const res: any = await this.authService.requestChangeDormitory(targetId);
            console.log('Requested change dormitory:', res);
            this.pendingChangeDormName = res?.new_dorm_name || this.getDormName(targetId);
          } catch (e) {
            console.error('Request change dormitory failed', e);
          }
        }
      }
      this.isEditMode = false;
    };

    (async () => {
      try {
        // 1) ถ้ามีรูปใหม่ ให้อัปโหลดก่อน
        if (this.selectedImage) {
          await this.authService.uploadProfileImage(this.selectedImage);
          // อัปโหลดสำเร็จ ค่อยไปอัปเดตฟิลด์อื่น
        }
        // 2) อัปเดตโปรไฟล์อื่น ๆ
        await doUpdateProfile();
        // 3) เคลียร์สถานะรูปที่เลือกไว้
        this.clearSelectedImage();
      } catch (err) {
        console.error('Failed to save profile', err);
      } finally {
        this.isSaving = false;
      }
    })();
    return;
    this.authService
      .updateProfile(payload)
      .then(async () => {})
      .catch((err) => {
        console.error('Failed to save profile', err);
      })
      .finally(() => {
        this.isSaving = false;
      });
  }

  uploadProfileImage() {
    this.openImageModal();
  }

  // --- Image modal handlers ---
  openImageModal() {
    this.imageModalOpen = true;
    this.isDragOver = false;
    this.selectedImage = null;
    if (this.imagePreviewUrl && this.imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.imagePreviewUrl = null;
    this.imageError = '';
  }

  closeImageModal() {
    this.imageModalOpen = false;
    this.isDragOver = false;
    // ไม่ล้าง selectedImage/preview ที่เลือก เพื่อคง preview ในฟอร์มจนกว่าจะบันทึกหรือยกเลิกแก้ไข
    this.imageError = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles([files[0]]);
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById(
      'profile-file-upload'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input?.files || input.files.length === 0) return;
  
    this.handleFiles([input.files[0]]);
  
    // ✅ Reset ค่า input เพื่อให้เลือกไฟล์เดิมซ้ำได้
    setTimeout(() => {
      input.value = '';
    }, 0);
  }
  

  private handleFiles(files: File[]) {
    this.imageError = '';
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      this.imageError = 'ไฟล์ที่เลือกไม่ใช่รูปภาพ';
      return;
    }
    // Limit 5MB
    if (file.size > 5 * 1024 * 1024) {
      this.imageError = 'ขนาดไฟล์เกิน 5MB';
      return;
    }
    this.selectedImage = file;
    if (this.imagePreviewUrl && this.imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.imagePreviewUrl = URL.createObjectURL(file);
  }

  confirmUploadImage() {
    if (!this.selectedImage) {
      this.imageError = 'กรุณาเลือกไฟล์รูปภาพ';
      return;
    }
    // แค่ปิดโมดัลและคงรูปที่เลือกไว้เพื่ออัปโหลดตอนกดบันทึก
    this.closeImageModal();
  }

  private clearSelectedImage() {
    if (this.imagePreviewUrl && this.imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.selectedImage = null;
    this.imagePreviewUrl = null;
  }
}
