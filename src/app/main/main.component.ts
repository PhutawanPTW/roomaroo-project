import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

// Dormitory interface
interface Dorm {
  image: string;
  price: string;
  name: string;
  location: string;
  date: string;
  rating: number;
}

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent],
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

  recommendedDorms: Dorm[] = [
    {
      image: 'https://s3-ap-southeast-1.amazonaws.com/builk3storage/project/20161028_122650_project_2045817_big.jpg',
      price: '2,600 - 3,000บาท/เดือน',
      name: 'หอพักวีรวิชญ์',
      location: 'ใกล้มหาวิทยาลัย',
      date: '12 พฤษภาคม 2024',
      rating: 5.0,
    },
    {
      image: 'https://s3-ap-southeast-1.amazonaws.com/builk3storage/project/20161028_122650_project_2045817_big.jpg',
      price: '2,600 - 3,000บาท/เดือน\n400 บาท/วัน',
      name: 'หอพักเรือนร่มเย็น',
      location: 'ใกล้มหาวิทยาลัย',
      date: '8 พฤษภาคม 2024',
      rating: 5.0,
    },
    {
      image: 'https://s3-ap-southeast-1.amazonaws.com/builk3storage/project/20161028_122650_project_2045817_big.jpg',
      price: '2,600 - 3,000บาท/เดือน',
      name: 'หอพักวีรวิชญ์ชาย',
      location: 'ใกล้มหาวิทยาลัย',
      date: '15 พฤษภาคม 2024',
      rating: 5.0,
    },
    {
      image: 'https://s3-ap-southeast-1.amazonaws.com/builk3storage/project/20161028_122650_project_2045817_big.jpg',
      price: '2,600 - 3,000บาท/เดือน',
      name: 'หอพักหญิงเรือนร่มเย็น',
      location: 'ใกล้มหาวิทยาลัย',
      date: '3 พฤษภาคม 2024',
      rating: 5.0,
    },
  ];

  latestDorms: Dorm[] = [
    {
      image: 'https://s3-ap-southeast-1.amazonaws.com/builk3storage/project/20161028_122650_project_2045817_big.jpg',
      price: '2,600 - 3,000บาท/เดือน',
      name: 'หอพักหญิงเรือนร่มเย็น',
      location: 'ใกล้มหาวิทยาลัย',
      date: '10 พฤษภาคม 2024',
      rating: 5.0,
    },
    {
      image: 'https://s3-ap-southeast-1.amazonaws.com/builk3storage/project/20161028_122650_project_2045817_big.jpg',
      price: '2,600 - 3,000บาท/เดือน',
      name: 'หอพักวีรวิชญ์',
      location: 'ใกล้มหาวิทยาลัย',
      date: '14 พฤษภาคม 2024',
      rating: 5.0,
    },
    {
      image: 'https://s3-ap-southeast-1.amazonaws.com/builk3storage/project/20161028_122650_project_2045817_big.jpg',
      price: '2,600 - 3,000บาท/เดือน\n400 บาท/วัน',
      name: 'หอพักเรือนร่มเย็น',
      location: 'ใกล้มหาวิทยาลัย',
      date: '6 พฤษภาคม 2024',
      rating: 5.0,
    },
    {
      image: 'https://s3-ap-southeast-1.amazonaws.com/builk3storage/project/20161028_122650_project_2045817_big.jpg',
      price: '2,600 - 3,000บาท/เดือน',
      name: 'หอพักวีรวิชญ์ชาย',
      location: 'ใกล้มหาวิทยาลัย',
      date: '1 พฤษภาคม 2024',
      rating: 5.0,
    },
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // กำหนดค่าเริ่มต้นเมื่อโหลดครั้งแรก
    this.currentRoute = this.router.url;
    this.startSlideshow();

    // ติดตามการเปลี่ยนแปลงของ route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
        console.log('Current route updated:', this.currentRoute);
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

  getStars(rating: number): number[] {
    return Array(Math.round(rating)).fill(0);
  }

  // เมธอดใหม่สำหรับตรวจสอบหน้า authentication
  isAuthPage(): boolean {
    // เช็คว่า URL ปัจจุบันเป็นหน้า login หรือ register หรือไม่
    return (
      this.currentRoute.includes('/login') ||
      this.currentRoute.includes('/register')
    );
  }

  getPriceHtml(price: string): string {
    return price.replace(/\n/g, '<br>');
  }

  viewAllRecommended() {
    this.router.navigate(['/dorm-list']);
  }

  viewAllLatest() {
    this.router.navigate(['/dorm-list']);
  }

  viewDormDetail(dorm: Dorm) {
    // สมมติว่ามี id หรือ slug ใน dorm ในอนาคต สามารถส่ง param ได้
    this.router.navigate(['/dorm-detail']);
  }

  onLogin() {
    this.router.navigate(['/login']);
  }

  onRegister() {
    this.router.navigate(['/register']);
  }
}
