import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService, UserProfile } from '../services/auth.service';
import { DormitoryService, Dorm } from '../services/dormitory.service';
import { NavbarComponent } from './navbar/navbar.component';
import { AboutComponent } from './about/about.component';
import { ComparePopupComponent } from './shared/compare-popup/compare-popup.component';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// UI model used in template (all required)
interface UIDorm {
  id: number;
  image: string;
  price: string;
  dailyPrice?: string;
  monthlyPrice?: string;
  name: string;
  location: string;
  zone: string;
  date: string;
  rating: number;
}

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, ComparePopupComponent, AboutComponent],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
})
export class MainComponent implements OnInit, OnDestroy {
  currentRoute: string = '';
  pendingApproval = false;

  // Banner slider images - ใช้รูปภาพจากอินเทอร์เน็ต
  sliderImages = [
    {
      src: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      alt: 'Modern Dormitory Building'
    },
    {
      src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      alt: 'Dormitory Room Interior'
    },
    {
      src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      alt: 'Student Common Area'
    },
    {
      src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      alt: 'Campus Dormitory View'
    }
  ];
  currentSlide = 0;
  private slideInterval: number | undefined;

  // Subscriptions สำหรับจัดการ memory leak
  private routerSubscription: Subscription | undefined;
  private authSubscription: Subscription | undefined;

  // Full lists
  recommendedDorms: UIDorm[] = [];
  latestDorms: UIDorm[] = [];
  
  // Loading states
  isLoadingRecommended = true;
  isLoadingLatest = true;
  
  // Displayed lists (limited to 4)
  displayedRecommended: UIDorm[] = [];
  displayedLatest: UIDorm[] = [];

