import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService, UserProfile } from '../../services/auth.service';
import { RegisterService } from '../../services/register.service';
import { OwnerDormitoryService } from '../../services/owner-dormitory.service';
import { DormitoryService, RoomType } from '../../services/dormitory.service';
import { filter, distinctUntilChanged, catchError } from 'rxjs/operators';
import { forkJoin, throwError } from 'rxjs';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
export class OwnerComponent implements OnInit, OnDestroy, AfterViewInit {
  currentUser: UserProfile | null = null;
  private subscription: any;
  // uploadLoading moved to loadingState
  uploadError: string | null = null;

  myDorms: any[] = [];
  // ใช้ตัดสินใจว่าจะล็อกความสูงชื่อหอหรือไม่ (ถ้ามีชื่อยาว 2 บรรทัดแม้แต่ใบเดียว -> true)
  anyNameWrapsTwoLines = false;
  @ViewChildren('nameEl') nameEls!: QueryList<ElementRef<HTMLDivElement>>;

  // เพิ่ม property เพื่อตรวจสอบว่าอยู่ในหน้า child (add/edit) หรือไม่
  isDormAddPage = false;
  
  // ป้องกัน loading race conditions
  private loadingState = {
    dorms: false,
    user: false,
    upload: false,
    loadDormsPromise: null as Promise<void> | null
  };

  // Getter สำหรับ UI
  get isLoadingDorms(): boolean {
    return this.loadingState.dorms;
  }

