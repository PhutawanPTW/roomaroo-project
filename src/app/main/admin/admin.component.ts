import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminProfile, AdminService, Dormitory } from '../../services/admin.service';
import { Auth } from '@angular/fire/auth';
import { signOut } from '@angular/fire/auth';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  constructor(
    private router: Router,
    private adminService: AdminService,
    private firebaseAuth: Auth
  ) {
    // ตรวจสอบข้อมูลแอดมินจาก localStorage
    this.loadAdminProfile();
  }

  ngOnInit(): void {
    this.loadDormitories();
  }

  // --- Admin State ---
  isLoggedIn = false;
  adminName = 'Admin1';
  adminUid = '23545';
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

  selectedTab: 'all' | 'รออนุมัติ' = 'all';

  setTab(tab: 'all' | 'รออนุมัติ') {
    this.selectedTab = tab;
    if (tab === 'รออนุมัติ') {
      this.loadPendingDormitories();
    } else {
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
        // Fallback to mock data if API fails
        this.loadMockData();
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

  loadMockData(): void {
    // Fallback mock data
    this.dorms = [
      { 
        dorm_id: '1',
        dorm_name: 'หอพักร่ำรวย', 
        owner_username: 'khaitiew002', 
        owner_name: 'ไม่ใช่ยง ชายดี',
        address: '123 ถนนสุขุมวิท กรุงเทพฯ',
        approval_status: 'อนุมัติ',
        submitted_date: '2024-01-15',
        zone_name: 'หน้ามอ',
        main_image_url: 'assets/images/photo.png'
      },
      { 
        dorm_id: '2',
        dorm_name: 'หอพักสบายใจ', 
        owner_username: 'khonsarn003', 
        owner_name: 'คนสาร เพชรสาร',
        address: '456 ถนนรัชดาภิเษก กรุงเทพฯ',
        approval_status: 'รออนุมัติ',
        submitted_date: '2024-01-20',
        zone_name: 'ท่าขอนยาง',
        main_image_url: 'assets/images/photo.png'
      },
      {
        dorm_id: '3',
        dorm_name: 'หอพักใกล้มหาลัย',
        owner_username: 'arunrak003',
        owner_name: 'อรุณรักษ์ พัฒนาพันธ์',
        address: '789 ถนนพหลโยธิน กรุงเทพฯ',
        approval_status: 'อนุมัติ',
        submitted_date: '2024-01-10',
        zone_name: 'ขามเรียง',
        main_image_url: 'assets/images/photo.png'
      },
      { 
        dorm_id: '4',
        dorm_name: 'หอพักวิวสวน', 
        owner_username: 'jiraporn005', 
        owner_name: 'วิราภรณ์ รักสวน',
        address: '321 ถนนลาดพร้าว กรุงเทพฯ',
        approval_status: 'รออนุมัติ',
        submitted_date: '2024-01-25',
        zone_name: 'ดอนนา',
        main_image_url: 'assets/images/photo.png'
      },
      {
        dorm_id: '5',
        dorm_name: 'หอพักใจกลางเมือง',
        owner_username: 'narong006',
        owner_name: 'ณรงค์ พักกึ่งสุข',
        address: '654 ถนนสุขุมวิท กรุงเทพฯ',
        approval_status: 'อนุมัติ',
        submitted_date: '2024-01-12',
        zone_name: 'กู่แก้ว',
        main_image_url: 'assets/images/photo.png'
      }
    ];
    this.filteredDorms = this.dorms;
  }

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

  approveDormitory(dormId: string): void {
    const dorm = this.dorms.find(d => d.dorm_id === dormId);
    if (dorm) {
      dorm.approval_status = 'อนุมัติ';
      this.filterDorms();
      alert('อนุมัติหอพักเรียบร้อยแล้ว');
    }
  }

  rejectDormitory(dormId: string): void {
    const reason = prompt('กรุณาระบุเหตุผลในการไม่อนุมัติ:');
    if (reason) {
      const dorm = this.dorms.find(d => d.dorm_id === dormId);
      if (dorm) {
        dorm.approval_status = 'ไม่อนุมัติ';
        this.filterDorms();
        alert('ไม่อนุมัติหอพักเรียบร้อยแล้ว');
      }
    }
  }

  deleteDormitory(dormId: string): void {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบหอพักนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      this.dorms = this.dorms.filter(d => d.dorm_id !== dormId);
      this.filterDorms();
      alert('ลบหอพักเรียบร้อยแล้ว');
    }
  }

  editDormitory(dormId: string): void {
    // TODO: Navigate to edit page or show edit modal
    alert(`แก้ไขหอพัก ID: ${dormId}`);
  }

  reviewDormitory(dormId: string): void {
    // Navigate to dormitory detail page for review
    this.router.navigate(['/admin/dorm-detail', dormId]);
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
      console.log('Firebase sign out successful');
    } catch (error) {
      console.error('Firebase sign out error:', error);
    }
    
    // ลบข้อมูล admin และ Firebase token จาก localStorage
    localStorage.removeItem('adminProfile');
    localStorage.removeItem('firebaseToken');
    console.log('Admin logout completed, localStorage cleared');
    
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
}
