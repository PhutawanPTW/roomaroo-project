import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService, UserProfile } from '../services/auth.service';
import { DormitoryService, Dorm } from '../services/dormitory.service';
import { NavbarComponent } from './navbar/navbar.component';

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
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
})
export class MainComponent implements OnInit {
  currentRoute: string = '';

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
  slideInterval: any;

  // Full lists
  recommendedDorms: UIDorm[] = [];
  latestDorms: UIDorm[] = [];
  
  // Displayed lists (limited to 4)
  displayedRecommended: UIDorm[] = [];
  displayedLatest: UIDorm[] = [];

  constructor(private router: Router, private authService: AuthService, private dormSvc: DormitoryService) {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
    });
  }

  ngOnInit() {
    this.startSlideshow();
    this.loadDormitories();

    this.authService.currentUser$.subscribe((user: UserProfile | null) => {
      if (user) {
        if (user.memberType === 'owner') {
          this.router.navigate(['/owner']);
        } else if (user.memberType === 'member') {
          this.router.navigate(['/main/member/dashboard']);
        }
      }
    });
  }

  private async loadDormitories() {
    try {
      // Load recommended dorms
      const recommended = await this.dormSvc.getRecommended().toPromise();
      if (recommended) {
        this.recommendedDorms = recommended.map(d => this.mapDormToUi(d));
        this.displayedRecommended = this.recommendedDorms.slice(0, 4); // Limit to 4 items
        this.loadImagesForList(this.displayedRecommended);
      }

      // Load latest dorms
      const latest = await this.dormSvc.getLatest().toPromise();
      if (latest) {
        this.latestDorms = latest.map(d => this.mapDormToUi(d));
        this.displayedLatest = this.latestDorms.slice(0, 4); // Limit to 4 items
        this.loadImagesForList(this.displayedLatest);
      }
    } catch (error) {
      console.error('Error loading dormitories:', error);
    }
  }

  startSlideshow(): void {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 3000);
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

  getStars(rating: number | undefined): number[] {
    // Always return 5 stars for mock data
    return Array(5).fill(0);
  }

  isAuthPage(): boolean {
    return this.currentRoute.includes('login') ||
      this.currentRoute.includes('register') ||
      this.currentRoute.includes('owner');
  }

  getPriceHtml(price: string | undefined): string {
    if (!price) return '';
    return price.replace(/\n/g, '<br>');
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
    this.router.navigate(['/register']);
  }

  private mapDormToUi(d: Dorm): UIDorm {
    let priceDisplay = '';
    let hasDailyPrice = false;

    // Format price display
    if (d.daily_price) {
      priceDisplay = `${d.daily_price} บาท/วัน`;
      hasDailyPrice = true;
      if (d.monthly_price) {
        priceDisplay += `\n${d.monthly_price} บาท/เดือน`;
      }
    } else if (d.monthly_price) {
      priceDisplay = `${d.monthly_price} บาท/เดือน`;
    } else if (d.min_price && d.max_price) {
      priceDisplay = `${d.min_price.toLocaleString()} - ${d.max_price.toLocaleString()} บาท/เดือน`;
    } else if (d.price_display) {
      priceDisplay = d.price_display;
    }

    // Format location display
    let locationDisplay = d.location_display || d.address || '';
    if (d.zone_name) {
      locationDisplay = locationDisplay ? `${locationDisplay} (${d.zone_name})` : d.zone_name;
    }

    return {
      id: d.dorm_id,
      name: d.dorm_name,
      price: priceDisplay,
      location: locationDisplay,
      image: d.main_image_url || d.thumbnail_url || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      date: d.updated_date ? new Date(d.updated_date).toLocaleDateString('th-TH') : '',
      rating: 5.0, // Mock rating data (always 5.0)
      hasDailyPrice
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
}