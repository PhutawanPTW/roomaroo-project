import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AuthService, UserProfile } from '../services/auth.service';
import { DormitoryService, Dorm } from '../services/dormitory.service';

// UI model used in template (all required)
interface UIDorm {
  id: number;
  image: string;
  price: string;
  name: string;
  location: string;
  date: string;
  rating: number;
  hasDailyPrice?: boolean;
}

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, HttpClientModule, NavbarComponent],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
})
export class MainComponent implements OnInit {
  currentRoute: string = '';

  // Banner slider images
  sliderImages = [
    {
      src: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      alt: 'Modern Dormitory Building',
    },
    {
      src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      alt: 'Dormitory Room Interior',
    },
    {
      src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      alt: 'Student Common Area',
    },
    {
      src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      alt: 'Campus Dormitory View',
    },
  ];
  currentSlide = 0;
  slideInterval: any;

  recommendedDorms: UIDorm[] = [];
  latestDorms: UIDorm[] = [];

  constructor(private router: Router, private authService: AuthService, private dormSvc: DormitoryService) { }

  ngOnInit() {
    this.currentRoute = this.router.url;
    this.startSlideshow();

    this.dormSvc.getRecommended().subscribe({
      next: (res) => {
        this.recommendedDorms = res.slice(0, 4).map(d => this.mapDormToUi(d));
        this.loadImagesForList(this.recommendedDorms);
      },
      error: (err) => console.error('Error fetching recommended dorms:', err)
    });

    this.dormSvc.getLatest().subscribe({
      next: (res) => {
        this.latestDorms = res.slice(0, 4).map(d => this.mapDormToUi(d));
        this.loadImagesForList(this.latestDorms);
      },
      error: (err) => console.error('Error fetching latest dorms:', err)
    });

    this.authService.currentUser$.subscribe((user: UserProfile | null) => {
      if (user) {
        if (user.memberType === 'owner') {
          this.router.navigate(['/owner']);
        } else if (user.memberType === 'member') {
          this.router.navigate(['/main/member/dashboard']);
        }
      }
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
      });
  }

  startSlideshow(): void {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.sliderImages.length;
  }

  prevSlide(): void {
    this.currentSlide =
      this.currentSlide === 0 ? this.sliderImages.length - 1 : this.currentSlide - 1;
  }

  getStars(rating: number | undefined): number[] {
    return Array(Math.round(rating ?? 0)).fill(0);
  }

  isAuthPage(): boolean {
    return (
      this.currentRoute.includes('/login') ||
      this.currentRoute.includes('/register')
    );
  }

  // ปรับปรุง getPriceHtml ให้รองรับรูปแบบ "฿X,XXX/เดือน"
  getPriceHtml(price: string | undefined): string {
    // ไม่มี .replace() ในส่วนนี้แล้ว เพราะ mapDormToUi จะสร้าง string ที่สมบูรณ์แล้ว
    // จะมีแค่การเปลี่ยน \n เป็น <br> เท่านั้น
    return (price || '').replace(/\n/g, '<br>');
  }

  viewAllRecommended() {
    this.router.navigate(['/dorm-list']);
  }

  viewAllLatest() {
    this.router.navigate(['/dorm-list']);
  }

  viewDormDetail(dorm: UIDorm) {
    this.router.navigate(['/dorm-detail']);
  }

  onLogin() {
    this.router.navigate(['/login']);
  }

  onRegister() {
    this.router.navigate(['/register']);
  }

  private mapDormToUi(d: Dorm): UIDorm {
    let priceStr: string | null = null; // เริ่มต้นเป็น null เพื่อจัดการ logic ได้ง่ายขึ้น
    let hasDailyPrice = false;
    
    // ตรวจสอบ price_display ก่อนเสมอ
    if (d.price_display) {
      priceStr = d.price_display;
      hasDailyPrice = priceStr.includes('\n') || priceStr.includes('วัน'); // ตรวจสอบว่ามีการขึ้นบรรทัดใหม่หรือคำว่า 'วัน'
    } else {
      // ถ้าไม่มี price_display ให้สร้าง string จากข้อมูลที่มี
      let monthlyPriceText = '';
      
      if (d.min_price !== undefined && d.max_price !== undefined) {
        if (d.min_price === d.max_price) {
          monthlyPriceText = `฿${d.min_price.toLocaleString()}/เดือน`;
        } else {
          monthlyPriceText = `฿${d.min_price.toLocaleString()} - ฿${d.max_price.toLocaleString()}/เดือน`;
        }
      }
      else if (d.monthly_price) {
        monthlyPriceText = `฿${parseFloat(d.monthly_price).toLocaleString()}/เดือน`;
      }
      
      if (d.daily_price) {
        hasDailyPrice = true;
        let dailyPriceText = `฿${parseFloat(d.daily_price).toLocaleString()}/วัน`;
        if (monthlyPriceText) {
          priceStr = `${monthlyPriceText}\n${dailyPriceText}`; // ใช้ \n เพื่อขึ้นบรรทัดใหม่
        } else {
          priceStr = dailyPriceText;
        }
      } else {
        priceStr = monthlyPriceText;
      }
    }

    // fallback image logic
    let imageUrl = d.main_image_url || d.thumbnail_url;
    if (!imageUrl) {
      imageUrl = 'assets/images/photo.png';
    }

    // location display logic
    let locationDisplay = '';
    if (d.zone_name) {
      locationDisplay = d.zone_name;
    } else if (d.location_display) {
      locationDisplay = d.location_display;
    } else if (d.address) {
      locationDisplay = d.address.length > 50 ? d.address.substring(0, 47) + '...' : d.address;
    }

    return {
      id: d.dorm_id,
      image: imageUrl,
      price: priceStr || 'ราคาไม่ระบุ',
      name: d.dorm_name,
      location: locationDisplay,
      date: d.updated_date ? new Date(d.updated_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
      rating: d.rating ?? 5,
      hasDailyPrice: hasDailyPrice
    };
  }

  private loadImagesForList(list: UIDorm[]): void {
    list.forEach((card) => {
      const fallbackImage = card.image;
      this.dormSvc.getImages(card.id).subscribe({
        next: imgs => {
          if (imgs && imgs.length > 0) {
            card.image = imgs[0].image_url;
          } else {
            card.image = fallbackImage;
          }
        },
        error: (err) => {
          console.error(`Error loading images for dorm ${card.id}:`, err);
          card.image = fallbackImage;
        }
      });
    });
  }
}