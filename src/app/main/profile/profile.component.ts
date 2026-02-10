import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { filter } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FormsModule } from '@angular/forms';
import { DormitoryService, Dorm } from '../../services/dormitory.service';
import { RegisterService, DormitoryOption } from '../../services/register.service';

// Add interface for grouped dormitories
interface ZoneDormitories {
  id: string;
  name: string;
  dormitories: { id: string; name: string }[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  userType: 'member' | 'owner' = 'member';
  isEditMode = false;
  isSaving = false;
  passwordError: string = '';

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
    managerName: '',
    secondaryPhone: '',
    lineId: '',
    password: '',
    confirmPassword: '',
    dormId: '',
  };

  // ข้อมูลหอพักที่เลือกได้ (สำหรับ Member)
  availableDorms: Dorm[] = [];

  // Properties สำหรับ searchable dropdown
  dormSearchText: string = '';
  showDormList: boolean = false;
  isLoadingDorms: boolean = false;
  groupedDorms: ZoneDormitories[] = [];
  filteredDorms: ZoneDormitories[] = [];

  private subscription: any;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private dormitoryService: DormitoryService,
    private registerService: RegisterService
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

  // Helper method to get user avatar URL with fallback based on user type
  getUserAvatarUrl(): string {
    // ถ้ามีรูปโปรไฟล์จาก photoURL ให้ใช้รูปนั้น
    if (this.currentUser?.photoURL) {
      return this.currentUser.photoURL;
    }
    
    // ถ้าไม่มีรูป ให้ใช้อวาตาร์เริ่มต้นตามประเภทผู้ใช้
    if (this.isOwner) {
      // เจ้าของหอพักใช้ home-owner.png
      return 'assets/icon/home-owner.png';
    } else {
      // สมาชิก/ผู้รีวิวใช้ cat avatar.jpg
      return 'assets/icon/cat avatar.jpg';
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
      this.passwordError = '';
    } else {
      this.isEditMode = true;
      this.loadEditForm();
    }
  }

  loadEditForm() {
    if (this.currentUser) {
      // ถ้าผู้ใช้กำลังอยู่ในโหมดแก้ไข ให้คงค่า dormId ที่เลือกไว้
      const currentDormId = this.isEditMode ? this.editForm.dormId : '';
      
      // ตั้งค่าเริ่มต้นเฉพาะเมื่อมีหอพักปัจจุบันหรือหอพักที่รออนุมัติ
      let selectedDormId = '';
      if (currentDormId) {
        selectedDormId = currentDormId;
      } else if (this.currentUser.residenceDormId != null) {
        selectedDormId = String(this.currentUser.residenceDormId);
      } else if (this.currentUser.pendingDormId != null) {
        selectedDormId = String(this.currentUser.pendingDormId);
      }
      // ถ้าไม่มีหอพักเลย ให้ selectedDormId เป็นค่าว่าง (แสดง placeholder)

      this.editForm = {
        username: this.currentUser.username || '',
        displayName: this.currentUser.displayName || '',
        email: this.currentUser.email || '',
        phoneNumber: this.currentUser.phoneNumber || '',
        managerName: this.currentUser.managerName || '',
        secondaryPhone: this.currentUser.secondaryPhone || '',
        lineId: this.currentUser.lineId || '',
        password: '',
        confirmPassword: '',
        dormId: selectedDormId,
      };

      // Set dorm search text to show current dorm name
      if (selectedDormId) {
        this.dormSearchText = this.getDormName(selectedDormId);
      } else {
        this.dormSearchText = '';
      }
    }
  }

  resetEditForm() {
    // ถ้าไม่มีหอพักปัจจุบันหรือหอพักที่รออนุมัติ ให้รีเซ็ตเป็นค่าว่าง
    const hasCurrentDorm = this.currentUser?.residenceDormId != null;
    const hasPendingDorm = this.currentUser?.pendingDormId != null;
    const selectedDormId = (hasCurrentDorm || hasPendingDorm) ? this.editForm.dormId : '';
    
    this.editForm = {
      username: '',
      displayName: '',
      email: '',
      phoneNumber: '',
      managerName: '',
      secondaryPhone: '',
      lineId: '',
      password: '',
      confirmPassword: '',
      dormId: selectedDormId,
    };

    // Reset dorm search text
    if (selectedDormId) {
      this.dormSearchText = this.getDormName(selectedDormId);
    } else {
      this.dormSearchText = '';
    }
    
    // Close dropdown
    this.showDormList = false;
  }

