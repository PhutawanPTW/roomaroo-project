import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminProfile } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-dorm-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dorm-detail.component.html',
  styleUrl: './admin-dorm-detail.component.css',
})
export class AdminDormDetailComponent implements OnInit {
  dormId: string = '';
  adminProfile: AdminProfile | null = null;
  profileDropdownOpen = false;
  showImageModalFlag = false;
  selectedImageUrl = '';
  selectedImageTitle = '';

  // Mock dormitory data - in real app, this would come from API
  dorm = {
    dorm_id: '2',
    dorm_name: 'หอพักสบายใจ',
    owner_username: 'khonsarn003',
    owner_name: 'คนสาร เพชรสาร',
    address: '456 ถนนรัชดาภิเษก กรุงเทพฯ',
    approval_status: 'รอการอนุมัติ',
    submitted_date: '2024-01-20',
    zone_name: 'ท่าขอนยาง',
    main_image_url: 'assets/images/photo.png',
    description: 'หอพักใกล้มหาวิทยาลัย ปลอดภัย สะดวกสบาย มีสิ่งอำนวยความสะดวกครบครัน',
    room_types: [
      { type: 'ห้องพัดลม', bed_type: 'เตียงเดี่ยว', rent_type: 'รายเดือน', price: 2500 },
      { type: 'ห้องแอร์', bed_type: 'เตียงคู่', rent_type: 'รายเทอม', price: 15000 }
    ],
    utilities: {
      electricity_rate: 8.5,
      water_rate: 25,
      wifi: true,
      air_conditioner: true,
      fan: true,
      hot_water: true,
      keycard: true
    },
    images: [
      'assets/images/photo.png',
      'assets/images/photo.png',
      'assets/images/photo.png',
      'assets/images/photo.png',
      'assets/images/photo.png'
    ],
    facilities: ['แอร์', 'พัดลม', 'เครื่องทำน้ำอุ่น', 'คีย์การ์ด', 'WIFI', 'ตู้เย็น', 'เครื่องซักผ้า']
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAdminProfile();
    this.dormId = this.route.snapshot.paramMap.get('id') || '';
    // In real app, load dormitory data based on dormId
  }

  loadAdminProfile(): void {
    const adminProfileStr = localStorage.getItem('adminProfile');
    if (adminProfileStr) {
      try {
        this.adminProfile = JSON.parse(adminProfileStr);
      } catch (error) {
        console.error('Error parsing admin profile:', error);
        this.redirectToLogin();
      }
    } else {
      this.redirectToLogin();
    }
  }

  redirectToLogin(): void {
    this.router.navigate(['/admin/login']);
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/admin-avatar.png';
  }

  toggleProfileDropdown(): void {
    this.profileDropdownOpen = !this.profileDropdownOpen;
  }

  closeProfileDropdown(): void {
    this.profileDropdownOpen = false;
  }

  onLogout(): void {
    this.closeProfileDropdown();
    localStorage.removeItem('adminProfile');
    this.router.navigate(['/admin/login']);
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

  approveDormitory(): void {
    if (confirm('คุณแน่ใจหรือไม่ที่จะอนุมัติหอพักนี้?')) {
      // In real app, call API to approve
      alert('อนุมัติหอพักเรียบร้อยแล้ว');
      this.router.navigate(['/admin']);
    }
  }

  rejectDormitory(): void {
    const reason = prompt('กรุณาระบุเหตุผลในการไม่อนุมัติ:');
    if (reason) {
      // In real app, call API to reject with reason
      alert('ไม่อนุมัติหอพักเรียบร้อยแล้ว');
      this.router.navigate(['/admin']);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
