import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { OwnerDormitoryService } from '../../services/owner-dormitory.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [NavbarComponent, CommonModule, FormsModule],
  templateUrl: './tenant-list.component.html',
})
export class TenantListComponent implements OnInit, OnDestroy {
  tenants: any[] = [];
  filteredTenants: any[] = [];
  isLoading = true; // เริ่มต้นด้วย loading state
  errorMessage = '';
  searchTerm = '';
  sortBy = '';
  processingTenantId: number | null = null; // สำหรับแสดง loading state ของแต่ละ tenant
  processingAction: string | null = null; // สำหรับติดตาม action ที่กำลังประมวลผล (approve, reject, cancel)
  private refreshSub: Subscription | null = null;
  initialLoadComplete = false; // เพิ่ม flag เพื่อติดตามการโหลดครั้งแรก

  // Modal states
  showRejectModal = false;
  showCancelModal = false;
  selectedTenant: any = null;
  rejectionReason = '';
  cancelReason = '';
  isSubmittingReason = false;

  constructor(
    private ownerDormitoryService: OwnerDormitoryService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // เริ่มต้นด้วยการโหลดข้อมูลครั้งแรก
    this.loadTenants();
    // เริ่ม auto refresh หลังจากโหลดครั้งแรกเสร็จ
    setTimeout(() => {
      this.startAutoRefresh();
    }, 2000); // รอ 2 วินาทีก่อนเริ่ม auto refresh
  }

  ngOnDestroy() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
      this.refreshSub = null;
    }
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
        
        // เพิ่ม delay เพื่อให้ผู้ใช้เห็น loading state
        setTimeout(() => {
          this.isLoading = false;
          this.initialLoadComplete = true;
        }, 1000); // รอ 1 วินาทีเพื่อให้เห็น loading
      },
      error: (error) => {
        console.error('Error loading tenants:', error);
        this.errorMessage = 'ไม่สามารถโหลดข้อมูลผู้เช่าได้';
        
        // เพิ่ม delay แม้ในกรณี error
        setTimeout(() => {
          this.isLoading = false;
          this.initialLoadComplete = true;
        }, 1000);
      }
    });
  }

  // เรียลไทม์แบบง่ายด้วย polling ทุกๆ 10 วินาที (เริ่มหลังจากโหลดครั้งแรกเสร็จ)
  private startAutoRefresh() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }

    this.refreshSub = timer(0, 10000)
      .pipe(
        // เมื่อมี action กำลังประมวลผล ให้ยังคง refresh ได้ปกติ (สามารถปรับเป็น pause ได้ถ้าต้องการ)
        switchMap(() => this.ownerDormitoryService.getOwnerTenants().pipe(
          catchError((error) => {
            console.error('Error loading tenants (auto refresh):', error);
            this.errorMessage = 'ไม่สามารถโหลดข้อมูลผู้เช่าได้';
            // อย่าทำให้สตรีมตาย: ส่งค่า fallback เพื่อให้ timer ทำงานต่อ
            return of({ tenants: [] });
          })
        ))
      )
      .subscribe((response: any) => {
        if (response && response.tenants) {
          this.tenants = response.tenants;
        } else {
          this.tenants = [];
        }
        this.filteredTenants = [...this.tenants];
        // ไม่เปลี่ยน isLoading ใน auto refresh เพื่อไม่ให้รบกวน UI
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

  // แสดงวันที่ยื่นคำขอในรูปแบบที่อ่านง่าย
  formatRequestDate(requestDate: string): string {
    if (!requestDate) return '';
    
    try {
      const date = new Date(requestDate);
      
      // แปลงเป็นรูปแบบ HH:mm:ss DD-MM-YYYY
      const time = date.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      });
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${time} ${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting request date:', error);
      return requestDate; // แสดงค่าเดิมถ้าแปลงไม่ได้
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
    // แสดง modal สำหรับกรอกเหตุผลการปฏิเสธ
    this.selectedTenant = tenant;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  // ยืนยันการปฏิเสธพร้อมเหตุผล
  confirmRejectTenant() {
    if (!this.rejectionReason.trim()) {
      alert('กรุณาระบุเหตุผลการปฏิเสธ');
      return;
    }

    if (!this.selectedTenant) return;

    console.log('PUT /api/dormitories/{dormId}/tenants/{userId}/reject - tenant:', this.selectedTenant);
    console.log('Rejection reason:', this.rejectionReason);
    
    this.isSubmittingReason = true;
    this.errorMessage = '';
    
    this.ownerDormitoryService.rejectTenantWithReason(
      this.selectedTenant.residence_dorm_id, 
      this.selectedTenant.id,
      this.rejectionReason.trim()
    ).subscribe({
      next: (response) => {
        console.log('Reject success:', response);
        this.isSubmittingReason = false;
        this.closeRejectModal();
        this.loadTenants(); // โหลดข้อมูลใหม่
      },
      error: (error) => {
        console.error('Reject error:', error);
        this.isSubmittingReason = false;
        this.errorMessage = 'ไม่สามารถปฏิเสธผู้เช่าได้';
      }
    });
  }

  onCancelConfirmation(tenant: any) {
    // แสดง modal สำหรับกรอกเหตุผลการยกเลิก
    this.selectedTenant = tenant;
    this.cancelReason = '';
    this.showCancelModal = true;
  }

  // ยืนยันการยกเลิกพร้อมเหตุผล
  confirmCancelTenant() {
    if (!this.cancelReason.trim()) {
      alert('กรุณาระบุเหตุผลการยกเลิก');
      return;
    }

    if (!this.selectedTenant) return;

    console.log('PUT /api/dormitories/{dormId}/tenants/{userId}/cancel - tenant:', this.selectedTenant);
    console.log('Cancel reason:', this.cancelReason);
    
    this.isSubmittingReason = true;
    this.errorMessage = '';
    
    this.ownerDormitoryService.cancelTenantApprovalWithReason(
      this.selectedTenant.residence_dorm_id, 
      this.selectedTenant.id,
      this.cancelReason.trim()
    ).subscribe({
      next: (response) => {
        console.log('Cancel approval success:', response);
        this.isSubmittingReason = false;
        this.closeCancelModal();
        this.loadTenants(); // โหลดข้อมูลใหม่
      },
      error: (error) => {
        console.error('Cancel approval error:', error);
        this.isSubmittingReason = false;
        this.errorMessage = 'ไม่สามารถยกเลิกการอนุมัติได้';
      }
    });
  }



  // Modal control methods
  closeRejectModal() {
    this.showRejectModal = false;
    this.selectedTenant = null;
    this.rejectionReason = '';
    this.isSubmittingReason = false;
  }

  closeCancelModal() {
    this.showCancelModal = false;
    this.selectedTenant = null;
    this.cancelReason = '';
    this.isSubmittingReason = false;
  }

  // Helper method to get tenant avatar URL with fallback
  getTenantAvatarUrl(tenant: any): string {
    // ถ้ามีรูปโปรไฟล์ ให้ใช้รูปนั้น
    if (tenant.profile_image_url) {
      return tenant.profile_image_url;
    }
    
    // ถ้าไม่มีรูป ให้ใช้ cat avatar.jpg เป็นค่าเริ่มต้นสำหรับสมาชิก/ผู้เช่า
    return 'assets/icon/cat avatar.jpg';
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