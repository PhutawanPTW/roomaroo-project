import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-owner',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatGridListModule,
    MatButtonModule,
    MatIconModule,
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

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.subscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log('[OwnerComponent] Current user updated:', user);
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

  getPriceHtml(price: string): string {
    return price.replace(/\n/g, '<br>');
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