  // โหลดข้อมูลหอพักที่มีอยู่
  loadAvailableDorms() {
    this.isLoadingDorms = true;
    this.registerService.getDormitoryOptions().then((dormitories) => {
      // Group dormitories by zone
      this.updateGroupedDorms(dormitories);
      
      // Initialize filteredDorms with all loaded dormitories
      this.filteredDorms = [...this.groupedDorms];
      
      // Also load to availableDorms for backward compatibility
      this.availableDorms = dormitories.map(d => ({
        dorm_id: d.dorm_id,
        dorm_name: d.dorm_name,
        zone_id: d.zone_id,
        zone_name: d.zone_name,
        main_image_url: '',
        thumbnail_url: '',
        price_range: '',
        rating: 0,
        review_count: 0,
        distance: 0,
        latitude: 0,
        longitude: 0,
        address: '',
        description: '',
        facilities: [],
        contact_phone: '',
        contact_line: '',
        is_active: true,
        created_at: '',
        updated_at: ''
      }));
      
      this.isLoadingDorms = false;
    }).catch((error) => {
      console.error('Error loading dorms:', error);
      this.availableDorms = [];
      this.groupedDorms = [];
      this.filteredDorms = [];
      this.isLoadingDorms = false;
    });
  }

  // Add method to group dormitories by zone
  private updateGroupedDorms(dormitories: DormitoryOption[]): void {
    // Group dormitories by zone_name
    const zoneMap = new Map<
      string,
      { id: string; dormitories: { id: string; name: string }[] }
    >();

    // First, create a map of zones
    dormitories.forEach((dorm) => {
      const zoneName = dorm.zone_name || 'อื่นๆ';
      if (!zoneMap.has(zoneName)) {
        zoneMap.set(zoneName, {
          id: dorm.zone_id?.toString() || '',
          dormitories: [],
        });
      }

      // Add this dorm to its zone group
      zoneMap.get(zoneName)?.dormitories.push({
        id: dorm.dorm_id.toString(),
        name: dorm.dorm_name,
      });
    });

    // Convert map to array
    this.groupedDorms = Array.from(zoneMap.entries()).map(([name, data]) => ({
      id: data.id,
      name: name,
      dormitories: data.dormitories,
    }));
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

  // ตรวจสอบว่าหอพักนี้เป็นหอที่รออนุมัติหรือไม่
  isPendingDorm(dormId: string): boolean {
    const pendingId = this.currentUser?.pendingDormId;
    return String(pendingId ?? '') === String(dormId ?? '');
  }

  // ตรวจสอบว่าหอพักนี้ควรถูก disable หรือไม่ (หอปัจจุบัน หรือ หอที่รออนุมัติ)
  shouldDisableDorm(dormId: string): boolean {
    const isCurrent = this.isCurrentDorm(dormId);
    const isPending = this.isPendingDorm(dormId);
    return isCurrent || isPending;
  }

  // ดึงข้อความสถานะหอพัก
  getDormStatusText(dormId: string): string {
    if (this.isCurrentDorm(dormId)) {
      return 'หอปัจจุบัน';
    }
    if (this.isPendingDorm(dormId)) {
      return 'รออนุมัติ';
    }
    return '';
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
      // ไม่อัปเดต residence_dorm_id ทันที ตามเงื่อนไขของระบบ
    } catch (err) {
      console.error('Failed to request change dormitory', err);
    } finally {
      this.isSaving = false;
    }
  }

