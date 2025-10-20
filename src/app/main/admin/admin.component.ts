import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, Inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { AdminProfile, AdminService, Dormitory, DormitoryDetail } from '../../services/admin.service';
import { Auth } from '@angular/fire/auth';
import { signOut } from '@angular/fire/auth';
import { trigger, transition, style, animate } from '@angular/animations';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MapService } from '../../services/map.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
  animations: [
    trigger('slideCenter', [
      transition(':increment', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':decrement', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class AdminComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('previewMapContainer', { static: false }) previewMapContainer?: ElementRef;

  constructor(
    private router: Router,
    private adminService: AdminService,
    private firebaseAuth: Auth,
    private sanitizer: DomSanitizer,
    private mapService: MapService,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document
  ) {
    // ตรวจสอบข้อมูลแอดมินจาก localStorage
    this.loadAdminProfile();
  }

  ngOnInit(): void {
    this.loadDormitories();
  }

  ngAfterViewInit(): void {
    // Initialize map when component is ready - ใช้วิธีเดียวกับ dorm-add และ dorm-edit
    setTimeout(() => {
      this.initializeMap();
      this.cdr.markForCheck();
    }, 100);
  }

  ngOnDestroy(): void {
    // ทำลาย map instance เมื่อออกจาก component - ใช้วิธีเดียวกับ dorm-edit
    console.log('[Admin] ทำลายแผนที่และทำความสะอาด');
    
    try {
      this.mapService.destroyMapByContainer('preview-map');
      console.log('[Admin] ทำลายแผนที่ preview-map สำเร็จ');
    } catch (error) {
      console.log('[Admin] Map cleanup error (preview-map):', error);
    }
  }

  // --- Admin State ---
  isLoggedIn = false;
  adminName = 'Admin1';
  adminUid = '23545';

  // --- Toast Notification State ---
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  toastTimeout: any;

  // --- Toast Notification Methods ---
  showToastNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    
    // Auto hide after 3 seconds
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    this.toastTimeout = setTimeout(() => {
      this.hideToast();
    }, 3000);
  }

  hideToast(): void {
    this.showToast = false;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
  }
  adminProfile: AdminProfile | null = null;
  profileDropdownOpen = false;
  showProfileModalFlag = false;
  showImageModalFlag = false;
  selectedImageUrl = '';
  selectedImageTitle = '';
  isMobileSidebarOpen = false;

  // --- Dormitory Data ---
  dorms: Dormitory[] = [];
  filteredDorms: Dormitory[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  currentPage = 1;
  totalPages = 5;

  selectedTab: 'all' | 'รออนุมัติ' | 'review' = 'all';
  
  // Review state
  reviewingDormId: string | null = null;
  reviewDormDetail: any = null;
  isLoadingDetail = false;
  currentReviewStep: 1 | 2 = 1;
  currentImageIndex = 0;
  imageModalOpen = false;
  imageModalIndex = 0;

  // Map properties
  private previewMap: any = null;
  private mapRetryDelayMs = 1000;
  private maxMapInitAttempts = 20;
  private previewMapInitAttempts = 0;

  setTab(tab: 'all' | 'รออนุมัติ' | 'review') {
    this.selectedTab = tab;
    if (tab === 'รออนุมัติ') {
      this.loadPendingDormitories();
    } else if (tab === 'all') {
      this.filterDorms();
    }
  }

  loadDormitories(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.adminService.getAllDormitories().subscribe({
      next: (dormitories) => {
        // จัดรูปแบบวันที่จาก ISO format เป็น DD-MM-YYYY
        this.dorms = dormitories.map(dorm => ({
          ...dorm,
          submitted_date: this.formatDate(dorm.submitted_date)
        }));
        this.filteredDorms = this.dorms;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dormitories:', error);
        this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก';
        this.isLoading = false;
        // ไม่มี fallback data
      }
    });
  }

  loadPendingDormitories(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.adminService.getPendingDormitories().subscribe({
      next: (dormitories) => {
        // จัดรูปแบบวันที่จาก ISO format เป็น DD-MM-YYYY
        this.filteredDorms = dormitories.map(dorm => ({
          ...dorm,
          submitted_date: this.formatDate(dorm.submitted_date)
        }));
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading pending dormitories:', error);
        this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพักรออนุมัติ';
        this.isLoading = false;
        // Fallback to mock data if API fails
        this.filteredDorms = this.dorms.filter(dorm => dorm.approval_status === 'รออนุมัติ');
      }
    });
  }

  // loadMockData method removed - no more mock data

  filterDorms(): void {
    if (this.selectedTab === 'รออนุมัติ') {
      this.filteredDorms = this.dorms.filter(dorm => 
        dorm.approval_status === 'รออนุมัติ'
      );
    } else {
      this.filteredDorms = this.dorms;
    }
  }

  getApprovedDorms(): any[] {
    return this.dorms.filter(dorm => dorm.approval_status === 'อนุมัติ');
  }

  getPendingDorms(): any[] {
    // ถ้าเป็นแท็บรออนุมัติ ให้ใช้ filteredDorms ที่โหลดมาจาก API
    if (this.selectedTab === 'รออนุมัติ') {
      return this.filteredDorms;
    }
    // ถ้าไม่ใช่ ให้กรองจาก dorms ตามเดิม
    return this.dorms.filter(dorm => dorm.approval_status === 'รออนุมัติ');
  }


  deleteDormitory(dormId: string): void {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบหอพักนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      this.adminService.deleteDormitory(dormId).subscribe({
        next: (response) => {
          console.log('Delete dormitory response:', response);
          // อัปเดตรายการหอพัก
          this.dorms = this.dorms.filter(d => d.dorm_id !== dormId);
          this.filterDorms();
          
          // แสดง popup ตามจำนวนสมาชิก
          if (response.member_count > 0) {
            alert(`ลบหอพัก "${response.dorm_name}" และสมาชิก ${response.member_count} คนเรียบร้อยแล้ว`);
          } else {
            alert(`ลบหอพัก "${response.dorm_name}" เรียบร้อยแล้ว`);
          }
        },
        error: (error) => {
          console.error('Error deleting dormitory:', error);
          
          // ตรวจสอบว่าต้องยืนยันหรือไม่
          if (error.status === 409 && error.error?.require_confirmation) {
            const confirmMessage = error.error.confirmation_message || 
              `ยืนยันการลบหอพัก\nคุณต้องการลบหอพัก "${error.error.dorm_name}" และสมาชิก ${error.error.member_count} คน ใช่หรือไม่?`;
            
            if (confirm(confirmMessage)) {
              // ลบพร้อมสมาชิก
              this.adminService.deleteDormitory(dormId, true).subscribe({
                next: (response) => {
                  console.log('Delete dormitory with members response:', response);
                  this.dorms = this.dorms.filter(d => d.dorm_id !== dormId);
                  this.filterDorms();
                  alert(`ลบหอพัก "${response.dorm_name}" และสมาชิก ${response.member_count} คนเรียบร้อยแล้ว`);
                },
                error: (error) => {
                  console.error('Error deleting dormitory with members:', error);
                  alert('เกิดข้อผิดพลาดในการลบหอพัก: ' + (error.error?.message || 'ไม่ทราบสาเหตุ'));
                }
              });
            }
          } else {
            alert('เกิดข้อผิดพลาดในการลบหอพัก: ' + (error.error?.message || 'ไม่ทราบสาเหตุ'));
          }
        }
      });
    }
  }

  editDormitory(dormId: string): void {
    // Navigate to admin dormitory edit page
    this.router.navigate(['/admin/dorm-edit', dormId]);
  }


  reviewDormitory(dormId: string): void {
    this.reviewingDormId = dormId;
    this.selectedTab = 'review';
    this.currentReviewStep = 1;
    this.loadDormitoryDetail(dormId);
  }

  loadDormitoryDetail(dormId: string): void {
    this.isLoadingDetail = true;
    this.adminService.getDormitoryDetail(dormId).subscribe({
      next: (detail) => {
        this.reviewDormDetail = detail;
        this.isLoadingDetail = false;
        // Reinitialize map with new data - ใช้วิธีเดียวกับ dorm-edit
        this.reinitializeMap();
      },
      error: (error) => {
        console.error('Error loading dormitory detail:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก');
        this.isLoadingDetail = false;
        this.cancelReview();
      }
    });
  }

  cancelReview(): void {
    this.reviewingDormId = null;
    this.reviewDormDetail = null;
    this.selectedTab = 'รออนุมัติ';
    this.currentReviewStep = 1;
  }

  goToReviewStep(step: 1 | 2): void {
    this.currentReviewStep = step;
  }

  approveDormFromReview(): void {
    if (!this.reviewingDormId) return;
    
    if (confirm('คุณแน่ใจหรือไม่ที่จะอนุมัติหอพักนี้?')) {
      this.adminService.updateDormitoryApproval(this.reviewingDormId, 'อนุมัติ').subscribe({
        next: (response) => {
          console.log('Approve dormitory response:', response);
          this.showToastNotification('อนุมัติหอพักเรียบร้อยแล้ว', 'success');
          this.cancelReview();
          this.loadDormitories();
        },
        error: (error) => {
          console.error('Error approving dormitory:', error);
          this.showToastNotification('เกิดข้อผิดพลาดในการอนุมัติหอพัก: ' + (error.error?.message || 'ไม่ทราบสาเหตุ'), 'error');
        }
      });
    }
  }

  rejectDormFromReview(): void {
    if (!this.reviewingDormId) return;
    
    const reason = prompt('กรุณาระบุเหตุผลในการไม่อนุมัติ:');
    if (reason) {
      this.adminService.updateDormitoryApproval(this.reviewingDormId, 'ไม่อนุมัติ', reason).subscribe({
        next: (response) => {
          console.log('Reject dormitory response:', response);
          this.showToastNotification('ไม่อนุมัติหอพักเรียบร้อยแล้ว', 'success');
          this.cancelReview();
          this.loadDormitories();
        },
        error: (error) => {
          console.error('Error rejecting dormitory:', error);
          this.showToastNotification('เกิดข้อผิดพลาดในการไม่อนุมัติหอพัก: ' + (error.error?.message || 'ไม่ทราบสาเหตุ'), 'error');
        }
      });
    }
  }

  // Image carousel methods
  get prevImageIndex(): number {
    if (!this.reviewDormDetail?.images) return 0;
    return this.currentImageIndex === 0 
      ? this.reviewDormDetail.images.length - 1 
      : this.currentImageIndex - 1;
  }

  get nextImageIndex(): number {
    if (!this.reviewDormDetail?.images) return 0;
    return this.currentImageIndex === this.reviewDormDetail.images.length - 1 
      ? 0 
      : this.currentImageIndex + 1;
  }

  get hasImages(): boolean {
    return (
      Array.isArray(this.reviewDormDetail?.images) && this.reviewDormDetail.images.length > 0
    );
  }

  onPrevImage(): void {
    this.currentImageIndex = this.prevImageIndex;
  }

  onNextImage(): void {
    this.currentImageIndex = this.nextImageIndex;
  }

  openImageModalReview(index: number): void {
    this.imageModalIndex = index;
    this.imageModalOpen = true;
  }

  closeImageModalReview(): void {
    this.imageModalOpen = false;
  }

  prevModalImage(): void {
    if (!this.reviewDormDetail?.images) return;
    this.imageModalIndex = this.imageModalIndex === 0 
      ? this.reviewDormDetail.images.length - 1 
      : this.imageModalIndex - 1;
  }

  nextModalImage(): void {
    if (!this.reviewDormDetail?.images) return;
    this.imageModalIndex = this.imageModalIndex === this.reviewDormDetail.images.length - 1 
      ? 0 
      : this.imageModalIndex + 1;
  }

  formatNumberOrDash(value: number | null): string {
    return value ? value.toLocaleString('th-TH') : '-';
  }

  getPriceRangeText(): string {
    if (!this.reviewDormDetail?.dormitory) return '-';
    const { min_price, max_price } = this.reviewDormDetail.dormitory;
    
    if (!min_price && !max_price) return '-';
    if (min_price === max_price) {
      return `${min_price.toLocaleString('th-TH')} บาท/เดือน`;
    }
    return `${min_price.toLocaleString('th-TH')} - ${max_price.toLocaleString('th-TH')} บาท/เดือน`;
  }

  getAmenitiesByLocation(locationType: string): any[] {
    if (!this.reviewDormDetail?.amenities) return [];
    return this.reviewDormDetail.amenities[locationType] || [];
  }

  getAmenityIcon(amenityName: string): string {
    const iconMap: { [key: string]: string } = {
      'Wi-Fi': 'fas fa-wifi',
      'wifi': 'fas fa-wifi',
      'เครื่องปรับอากาศ': 'fas fa-snowflake',
      'แอร์': 'fas fa-snowflake',
      'เตียง': 'fas fa-bed',
      'ตู้เสื้อผ้า': 'fas fa-door-closed',
      'โต๊ะทำงาน': 'fas fa-desk',
      'เก้าอี้': 'fas fa-chair',
      'ทีวี': 'fas fa-tv',
      'ตู้เย็น': 'fas fa-temperature-low',
      'เครื่องทำน้ำอุ่น': 'fas fa-shower',
      'ห้องน้ำในตัว': 'fas fa-bath',
      'ระเบียง': 'fas fa-door-open',
      'กล้องวงจรปิด': 'fas fa-video',
      'CCTV': 'fas fa-video',
      'ที่จอดรถ': 'fas fa-parking',
      'ลิฟต์': 'fas fa-elevator',
      'ระบบรักษาความปลอดภัย': 'fas fa-shield-alt',
      'ห้องซักรีด': 'fas fa-tshirt',
      'เครื่องซักผ้า': 'fas fa-tshirt',
      'ร้านสะดวกซื้อ': 'fas fa-store',
      'ฟิตเนส': 'fas fa-dumbbell',
      'สระว่ายน้ำ': 'fas fa-swimming-pool',
      'สวน': 'fas fa-tree',
      'ห้องรับแขก': 'fas fa-couch',
      'คีย์การ์ด': 'fas fa-key',
      'ตู้ไปรษณีย์': 'fas fa-mailbox',
      'อินเทอร์เน็ต': 'fas fa-globe',
      'พัดลม': 'fas fa-fan'
    };

    // ค้นหาไอคอนที่ตรงกับชื่อสิ่งอำนวยความสะดวก
    const lowerName = amenityName.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key.toLowerCase())) {
        return icon;
      }
    }

    // ถ้าไม่เจอให้ใช้ไอคอนเริ่มต้น
    return 'fas fa-check-circle';
  }

  getSpecificAmenityIcon(amenityName: string): boolean {
    const specificAmenities = [
      'โต๊ะแป้ง', 'แอร์', 'เครื่องปรับอากาศ', 'พัดลม', 'ทีวี', 'ตู้เย็น', 'เตียง', 
      'Wi-Fi', 'wifi', 'ตู้เสื้อผ้า', 'โต๊ะทำงาน', 'ไมโครเวฟ', 'เครื่องทำน้ำอุ่น', 
      'อ่างล้างหน้า', 'กล้องวงจรปิด', 'CCTV', 'รักษาความปลอดภัย', 'ลิฟต์', 
      'ที่จอดรถ', 'ฟิตเนส', 'ห้องรับแขก', 'ตู้น้ำดื่ม', 'สระว่ายน้ำ', 'ชั้นวางพัสดุ', 
      'อนุญาตสัตว์เลี้ยง', 'คีย์การ์ด', 'เครื่องซักผ้า'
    ];
    
    return specificAmenities.some(amenity => 
      amenityName.toLowerCase().includes(amenity.toLowerCase())
    );
  }

  getMapUrl(): SafeResourceUrl | null {
    if (!this.reviewDormDetail?.dormitory) return null;
    const { latitude, longitude } = this.reviewDormDetail.dormitory;
    
    const url = `https://www.google.com/maps?q=${latitude},${longitude}&hl=th&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  loadAdminProfile(): void {
    const adminProfileStr = localStorage.getItem('adminProfile');
    if (adminProfileStr) {
      try {
        this.adminProfile = JSON.parse(adminProfileStr);
        this.isLoggedIn = true;
        this.adminName = this.adminProfile?.displayName || this.adminProfile?.username || 'Admin1';
        this.adminUid = this.adminProfile?.username || '23545';
      } catch (error) {
        console.error('Error parsing admin profile:', error);
        this.redirectToLogin();
      }
    } else {
      this.redirectToLogin();
    }
  }

  onImageError(event: any): void {
    // ถ้ารูปไม่โหลดได้ ให้ใช้รูป default
    event.target.src = 'assets/images/photo.png';
  }

  redirectToLogin(): void {
    this.router.navigate(['/admin/login']);
  }

  getHomeLink(): string | any[] {
    return ['/'];
  }

  // --- Dropdown Functions ---
  toggleProfileDropdown(): void {
    this.profileDropdownOpen = !this.profileDropdownOpen;
  }

  closeProfileDropdown(): void {
    this.profileDropdownOpen = false;
  }

  // --- Mobile Sidebar ---
  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }


  async onLogout(): Promise<void> {
    this.closeProfileDropdown();
    
    try {
      // Sign out จาก Firebase Auth
      await signOut(this.firebaseAuth);
    } catch (error) {
      console.error('Firebase sign out error:', error);
    }
    
    // ลบข้อมูล admin และ Firebase token จาก localStorage
    localStorage.removeItem('adminProfile');
    localStorage.removeItem('firebaseToken');
    
    // Redirect ไปหน้า login
    this.router.navigate(['/admin/login']);
  }

  // --- Modal Functions ---
  showProfileModal(event: Event): void {
    event.stopPropagation();
    this.showProfileModalFlag = true;
  }

  closeProfileModal(): void {
    this.showProfileModalFlag = false;
  }

  showImageModal(imageUrl: string, title: string): void {
    this.selectedImageUrl = imageUrl;
    this.selectedImageTitle = title;
    this.showImageModalFlag = true;
  }

  closeImageModal(): void {
    this.showImageModalFlag = false;
    this.selectedImageUrl = '';
    this.selectedImageTitle = '';
  }

  // --- Helper Functions ---
  getPendingCount(): number {
    return this.dorms.filter(dorm => dorm.approval_status === 'รออนุมัติ').length;
  }

  getApprovedCount(): number {
    return this.dorms.filter(dorm => dorm.approval_status === 'อนุมัติ').length;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'อนุมัติ':
        return 'bg-green-100 text-green-800';
      case 'รออนุมัติ':
        return 'bg-yellow-100 text-yellow-800';
      case 'ไม่อนุมัติ':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // ปุ่มใน header (กรณียังไม่ล็อกอิน)
  goLogin() {
    this.router.navigate(['/admin/login']);
  }

  // จัดรูปแบบวันที่จาก ISO format เป็น DD-MM-YYYY
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original string if formatting fails
    }
  }

  // Map initialization methods - ใช้วิธีเดียวกับ dorm-add และ dorm-edit
  private initializeMap(): void {
    if (this.reviewDormDetail?.dormitory?.latitude && this.reviewDormDetail?.dormitory?.longitude) {
      this.initializePreviewMap();
    }
  }

  private initializePreviewMap(): void {
    if (!this.reviewDormDetail?.dormitory?.latitude || !this.reviewDormDetail?.dormitory?.longitude) {
      return;
    }

    // ตรวจสอบว่าแมปถูกสร้างแล้วหรือไม่ - ใช้วิธีเดียวกับ dorm-add และ dorm-edit
    if (this.mapService.isMapInitialized('preview-map')) {
      console.log('[Admin] แผนที่ preview-map มีอยู่แล้ว');
      return;
    }

    try {
      console.log('[Admin] กำลังสร้างแผนที่ตัวอย่าง...');
      
      const lat = this.reviewDormDetail.dormitory.latitude;
      const lng = this.reviewDormDetail.dormitory.longitude;
      const dormName = this.reviewDormDetail.dormitory.dorm_name;
      const address = this.reviewDormDetail.dormitory.address;
      
      // ใช้วิธีเดียวกับ dorm-add และ dorm-edit
      this.mapService.initializeMap('preview-map', lat, lng, dormName, address);
      
      console.log('[Admin] แผนที่ตัวอย่างสร้างสำเร็จ');
      
    } catch (error) {
      console.error('[Admin] Preview map initialization error:', error);
      this.previewMapInitAttempts++;
      
      if (this.previewMapInitAttempts < this.maxMapInitAttempts) {
        setTimeout(() => this.initializePreviewMap(), this.mapRetryDelayMs);
      }
    }
  }

  // Method to reinitialize map when review data changes - ใช้วิธีเดียวกับ dorm-edit
  public reinitializeMap(): void {
    console.log('[Admin] กำลังสร้างแผนที่ใหม่...');
    
    // ทำลายแผนที่เดิมก่อน - ใช้วิธีเดียวกับ dorm-edit
    try {
      this.mapService.destroyMapByContainer('preview-map');
      console.log('[Admin] ทำลายแผนที่เดิมสำเร็จ');
    } catch (error) {
      console.log('[Admin] Error destroying old map:', error);
    }
    
    // รอสักครู่แล้วสร้างใหม่ - ใช้วิธีเดียวกับ dorm-edit
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }
}
