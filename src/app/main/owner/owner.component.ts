import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService, UserProfile } from '../../services/auth.service';
import { OwnerDormitoryService } from '../../services/owner-dormitory.service';
import { DormitoryService, RoomType } from '../../services/dormitory.service';
import { filter, distinctUntilChanged, catchError } from 'rxjs/operators';
import { forkJoin, throwError } from 'rxjs';
import { RouterModule, Router, NavigationEnd } from '@angular/router';

// Interface สำหรับ response จาก check-members API
interface DeleteCheckResponse {
  dorm_id: number;
  dorm_name: string;
  can_delete: boolean;
  member_count: number;
  request_count: number;
  current_members: Array<{
    id: number;
    username: string;
    display_name: string;
    email: string;
    phone_number: string;
  }>;
  pending_requests: Array<{
    id: number;
    username: string;
    display_name: string;
    email: string;
    phone_number: string;
    request_status: string;
  }>;
  warning_message: string;
  is_owner: boolean;
  is_admin: boolean;
}

@Component({
  selector: 'app-owner',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatGridListModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    RouterModule,
    NavbarComponent
  ],
  templateUrl: './owner.component.html',
  styleUrls: ['./owner.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OwnerComponent implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  private subscription: any;
  uploadLoading = false;
  uploadError: string | null = null;

  myDorms: any[] = [];

  // เพิ่ม property เพื่อตรวจสอบว่าอยู่ในหน้า dorm-add หรือไม่
  isDormAddPage = false;
  
  // เพิ่ม loading state สำหรับการโหลดข้อมูลหอพัก
  isLoadingDorms = false;

  // Modal state for delete confirmation
  showDeleteModal = false;
  dormToDelete: any = null;
  deleteWarningMessage: string | null = null;
  isDeleting = false;
  deleteErrorMessage: string | null = null;
  deleteSuccessMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private ownerDormService: OwnerDormitoryService,
    private dormService: DormitoryService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private http: HttpClient
  ) { }

  ngOnInit() {
    // ตรวจสอบว่าอยู่ในหน้า dorm-add หรือไม่
    this.checkCurrentRoute();

    // ติดตามการเปลี่ยนแปลง route ด้วย distinctUntilChanged
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        distinctUntilChanged((prev, curr) => {
          return (prev as NavigationEnd)?.url === (curr as NavigationEnd)?.url;
        })
      )
      .subscribe(() => {
        this.checkCurrentRoute();
      });

    this.subscription = this.authService.currentUser$
      .pipe(
        filter((user): user is UserProfile | null => user !== undefined),
        distinctUntilChanged((prev, curr) => {
          return prev?.uid === curr?.uid;
        })
      )
      .subscribe(user => {
        this.currentUser = user;

        // โหลดข้อมูลหอพักเฉพาะเมื่อไม่ได้อยู่ในหน้า dorm-add
        if (user && (user as any).id && !this.isDormAddPage) {
          this.loadUserDorms((user as any).id);
        }
        this.cdr.markForCheck();
      });
  }

  // แยก method สำหรับโหลดข้อมูลหอพัก
  private loadUserDorms(userId: number): void {
    // แสดง loading state ทันที
    this.isLoadingDorms = true;
    this.cdr.markForCheck();

    this.ownerDormService.getDormsByUserId(userId).subscribe({
      next: (data) => {
        if (data) {
          this.myDorms = (Array.isArray(data) ? data : [data]).map((dorm: any) => ({
            ...dorm
          }));
          // log ข้อมูลแต่ละหอ: สมาชิก ราคา และวันที่อัปเดต
          this.myDorms.forEach(d => {
            try {
              const priceStr = this.formatPriceString(d);
              const updatedStr = this.formatUpdatedDate(d);
            } catch (e) {
              console.log('[OwnerComponent] log error:', e);
            }
          });
        } else {
          this.myDorms = [];
        }

        // ไม่ดึง room types มาใช้คำนวณราคาในหน้านี้อีก ตามสเปคใหม่
        this.isLoadingDorms = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('API error:', err);

        // Show user-friendly error message
        if (err.message.includes('API endpoint not found')) {
          console.error('Backend API endpoint /api/dormitories/user/:userId not found');
          // You might want to show a message to the user or use mock data
          this.myDorms = []; // or use mock data for development
        } else {
          console.error('Other API error:', err.message);
        }
        this.isLoadingDorms = false;
        this.cdr.markForCheck();
      }
    });
  }

  // เพิ่ม method สำหรับตรวจสอบ current route
  private checkCurrentRoute(): void {
    const currentUrl = this.router.url;
    const wasDormAddPage = this.isDormAddPage;
    this.isDormAddPage = currentUrl.includes('/owner/dorm-add');

    // โหลดข้อมูลหอพักเมื่อออกจากหน้า dorm-add
    if (wasDormAddPage && !this.isDormAddPage && this.currentUser && (this.currentUser as any).id) {
      this.loadUserDorms((this.currentUser as any).id);
    }
  }

  // เพิ่ม method สำหรับดึงข้อมูล room types
  private loadRoomTypesForDorms() {
    if (this.myDorms.length === 0) return;

    // สร้าง array ของ observables สำหรับดึง room types ของแต่ละหอพัก
    const roomTypeObservables = this.myDorms.map(dorm =>
      this.dormService.getRoomTypes(dorm.dorm_id)
    );

    // ดึงข้อมูล room types พร้อมกัน
    forkJoin(roomTypeObservables).subscribe({
      next: (roomTypesArray) => {

        // คำนวณราคาจาก room types สำหรับแต่ละหอพัก
        this.myDorms.forEach((dorm, index) => {
          const roomTypes = roomTypesArray[index] || [];
          this.calculatePricesFromRoomTypes(dorm, roomTypes);
        });
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[OwnerComponent] Error loading room types:', err);
        this.cdr.markForCheck();
      }
    });
  }

  // เพิ่ม method สำหรับคำนวณราคาจาก room types
  private calculatePricesFromRoomTypes(dorm: any, roomTypes: RoomType[]) {
    // console.log(`[OwnerComponent] Calculating prices for dorm ${dorm.dorm_id}:`, roomTypes);

    if (roomTypes.length === 0) {
      // console.log(`[OwnerComponent] No room types found for dorm ${dorm.dorm_id}`);
      return;
    }

    // คำนวณราคารายเดือน
    const monthlyPrices = roomTypes
      .filter(room => room.monthly_price && room.monthly_price > 0)
      .map(room => room.monthly_price!);

    // console.log(`[OwnerComponent] Monthly prices for dorm ${dorm.dorm_id}:`, monthlyPrices);

    if (monthlyPrices.length > 0) {
      const minMonthlyPrice = Math.min(...monthlyPrices);
      const maxMonthlyPrice = Math.max(...monthlyPrices);

      // ถ้า min = max แสดงว่ามีราคาเดียว
      if (minMonthlyPrice === maxMonthlyPrice) {
        dorm.monthly_price = minMonthlyPrice;
        dorm.min_price = undefined;
        dorm.max_price = undefined;
        // console.log(`[OwnerComponent] Single monthly price for dorm ${dorm.dorm_id}: ${minMonthlyPrice}`);
      } else {
        dorm.min_price = minMonthlyPrice;
        dorm.max_price = maxMonthlyPrice;
        dorm.monthly_price = undefined;
        // console.log(`[OwnerComponent] Monthly price range for dorm ${dorm.dorm_id}: ${minMonthlyPrice} - ${maxMonthlyPrice}`);
      }
    } else {
      // ไม่มีราคารายเดือน
      dorm.min_price = undefined;
      dorm.max_price = undefined;
      dorm.monthly_price = undefined;
    }

    // คำนวณราคารายวัน
    const dailyPrices = roomTypes
      .filter(room => room.daily_price && room.daily_price > 0)
      .map(room => room.daily_price!);

    // console.log(`[OwnerComponent] Daily prices for dorm ${dorm.dorm_id}:`, dailyPrices);

    if (dailyPrices.length > 0) {
      const minDailyPrice = Math.min(...dailyPrices);
      const maxDailyPrice = Math.max(...dailyPrices);

      if (minDailyPrice === maxDailyPrice) {
        dorm.daily_price = minDailyPrice;
        // console.log(`[OwnerComponent] Single daily price for dorm ${dorm.dorm_id}: ${minDailyPrice}`);
      } else {
        dorm.daily_price = `${minDailyPrice} - ${maxDailyPrice}`;
        // console.log(`[OwnerComponent] Daily price range for dorm ${dorm.dorm_id}: ${minDailyPrice} - ${maxDailyPrice}`);
      }
    } else {
      dorm.daily_price = undefined;
    }

    // console.log(`[OwnerComponent] Final calculated prices for dorm ${dorm.dorm_id}:`, {
    //   min_price: dorm.min_price,
    //   max_price: dorm.max_price,
    //   monthly_price: dorm.monthly_price,
    //   daily_price: dorm.daily_price
    // });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getStars(rating: number): number[] {
    return Array(Math.round(rating)).fill(0);
  }

  viewDormDetail(dorm: any) {
    console.log('[Owner] viewDormDetail called with dorm:', dorm);
    console.log('[Owner] Navigating to:', `/dorm-detail/${dorm.dorm_id}`);
    // นำทางไป dorm-detail พร้อมส่ง dorm_id (standalone route)
    this.router.navigate(['/dorm-detail', dorm.dorm_id]);
  }

  // Helper to format price string like main page
  formatPriceString(dorm: any): string {
    const lines: string[] = [];

    // ราคาแบบรายเดือน (คีย์ใหม่เท่านั้น)
    const monthlyMinRaw = dorm?.monthly_min_price;
    if (monthlyMinRaw !== null && monthlyMinRaw !== undefined && !Number.isNaN(Number(monthlyMinRaw))) {
      lines.push(`${Number(monthlyMinRaw).toLocaleString()} บาท/เดือน`);
    }

    // ราคาแบบรายวัน (คีย์ใหม่เท่านั้น)
    const dailyMinRaw = dorm?.daily_min_price;
    if (dailyMinRaw !== null && dailyMinRaw !== undefined && !Number.isNaN(Number(dailyMinRaw))) {
      lines.push(`${Number(dailyMinRaw).toLocaleString()} บาท/วัน`);
    }

    // ทั้งคู่เป็น null -> ไม่แสดงราคา (คืนค่าว่าง)
    return lines.join('\n');
  }

  // ฟอร์แมตวันที่อัปเดตล่าสุดจาก updated_date
  formatUpdatedDate(dorm: any): string {
    const iso = dorm?.updated_date || dorm?.updated_at || dorm?.created_date;
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const th = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' });
      return `อัปเดตล่าสุด: ${th}`;
    } catch {
      return '';
    }
  }

  // ฟอร์แมตวันที่แบบไทย: "10 พฤศจิกายน 2024" (ไม่แสดงเวลา)
  formatUpdatedDateThai(iso?: string): string {
    if (!iso) return '';
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat('th-TH', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch {
      return iso as string;
    }
  }

  // Use the same getPriceHtml as main page (accepts price string)
  getPriceHtml(price: string | undefined): string {
    if (!price) return '';
    const lines = price.split('\n');
    let html = '';

    // ตรวจบรรทัดทั้งหมด และเรนเดอร์ตามชนิดราคา
    for (const line of lines) {
      if (!line) continue;
      // รายเดือน (เดี่ยวหรือช่วง)
      const monthlyRangeMatch = line.match(/([\d,]+)\s*-\s*([\d,]+)\s*(บาท\/เดือน)/);
      if (monthlyRangeMatch) {
        const [_, start, end, unit] = monthlyRangeMatch;
        html += `<div class="price-monthly"><span class=\"font-english\">${start} - ${end}</span> <span class=\"font-thai unit\">${unit}</span></div>`;
        continue;
      }
      const monthlySingleMatch = line.match(/([\d,]+)\s*(บาท\/เดือน)/);
      if (monthlySingleMatch) {
        const [_, number, unit] = monthlySingleMatch;
        html += `<div class="price-monthly"><span class=\"font-english\">${number}</span> <span class=\"font-thai unit\">${unit}</span></div>`;
        continue;
      }
      // รายวัน (เดี่ยว)
      const dailyMatch = line.match(/([\d,]+)\s*(บาท\/วัน)/);
      if (dailyMatch) {
        const [_, number, unit] = dailyMatch;
        html += `<div class="price-daily"><span class=\"font-english\">${number}</span> <span class=\"font-thai unit\">${unit}</span></div>`;
        continue;
      }
    }

    return html;
  }

  onEditDorm(dorm: any) {
    // TODO: implement edit logic
    alert('Edit dorm: ' + dorm.dorm_name);
  }

  // Updated methods for owner.component.ts

  // Method to handle delete dormitory with proper confirmation
  async onDeleteDorm(dorm: any) {
    this.isDeleting = false;
    this.deleteErrorMessage = null;
    this.deleteSuccessMessage = null;
    this.dormToDelete = dorm;
    const count = typeof dorm.member_count === 'number' ? dorm.member_count : 0;
    if (count > 0) {
      this.deleteWarningMessage = `คุณต้องการลบหอพัก "${dorm.dorm_name}" ใช่หรือไม่?<br/>หอพักนี้ยังมีสมาชิกอยู่ในระบบ`;
    } else {
      this.deleteWarningMessage = `คุณต้องการลบหอพัก "${dorm.dorm_name}" ใช่หรือไม่?`;
    }
    this.showDeleteModal = true;
    this.cdr.markForCheck();
  }

  // Confirm delete with proper error handling
  confirmDeleteDorm() {
    if (!this.dormToDelete) return;

    this.isDeleting = true;
    this.deleteErrorMessage = null;
    this.deleteSuccessMessage = null;

    // Use the correct API endpoint from your routes
    this.http.delete(`http://localhost:3000/api/delete-dormitory/${this.dormToDelete.dorm_id}`)
      .pipe(
        catchError(error => {
          console.error('Delete dorm error:', error);

          // Handle specific error cases
          if (error.status === 404) {
            return throwError(() => new Error('ไม่พบข้อมูลหอพัก'));
          } else if (error.status === 403) {
            return throwError(() => new Error('ไม่มีสิทธิ์ลบหอพักนี้'));
          } else if (error.status === 500 && error.error && typeof error.error === 'object' && error.error.detail && error.error.detail.includes('is still referenced from table')) {
            return throwError(() => new Error(`ไม่สามารถลบหอพัก "${this.dormToDelete?.dorm_name}" ได้ เนื่องจากยังมีสมาชิกที่อาศัยอยู่ในหอพักนี้ กรุณาให้สมาชิกออกจากหอก่อน`));
          } else if (error.status === 500) {
            // Check if it's a database constraint error
            const errorMessage = error.error?.message || error.message || '';
            if (errorMessage.includes('constraint') || errorMessage.includes('referenced')) {
              return throwError(() => new Error(`เกิดข้อผิดพลาดในการลบหอพัก กรุณาติดต่อผู้ดูแลระบบ`));
            }
            return throwError(() => new Error('เกิดข้อผิดพลาดในเซิร์ฟเวอร์'));
          } else if (error.status === 401) {
            return throwError(() => new Error('กรุณาเข้าสู่ระบบใหม่'));
          } else {
            return throwError(() => new Error('เกิดข้อผิดพลาดในการลบหอพัก'));
          }
        })
      )
      .subscribe({
        next: (response: any) => {
          this.isDeleting = false;
          this.deleteSuccessMessage = `ลบหอพัก "${this.dormToDelete?.dorm_name}" เรียบร้อยแล้ว`;
          this.deleteWarningMessage = null;
          this.deleteErrorMessage = null;

          // Reload the dormitory list
          if (this.currentUser && (this.currentUser as any).id) {
            this.loadUserDorms((this.currentUser as any).id);
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isDeleting = false;
          this.deleteErrorMessage = error.message || 'เกิดข้อผิดพลาดในการลบหอพัก';
          this.deleteSuccessMessage = null;
          this.cdr.markForCheck();
        }
      });
  }

  // Cancel delete dialog
  cancelDeleteDorm() {
    this.showDeleteModal = false;
    this.dormToDelete = null;
    this.deleteWarningMessage = null;
    this.deleteErrorMessage = null;
    this.deleteSuccessMessage = null;
    this.cdr.markForCheck();
  }

  // Trigger file input click
  triggerFileInput(fileInput: HTMLInputElement) {
    fileInput.click();
  }

  // Handle file input change
  async onProfileImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.currentUser) return;
    const file = input.files[0];
    this.uploadLoading = true;
    this.uploadError = null;
    try {
      await this.authService.uploadOwnerImage(file, this.currentUser.uid);
      // Success: imageUrl is updated in currentUser via BehaviorSubject
    } catch (err: any) {
      this.uploadError = err?.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ';
    } finally {
      this.uploadLoading = false;
      input.value = '';
    }
  }
}