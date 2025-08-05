import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService, UserProfile } from '../../services/auth.service';
import { OwnerDormitoryService } from '../../services/owner-dormitory.service';
import { DormitoryService, RoomType } from '../../services/dormitory.service';
import { filter } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-owner',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatGridListModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    NavbarComponent
  ],
  templateUrl: './owner.component.html',
  styleUrls: ['./owner.component.css']
})
export class OwnerComponent implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  private subscription: any;
  uploadLoading = false;
  uploadError: string | null = null;

  myDorms: any[] = [];

  constructor(
    private authService: AuthService, 
    private ownerDormService: OwnerDormitoryService,
    private dormService: DormitoryService
  ) { }

  ngOnInit() {
    this.subscription = this.authService.currentUser$
      .pipe(
        filter((user): user is UserProfile | null => user !== undefined)
      )
      .subscribe(user => {
        this.currentUser = user;
        console.log('[OwnerComponent] Current user updated:', user);

        if (user && (user as any).id) {
          console.log('Current user:', user);

          this.ownerDormService.getDormsByUserId((user as any).id).subscribe({
            next: (data) => {
              console.log('API response:', data);

              // Handle different response formats
              if (data) {
                this.myDorms = Array.isArray(data) ? data : [data];
              } else {
                this.myDorms = [];
              }

              console.log('[OwnerComponent] My dorms:', this.myDorms);
              
              // ดึงข้อมูล room types สำหรับแต่ละหอพัก
              this.loadRoomTypesForDorms();
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
            }
          });
        }
      });
  }

  // เพิ่ม method สำหรับดึงข้อมูล room types
  private loadRoomTypesForDorms() {
    if (this.myDorms.length === 0) return;

    console.log('[OwnerComponent] Loading room types for dorms:', this.myDorms.map(d => d.dorm_id));

    // สร้าง array ของ observables สำหรับดึง room types ของแต่ละหอพัก
    const roomTypeObservables = this.myDorms.map(dorm => 
      this.dormService.getRoomTypes(dorm.dorm_id)
    );

    // ดึงข้อมูล room types พร้อมกัน
    forkJoin(roomTypeObservables).subscribe({
      next: (roomTypesArray) => {
        console.log('[OwnerComponent] Room types for all dorms:', roomTypesArray);
        
        // คำนวณราคาจาก room types สำหรับแต่ละหอพัก
        this.myDorms.forEach((dorm, index) => {
          const roomTypes = roomTypesArray[index] || [];
          console.log(`[OwnerComponent] Processing room types for dorm ${dorm.dorm_id}:`, roomTypes);
          this.calculatePricesFromRoomTypes(dorm, roomTypes);
        });
      },
      error: (err) => {
        console.error('[OwnerComponent] Error loading room types:', err);
      }
    });
  }

  // เพิ่ม method สำหรับคำนวณราคาจาก room types
  private calculatePricesFromRoomTypes(dorm: any, roomTypes: RoomType[]) {
    // console.log(`[OwnerComponent] Calculating prices for dorm ${dorm.dorm_id}:`, roomTypes);

    if (roomTypes.length === 0) {
      console.log(`[OwnerComponent] No room types found for dorm ${dorm.dorm_id}`);
      return;
    }

    // คำนวณราคารายเดือน
    const monthlyPrices = roomTypes
      .filter(room => room.monthly_price && room.monthly_price > 0)
      .map(room => room.monthly_price!);
    
    console.log(`[OwnerComponent] Monthly prices for dorm ${dorm.dorm_id}:`, monthlyPrices);
    
    if (monthlyPrices.length > 0) {
      const minMonthlyPrice = Math.min(...monthlyPrices);
      const maxMonthlyPrice = Math.max(...monthlyPrices);
      
      // ถ้า min = max แสดงว่ามีราคาเดียว
      if (minMonthlyPrice === maxMonthlyPrice) {
        dorm.monthly_price = minMonthlyPrice;
        dorm.min_price = undefined;
        dorm.max_price = undefined;
        console.log(`[OwnerComponent] Single monthly price for dorm ${dorm.dorm_id}: ${minMonthlyPrice}`);
      } else {
        dorm.min_price = minMonthlyPrice;
        dorm.max_price = maxMonthlyPrice;
        dorm.monthly_price = undefined;
        console.log(`[OwnerComponent] Monthly price range for dorm ${dorm.dorm_id}: ${minMonthlyPrice} - ${maxMonthlyPrice}`);
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
    
    console.log(`[OwnerComponent] Daily prices for dorm ${dorm.dorm_id}:`, dailyPrices);
    
    if (dailyPrices.length > 0) {
      const minDailyPrice = Math.min(...dailyPrices);
      const maxDailyPrice = Math.max(...dailyPrices);
      
      if (minDailyPrice === maxDailyPrice) {
        dorm.daily_price = minDailyPrice;
        console.log(`[OwnerComponent] Single daily price for dorm ${dorm.dorm_id}: ${minDailyPrice}`);
      } else {
        dorm.daily_price = `${minDailyPrice} - ${maxDailyPrice}`;
        console.log(`[OwnerComponent] Daily price range for dorm ${dorm.dorm_id}: ${minDailyPrice} - ${maxDailyPrice}`);
      }
    } else {
      dorm.daily_price = undefined;
    }

    console.log(`[OwnerComponent] Final calculated prices for dorm ${dorm.dorm_id}:`, {
      min_price: dorm.min_price,
      max_price: dorm.max_price,
      monthly_price: dorm.monthly_price,
      daily_price: dorm.daily_price
    });
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
    // สมมติว่าในอนาคตจะมี id หรือ slug สามารถส่ง param ได้
    // ตอนนี้นำทางไป dorm-detail เฉย ๆ
    window.location.href = '/main/dorm-detail';
  }

  // Helper to format price string like main page
  formatPriceString(dorm: any): string {
    let priceDisplay = '';
    
    // ตรวจสอบว่ามีราคารายเดือนหรือไม่
    const hasMonthlyPrice = dorm.min_price && dorm.max_price;
    const hasSingleMonthlyPrice = dorm.monthly_price;
    
    // ตรวจสอบว่ามีราคารายวันหรือไม่
    const hasDailyPrice = dorm.daily_price;
    
    console.log(`[OwnerComponent] Formatting prices for dorm ${dorm.dorm_id}:`, {
      hasMonthlyPrice,
      hasSingleMonthlyPrice,
      hasDailyPrice,
      min_price: dorm.min_price,
      max_price: dorm.max_price,
      monthly_price: dorm.monthly_price,
      daily_price: dorm.daily_price
    });
    
    // กรณีที่ 1: มีเฉพาะราคารายวัน
    if (!hasMonthlyPrice && !hasSingleMonthlyPrice && hasDailyPrice) {
      if (typeof dorm.daily_price === 'string' && dorm.daily_price.includes('-')) {
        // กรณีมี range ราคารายวัน
        priceDisplay = `${dorm.daily_price} บาท/วัน`;
      } else {
        // กรณีมีราคารายวันเดียว
        priceDisplay = `${dorm.daily_price.toLocaleString()} บาท/วัน`;
      }
    }
    // กรณีที่ 2: มีทั้งรายเดือนและรายวัน
    else if ((hasMonthlyPrice || hasSingleMonthlyPrice) && hasDailyPrice) {
      if (hasMonthlyPrice) {
        priceDisplay = `${dorm.min_price.toLocaleString()} - ${dorm.max_price.toLocaleString()} บาท/เดือน`;
      } else {
        priceDisplay = `${dorm.monthly_price.toLocaleString()} บาท/เดือน`;
      }
      
      // เพิ่มราคารายวัน
      if (typeof dorm.daily_price === 'string' && dorm.daily_price.includes('-')) {
        priceDisplay += `\n${dorm.daily_price} บาท/วัน`;
      } else {
        priceDisplay += `\n${dorm.daily_price.toLocaleString()} บาท/วัน`;
      }
    }
    // กรณีที่ 3: มีเฉพาะรายเดือน
    else if (hasMonthlyPrice || hasSingleMonthlyPrice) {
      if (hasMonthlyPrice) {
        priceDisplay = `${dorm.min_price.toLocaleString()} - ${dorm.max_price.toLocaleString()} บาท/เดือน`;
      } else {
        priceDisplay = `${dorm.monthly_price.toLocaleString()} บาท/เดือน`;
      }
    }
    
    return priceDisplay;
  }

  // Use the same getPriceHtml as main page (accepts price string)
  getPriceHtml(price: string | undefined): string {
    if (!price) return '';
    const lines = price.split('\n');
    let html = '';

    // Process monthly price (first line)
    if (lines[0]) {
      // Check for price range format (e.g., "2,600 - 3,000 บาท/เดือน")
      const monthlyRangeMatch = lines[0].match(/([\d,]+)\s*-\s*([\d,]+)\s*(บาท\/เดือน)/);
      if (monthlyRangeMatch) {
        const [_, start, end, unit] = monthlyRangeMatch;
        html += `<div class="price-monthly"><span class="font-english">${start} - ${end}</span> <span class="font-thai unit">${unit}</span></div>`;
      } else {
        // Check for single price format (e.g., "2,600 บาท/เดือน")
        const monthlySingleMatch = lines[0].match(/([\d,]+)\s*(บาท\/เดือน)/);
        if (monthlySingleMatch) {
          const [_, number, unit] = monthlySingleMatch;
          html += `<div class="price-monthly"><span class="font-english">${number}</span> <span class="font-thai unit">${unit}</span></div>`;
        }
      }
    }

    // Process daily price (second line)
    if (lines[1]) {
      const dailyMatch = lines[1].match(/([\d,]+)\s*(บาท\/วัน)/);
      if (dailyMatch) {
        const [_, number, unit] = dailyMatch;
        html += `<div class="price-daily"><span class="font-english">${number}</span> <span class="font-thai unit">${unit}</span></div>`;
      }
    }

    // Process daily price only (first line if no monthly price)
    if (lines.length === 1 && lines[0].includes('บาท/วัน')) {
      const dailyOnlyMatch = lines[0].match(/([\d,]+)\s*(บาท\/วัน)/);
      if (dailyOnlyMatch) {
        const [_, number, unit] = dailyOnlyMatch;
        html += `<div class="price-daily"><span class="font-english">${number}</span> <span class="font-thai unit">${unit}</span></div>`;
      }
    }

    return html;
  }

  onEditDorm(dorm: any) {
    // TODO: implement edit logic
    alert('Edit dorm: ' + dorm.name);
  }

  onDeleteDorm(dorm: any) {
    // TODO: implement delete logic
    alert('Delete dorm: ' + dorm.name);
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