  saveProfile() {
    
    this.isSaving = true;
    this.passwordError = '';

    // ถ้าผู้ใช้กรอกรหัสผ่านใหม่ ให้ตรวจสอบความถูกต้อง
    if (this.editForm.password || this.editForm.confirmPassword) {
      if (this.editForm.password !== this.editForm.confirmPassword) {
        this.passwordError = 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน';
        this.isSaving = false;
        return;
      }
      // นโยบาย: อย่างน้อย 10 ตัวอักษร และมีตัวพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และสัญลักษณ์
      const pwd = this.editForm.password || '';
      const hasMinLen = pwd.length >= 10;
      const hasUpper = /[A-Z]/.test(pwd);
      const hasLower = /[a-z]/.test(pwd);
      const hasNumber = /[0-9]/.test(pwd);
      const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
      if (!(hasMinLen && hasUpper && hasLower && hasNumber && hasSymbol)) {
        this.passwordError = 'รหัสผ่านต้องยาวอย่างน้อย 10 ตัว และมี A-Z, a-z, 0-9 และสัญลักษณ์';
        this.isSaving = false;
        return;
      }
    }
    const payload = {
      displayName: this.editForm.displayName?.trim() || undefined,
      username: this.editForm.username?.trim() || undefined,
      phone: this.editForm.phoneNumber?.trim() || undefined,
      managerName: this.isOwner ? (this.editForm.managerName?.trim() || undefined) : undefined,
      secondaryPhone: this.isOwner ? (this.editForm.secondaryPhone?.trim() || undefined) : undefined,
      lineId: this.isOwner ? (this.editForm.lineId?.trim() || undefined) : undefined,
    };

    const doUpdateProfile = async () => {
      // เปลี่ยนรหัสผ่านก่อน (ถ้ามี)
      if (this.editForm.password) {
        try {
          await this.authService.changePassword(this.editForm.password);
        } catch (err: any) {
          console.error('Change password failed', err);
          const code = err?.code || '';
          if (code === 'auth/requires-recent-login') {
            this.passwordError = 'ต้องเข้าสู่ระบบใหม่เพื่อเปลี่ยนรหัสผ่าน กรุณาออกจากระบบแล้วเข้าสู่ระบบอีกครั้ง';
          } else if (code === 'auth/weak-password') {
            this.passwordError = 'รหัสผ่านไม่ปลอดภัย กรุณาตรวจสอบนโยบายรหัสผ่านอีกครั้ง';
          } else {
            this.passwordError = 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง';
          }
          throw err;
        }
      }

      await this.authService.updateProfile(payload);
      
      // หากสมาชิกเลือกหอใหม่ที่ไม่ใช่หอปัจจุบัน ให้ยื่นคำขอย้ายหอ
      if (this.isMember && this.editForm.dormId && !this.isCurrentDorm(String(this.editForm.dormId))) {
        const targetId = Number(this.editForm.dormId);
        if (!isNaN(targetId)) {
          try {
            const res: any = await this.authService.requestChangeDormitory(targetId);
            this.pendingChangeDormName = res?.new_dorm_name || this.getDormName(targetId);
          } catch (e) {
            console.error('Request change dormitory failed', e);
          }
        }
      }
      
      // Reload profile from backend AFTER handling dormitory change
      const firebaseUser = (await import('@angular/fire/auth')).getAuth()
        .currentUser;
      if (firebaseUser) {
        const refreshed = await this.authService.fetchUserProfile(firebaseUser);
        this.authService.updateCurrentUser(refreshed);
      }
      
      // ไม่ปิดโหมดแก้ไขทันที ให้รอให้ข้อมูลอัปเดตเสร็จก่อน
      // this.isEditMode = false; // ย้ายไปไว้ในส่วนท้าย
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
        // 4) ปิดโหมดแก้ไขหลังจากบันทึกเสร็จ
        this.isEditMode = false;
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

  // Add method to handle real-time search input
  onDormSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.dormSearchText = target.value;
    this.filterDorms();
  }

  // Add method to filter dormitories based on search text
  filterDorms(): void {
    const searchText = this.dormSearchText?.toLowerCase() || '';

    if (!searchText) {
      this.filteredDorms = [...this.groupedDorms];
      return;
    }

    // Filter zones and dormitories that match the search text
    this.filteredDorms = this.groupedDorms
      .map((zone) => {
        // First check if zone name matches
        const zoneMatches = zone.name.toLowerCase().includes(searchText);

        // Then filter dormitories
        const matchingDorms = zone.dormitories.filter((dorm) =>
          dorm.name.toLowerCase().includes(searchText)
        );

        // Return zone with matching dorms if either zone matches or has matching dorms
        if (zoneMatches || matchingDorms.length > 0) {
          return {
            ...zone,
            dormitories: zoneMatches ? zone.dormitories : matchingDorms,
          };
        }

        return null;
      })
      .filter((zone) => zone !== null) as ZoneDormitories[];
  }

  // Add method to select a dormitory
  selectDorm(dormId: string, dormName: string): void {
    if (this.shouldDisableDorm(dormId)) {
      return; // Don't allow selection of disabled dorms
    }
    
    this.editForm.dormId = dormId;
    this.dormSearchText = dormName;
    this.showDormList = false;
  }

  // Add document click listener to close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Check if click is outside the dropdown
    const clickedElement = event.target as HTMLElement;
    const isClickInsideDropdown = clickedElement.closest(
      '.dorm-dropdown-container'
    );

    if (!isClickInsideDropdown && this.showDormList) {
      this.showDormList = false;
    }
  }
}
