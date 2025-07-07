import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService, UserProfile } from '../../services/auth.service';
import { OwnerDormitoryService } from '../../services/owner-dormitory.service';
import { filter } from 'rxjs/operators';
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

  recommendedDorms = [
    {
      image: 'https://s3-ap-southeast-1.amazonaws.com/builk3storage/project/20161028_122650_project_2045817_big.jpg',
      price: '2,600 - 3,000บาท/เดือน',
      name: 'หอพักวีรวิชญ์',
      location: 'ใกล้มหาวิทยาลัย',
      date: '12 พฤษภาคม 2024',
      rating: 5.0,
      verified: true
    },
    {
      image: 'https://s3-ap-southeast-1.amazonaws.com/builk3storage/project/20161028_122650_project_2045817_big.jpg',
      price: '2,600 - 3,000บาท/เดือน\n400 บาท/วัน',
      name: 'หอพักเรือนร่มเย็น',
      location: 'ใกล้มหาวิทยาลัย',
      date: '8 พฤษภาคม 2024',
      rating: 5.0,
      verified: false
    },
    {
      image: 'https://s3-ap-southeast-1.amazonaws.com/builk3storage/project/20161028_122650_project_2045817_big.jpg',
      price: '2,600 - 3,000บาท/เดือน',
      name: 'หอพักวีรวิชญ์ชาย',
      location: 'ใกล้มหาวิทยาลัย',
      date: '15 พฤษภาคม 2024',
      rating: 5.0,
      verified: true
    },
  ];

  latestDorms = [
    { name: 'หอพัก D', price: '2,600 - 3,000 บาท/เดือน', image: 'assets/images/dorm5.jpg', rating: 5.0, updated: '14 พฤษภาคม 2024' },
    { name: '400 บาท/วัน', price: '2,600 - 3,000 บาท/เดือน', image: 'assets/images/dorm6.jpg', rating: 5.0, updated: '10 พฤษภาคม 2024' },
    { name: '400 บาท/วัน', price: '2,600 - 3,000 บาท/เดือน', image: 'assets/images/dorm7.jpg', rating: 5.0, updated: '10 พฤษภาคม 2024' },
    { name: 'หอพัก E', price: '2,600 - 3,000 บาท/เดือน', image: 'assets/images/dorm8.jpg', rating: 5.0, updated: '10 พฤษภาคม 2024' }
  ];

  myDorms: any[] = [];

  constructor(private authService: AuthService, private ownerDormService: OwnerDormitoryService) { }

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
              this.myDorms.forEach((dorm, idx) => {
                console.log(`[OwnerComponent] Dorm #${idx + 1}:`, dorm);
              });
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
    if (dorm.min_price && dorm.max_price) {
      priceDisplay = `${dorm.min_price.toLocaleString()} - ${dorm.max_price.toLocaleString()} บาท/เดือน`;
    } else if (dorm.monthly_price) {
      priceDisplay = `${dorm.monthly_price.toLocaleString()} บาท/เดือน`;
    }
    if (dorm.daily_price) {
      priceDisplay += `\n${dorm.daily_price.toLocaleString()} บาท/วัน`;
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