  get isUploadLoading(): boolean {
    return this.loadingState.upload;
  }

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
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private registerService: RegisterService
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
          this.loadUserDormsSafely((user as any).id);
        }
        this.cdr.markForCheck();
      });
  }

  // *** Safe loading method - ป้องกัน race conditions ***
  private loadUserDormsSafely(userId: number): void {
    // Return existing promise if already loading
    if (this.loadingState.loadDormsPromise) {
      return;
    }

    if (this.loadingState.dorms) {
      return;
    }

    this.loadingState.loadDormsPromise = this.loadUserDormsAsync(userId);
  }

  private async loadUserDormsAsync(userId: number): Promise<void> {
    try {
      this.loadingState.dorms = true;
      this.cdr.markForCheck();
      // ใช้เส้นใหม่ที่ดึง min_price/max_price จาก DB โดยตรง พร้อม Auth Bearer
      const data = await this.ownerDormService.getOwnerDormsWithPrice().toPromise();
      
      if (data) {
        this.myDorms = (Array.isArray(data) ? data : [data]).map((dorm: any) => ({
          ...dorm
        }));
        console.log('[Owner] My dorms loaded:', this.myDorms);
        // ไม่ต้องคำนวณราคาเองอีกต่อไป ราคามาจาก DB แล้ว
      } else {
        console.log('[Owner] No dorms found for user:', userId);
        this.myDorms = [];
      }
    } catch (error) {
      console.error('[Owner] Error loading user dorms:', error);
      this.myDorms = [];
    } finally {
      this.loadingState.dorms = false;
      this.loadingState.loadDormsPromise = null;
      this.cdr.markForCheck();
      // ตรวจว่ามีการตัดชื่อเป็น 2 บรรทัดหรือไม่ เพื่อกำหนดความสูงแบบไดนามิก
      setTimeout(() => this.detectNameWraps(), 0);
    }
  }

  // แยก method สำหรับโหลดข้อมูลหอพัก (legacy method)
  private loadUserDorms(userId: number): void {
    this.loadUserDormsSafely(userId);
  }

  ngAfterViewInit(): void {
    // ตรวจครั้งแรกหลัง view พร้อม และเมื่อรายการเปลี่ยน
    if (this.nameEls) {
      setTimeout(() => this.detectNameWraps(), 0);
      this.nameEls.changes.subscribe(() => setTimeout(() => this.detectNameWraps(), 0));
    }
  }

  private detectNameWraps(): void {
    try {
      if (!this.nameEls || this.nameEls.length === 0) {
        this.anyNameWrapsTwoLines = false;
        this.cdr.markForCheck();
        return;
      }

      let wraps = false;
      this.nameEls.forEach(ref => {
        const el = ref.nativeElement;
        const computed = window.getComputedStyle(el);
        const lineHeight = parseFloat(computed.lineHeight || '0');
        const height = el.getBoundingClientRect().height;
        if (lineHeight > 0 && height >= lineHeight * 1.9) {
          wraps = true;
        }
      });

      if (this.anyNameWrapsTwoLines !== wraps) {
        this.anyNameWrapsTwoLines = wraps;
        this.cdr.markForCheck();
      }
    } catch {
      // ถ้าอ่าน style ไม่ได้ ให้ถือว่าไม่ต้องล็อกความสูง
      if (this.anyNameWrapsTwoLines !== false) {
        this.anyNameWrapsTwoLines = false;
        this.cdr.markForCheck();
      }
    }
  }

  // เพิ่ม method สำหรับตรวจสอบ current route
  private checkCurrentRoute(): void {
    const currentUrl = this.router.url;
    const wasDormAddPage = this.isDormAddPage;
    // ซ่อนรายการเมื่ออยู่ที่หน้าเพิ่มหรือแก้ไขหอพักภายใต้ owner
    this.isDormAddPage = currentUrl.includes('/owner/dorm-add') || currentUrl.includes('/owner/edit-dorm/');

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
    // แสดงช่วงราคาแบบ min-max ต่อเดือน ถ้ามีข้อมูล
    const minPriceRaw = dorm?.min_price;
    const maxPriceRaw = dorm?.max_price;
    const hasMin = minPriceRaw !== null && minPriceRaw !== undefined && !Number.isNaN(Number(minPriceRaw));
    const hasMax = maxPriceRaw !== null && maxPriceRaw !== undefined && !Number.isNaN(Number(maxPriceRaw));

    if (hasMin && hasMax) {
      const minText = Number(minPriceRaw).toLocaleString();
      const maxText = Number(maxPriceRaw).toLocaleString();
      return `${minText} - ${maxText} บาท/เดือน`;
    }

    // Fallback: ราคาเดือนไม่เป็นช่วง แต่มีราคาเดียว
    const monthlySingle = dorm?.monthly_price ?? dorm?.monthly_min_price;
    if (monthlySingle !== null && monthlySingle !== undefined && !Number.isNaN(Number(monthlySingle))) {
      return `${Number(monthlySingle).toLocaleString()} บาท/เดือน`;
    }

    // ไม่มีข้อมูล -> แสดงขีดกลางเพื่อคงเลย์เอาต์บรรทัดเดียว
    return '—';
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

  getSafePriceHtml(price: string | undefined): SafeHtml {
    const html = this.getPriceHtml(price);
    return this.sanitizer.sanitize(1, html) || '';
  }

  getSafeDeleteWarningMessage(): SafeHtml {
    return this.sanitizer.sanitize(1, this.deleteWarningMessage || '') || '';
  }

  onEditDorm(dorm: any) {
    // Navigate to new edit route
    try {
      const id = dorm.dorm_id || dorm.id;
      if (!id) {
        alert('ไม่พบรหัสหอพักสำหรับแก้ไข');
        return;
      }
      this.router.navigate(['/owner/edit-dorm', id.toString()]);
    } catch (e) {
      console.error('[OwnerComponent] Failed to navigate to edit page:', e);
    }
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
    this.http.delete(`${environment.backendApiUrl}/delete-dormitory/${this.dormToDelete.dorm_id}`)
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
    this.loadingState.upload = true;
    this.uploadError = null;
    try {
      await this.registerService.uploadOwnerImage(file, this.currentUser.uid);
      // Success: imageUrl is updated in currentUser via BehaviorSubject
    } catch (err: any) {
      this.uploadError = err?.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ';
    } finally {
      this.loadingState.upload = false;
      input.value = '';
    }
  }
}