  constructor(
    private router: Router, 
    private authService: AuthService, 
    private dormSvc: DormitoryService,
    private sanitizer: DomSanitizer
  ) {
    // แทนที่การ subscribe โดยตรง ด้วยการเก็บ subscription เพื่อ unsubscribe ใน ngOnDestroy
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
    });
  }

  ngOnInit() {
    this.startSlideshow();
    this.loadDormitories();

    this.authSubscription = this.authService.currentUser$.subscribe((user: UserProfile | null | undefined) => {
      if (user) {
        this.pendingApproval = !!user.pendingApproval;
        if (user.memberType === 'owner') {
          this.router.navigate(['/owner']);
        } else if (user.memberType === 'member') {
          this.router.navigate(['/main/member/dashboard']);
        }
      }
    });
  }

  private async loadDormitories() {
    this.isLoadingRecommended = true;
    this.isLoadingLatest = true;

    try {
      const recommended = await this.dormSvc.getRecommended().toPromise();
      console.log('Recommended dorms from API:', recommended);
      if (recommended) {
        this.recommendedDorms = recommended.map(d => this.mapDormToUi(d));
        this.displayedRecommended = this.recommendedDorms.slice(0, 4);
        this.loadImagesForList(this.displayedRecommended);
      }
    } catch (error) {
      console.error('Error loading recommended dormitories:', error);
    } finally {
      this.isLoadingRecommended = false;
    }

    try {
      const latest = await this.dormSvc.getLatest().toPromise();
      console.log('Latest dorms from API:', latest);
      if (latest) {
        this.latestDorms = latest.map(d => this.mapDormToUi(d));
        this.displayedLatest = this.latestDorms.slice(0, 4);
        this.loadImagesForList(this.displayedLatest);
      }
    } catch (error) {
      console.error('Error loading latest dormitories:', error);
    } finally {
      this.isLoadingLatest = false;
    }
  }

  startSlideshow(): void {
    // ปิด slideshow เดิมก่อน (ถ้ามี) เพื่อป้องกัน memory leak
    this.stopSlideshow();
    
    this.slideInterval = window.setInterval(() => {
      this.nextSlide();
    }, 3000);
  }

  stopSlideshow(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
      this.slideInterval = undefined;
    }
  }

  ngOnDestroy(): void {
    // ลบ slideshow interval เพื่อป้องกัน memory leak
    this.stopSlideshow();
    
    // ยกเลิก subscriptions เพื่อป้องกัน memory leak
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.sliderImages.length;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.sliderImages.length) % this.sliderImages.length;
  }

  getStars(rating: number | undefined): { filled: boolean }[] {
    const stars: { filled: boolean }[] = [];
    const actualRating = rating || 0;
    
    for (let i = 1; i <= 5; i++) {
      stars.push({ filled: i <= actualRating });
    }
    
    return stars;
  }

  isAuthPage(): boolean {
    return this.currentRoute.includes('login') ||
      this.currentRoute.includes('register') ||
      this.currentRoute.includes('owner');
  }

  getPriceHtml(price: string | undefined): string {
    if (!price) return '';
    
    // แยกราคารายเดือนและรายวัน (ถ้ามี)
    const lines = price.split('\n');
    let html = '';
    
    // ราคารายเดือน (บรรทัดแรก)
    if (lines[0]) {
      // แยกตัวเลขและหน่วย
      const monthlyMatch = lines[0].match(/([\d,]+)(\s*-\s*[\d,]+)?\s*(บาท\/เดือน)/);
      if (monthlyMatch) {
        if (monthlyMatch[2]) { // กรณีช่วงราคา
          const [_, start, range, unit] = monthlyMatch;
          html += `<div class="price-monthly">
            <span class="font-english">${start}</span>
            <span class="font-english">${range}</span>
            <span class="font-thai unit">${unit}</span>
          </div>`;
        } else { // กรณีราคาเดียว
          const [_, number, __, unit] = monthlyMatch;
          html += `<div class="price-monthly">
            <span class="font-english">${number}</span>
            <span class="font-thai unit">${unit}</span>
          </div>`;
        }
      }
    }
    
    // ราคารายวัน (บรรทัดที่สอง ถ้ามี)
    if (lines[1]) {
      const dailyMatch = lines[1].match(/([\d,]+)\s*(บาท\/วัน)/);
      if (dailyMatch) {
        const [_, number, unit] = dailyMatch;
        html += `<div class="price-daily">
          <span class="font-english">${number}</span>
          <span class="font-thai unit">${unit}</span>
        </div>`;
      }
    }
    
    return html;
  }

  getSafePriceHtml(price: string | undefined): SafeHtml {
    const html = this.getPriceHtml(price);
    return this.sanitizer.sanitize(1, html) || '';
  }

  viewAllRecommended() {
    this.router.navigate(['/dorm-list'], { queryParams: { type: 'recommended' } });
  }

  viewAllLatest() {
    this.router.navigate(['/dorm-list'], { queryParams: { type: 'latest' } });
  }

  viewDormDetail(dorm: UIDorm) {
    this.router.navigate(['/dorm-detail', dorm.id]);
  }

  onLogin() {
    this.router.navigate(['/login']);
  }

  onRegister() {
    // Require explicit type; do not navigate with null
    const type = 'member';
    this.router.navigate(['/register', type], { queryParams: { userType: type } });
  }

  private mapDormToUi(d: Dorm): UIDorm {
    let priceDisplay = '';

    // จัดการราคารายเดือน
    if (d.min_price != null && d.max_price != null) {
      const minVal = Number(d.min_price);
      const maxVal = Number(d.max_price);
      if (!Number.isNaN(minVal) && !Number.isNaN(maxVal)) {
        priceDisplay = minVal === maxVal
          ? `${minVal.toLocaleString()} บาท/เดือน`
          : `${minVal.toLocaleString()} - ${maxVal.toLocaleString()} บาท/เดือน`;
      }
    } else if (d.monthly_price != null) {
      const single = Number(d.monthly_price);
      if (!Number.isNaN(single)) {
        priceDisplay = `${single.toLocaleString()} บาท/เดือน`;
      }
    }

    // เพิ่มราคารายวันในบรรทัดที่สอง (ถ้ามี)
    if (d.daily_price) {
      priceDisplay += `\n${d.daily_price.toLocaleString()} บาท/วัน`;
    }

    // Format location display
    let locationDisplay = d.location_display || d.address || '';
    if (d.zone_name) {
      locationDisplay = locationDisplay ? `${locationDisplay} (${d.zone_name})` : d.zone_name;
    }

    return {
      id: d.dorm_id,
      image: d.thumbnail_url || d.main_image_url || 'assets/images/photo.png',
      price: priceDisplay,
      name: d.dorm_name,
      location: locationDisplay,
      zone: d.zone_name || 'ไม่ระบุโซน',
      date: d.updated_date ? this.formatThaiDate(d.updated_date) : '',
      rating: d.rating || 0.0
    };
  }

  private loadImagesForList(list: UIDorm[]): void {
    // Preload images
    list.forEach(dorm => {
      if (dorm.image) {
        const img = new Image();
        img.src = dorm.image;
      }
    });
  }

  // Format date to Thai format
  formatThaiDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist Era
    
    return `อัพเดทล่าสุด: ${day} ${month} ${year}`;
  }
}