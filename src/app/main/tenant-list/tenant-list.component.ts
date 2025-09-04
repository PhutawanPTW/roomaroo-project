import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { OwnerDormitoryService } from '../../services/owner-dormitory.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [NavbarComponent, CommonModule, FormsModule],
  templateUrl: './tenant-list.component.html',
})
export class TenantListComponent implements OnInit {
  tenants: any[] = [];
  filteredTenants: any[] = [];
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  sortBy = '';
  processingTenantId: number | null = null; // สำหรับแสดง loading state ของแต่ละ tenant
  processingAction: string | null = null; // สำหรับติดตาม action ที่กำลังประมวลผล (approve, reject, cancel)

  constructor(
    private ownerDormitoryService: OwnerDormitoryService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadTenants();
  }

  loadTenants() {
    this.isLoading = true;
    this.errorMessage = '';

    // ดึงข้อมูลผู้เช่าจาก API ใหม่
    this.ownerDormitoryService.getOwnerTenants().subscribe({
      next: (response) => {
        console.log('GET /api/dormitories/owner/tenants response:', response);
        
        // ใช้ tenants array จาก response ใหม่
        if (response && response.tenants) {
          this.tenants = response.tenants;
          // Debug: แสดง status ของแต่ละ tenant
          this.tenants.forEach((tenant, index) => {
            console.log(`Tenant ${index + 1}:`, {
              id: tenant.id,
              name: tenant.display_name || tenant.username,
              status: tenant.status,
              statusType: typeof tenant.status
            });
          });
        } else {
          this.tenants = [];
        }
        
        this.filteredTenants = [...this.tenants];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tenants:', error);
        this.errorMessage = 'ไม่สามารถโหลดข้อมูลผู้เช่าได้';
        this.isLoading = false;
      }
    });
  }



  onSearch() {
    this.filterTenants();
  }

  onSort() {
    this.filterTenants();
  }

  filterTenants() {
    let filtered = [...this.tenants];

    // ค้นหา
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(tenant => 
        (tenant.display_name || tenant.username || '').toLowerCase().includes(search) ||
        tenant.email.toLowerCase().includes(search) ||
        tenant.phone_number.includes(search)
      );
    }

    // เรียงลำดับ
    switch (this.sortBy) {
      case 'วันที่สมัครล่าสุด':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'วันที่สมัครเก่าสุด':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'ชื่อผู้เช่า (ก-ฮ)':
        filtered.sort((a, b) => (a.display_name || a.username || '').localeCompare(b.display_name || b.username || '', 'th'));
        break;
      case 'ชื่อผู้เช่า (ฮ-ก)':
        filtered.sort((a, b) => (b.display_name || b.username || '').localeCompare(a.display_name || a.username || '', 'th'));
        break;
      case 'สถานะการยืนยัน':
        filtered.sort((a, b) => {
          if (a.status === 'ยืนยันแล้ว' && b.status !== 'ยืนยันแล้ว') return -1;
          if (a.status !== 'ยืนยันแล้ว' && b.status === 'ยืนยันแล้ว') return 1;
          return 0;
        });
        break;
      case 'สถานะรอการยืนยัน':
        filtered.sort((a, b) => {
          if (a.status === 'รออนุมัติ' && b.status !== 'รออนุมัติ') return -1;
          if (a.status !== 'รออนุมัติ' && b.status === 'รออนุมัติ') return 1;
          return 0;
        });
        break;
    }

    this.filteredTenants = filtered;
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `สมัครเมื่อ ${diffInDays} วันที่แล้ว`;
    } else if (diffInHours > 0) {
      return `สมัครเมื่อ ${diffInHours} ชั่วโมงที่แล้ว`;
    } else {
      return 'สมัครเมื่อสักครู่';
    }
  }

  getStatusText(status: string): string {
    // ใช้ status จาก API โดยตรง (เช่น "รออนุมัติ", "ยืนยันแล้ว")
    return status;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'รออนุมัติ': return 'orange';
      case 'ยืนยันแล้ว': return 'green';
      case 'ปฏิเสธแล้ว': return 'red';
      default: return 'gray';
    }
  }

  onConfirmTenant(tenant: any) {
    console.log('PUT /api/dormitories/{dormId}/tenants/{userId}/approve - tenant:', tenant);
    
    this.processingTenantId = tenant.id;
    this.processingAction = 'approve';
    this.errorMessage = '';
    
    this.ownerDormitoryService.approveTenant(tenant.residence_dorm_id, tenant.id).subscribe({
      next: (response) => {
        console.log('Approve success:', response);
        this.processingTenantId = null;
        this.processingAction = null;
        this.loadTenants(); // โหลดข้อมูลใหม่
      },
      error: (error) => {
        console.error('Approve error:', error);
        this.processingTenantId = null;
        this.processingAction = null;
        this.errorMessage = 'ไม่สามารถอนุมัติผู้เช่าได้';
      }
    });
  }

  onRejectTenant(tenant: any) {
    console.log('PUT /api/dormitories/{dormId}/tenants/{userId}/reject - tenant:', tenant);
    
    this.processingTenantId = tenant.id;
    this.processingAction = 'reject';
    this.errorMessage = '';
    
    this.ownerDormitoryService.rejectTenant(tenant.residence_dorm_id, tenant.id).subscribe({
      next: (response) => {
        console.log('Reject success:', response);
        console.log('Reject response details:', {
          message: response.message,
          status: response.status,
          data: response.data
        });
        this.processingTenantId = null;
        this.processingAction = null;
        this.loadTenants(); // โหลดข้อมูลใหม่
      },
      error: (error) => {
        console.error('Reject error:', error);
        this.processingTenantId = null;
        this.processingAction = null;
        this.errorMessage = 'ไม่สามารถปฏิเสธผู้เช่าได้';
      }
    });
  }

  onCancelConfirmation(tenant: any) {
    console.log('PUT /api/dormitories/{dormId}/tenants/{userId}/cancel - tenant:', tenant);
    
    this.processingTenantId = tenant.id;
    this.processingAction = 'cancel';
    this.errorMessage = '';
    
    this.ownerDormitoryService.cancelTenantApproval(tenant.residence_dorm_id, tenant.id).subscribe({
      next: (response) => {
        console.log('Cancel approval success:', response);
        this.processingTenantId = null;
        this.processingAction = null;
        this.loadTenants(); // โหลดข้อมูลใหม่
      },
      error: (error) => {
        console.error('Cancel approval error:', error);
        this.processingTenantId = null;
        this.processingAction = null;
        this.errorMessage = 'ไม่สามารถยกเลิกการอนุมัติได้';
      }
    });
  }



  onImageError(event: any) {
    // เมื่อรูปโหลดไม่สำเร็จ ให้ซ่อนรูปและแสดง fallback แทน
    event.target.style.display = 'none';
    const parent = event.target.parentElement;
    const fallback = parent.querySelector('div');
    if (fallback) {
      fallback.style.display = 'flex';
    }
  }
} 