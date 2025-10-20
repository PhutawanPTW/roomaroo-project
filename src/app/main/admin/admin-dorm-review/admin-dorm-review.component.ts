import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-admin-dorm-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dorm-review.component.html',
  styleUrls: ['./admin-dorm-review.component.css']
})
export class AdminDormReviewComponent implements OnInit {
  dormId: string = '';
  currentImageIndex = 0;
  
  // Mock data
  dormData = {
    name: 'สินทรัพย์อีซี่โฮม สระว่ายน้ำสาโลบา',
    address: 'สินทรัพย์ครัว้อผลิโอนม (สินทรัพย์ครัว้อผลิโอนม) • ถ ก้อมอตนอ อ.ก้อนครัว้ต อ.ม ภาราอเรม 44150',
    zone: 'ใกล้มหาวิทยาลัย',
    price: '3,500 ฿',
    owner: {
      name: 'นายสมชาย ใจดี',
      username: 'somchai_jaidee',
      phone: '081-234-5678',
      submitDate: '15-01-2025'
    },
    electricity: '8.00 บาท/หน่วย',
    water: 'เหมาจ่าย: 200 บาท/เดือน',
    description: 'สินทรัพย์ครัว้อผลิโอนม ตั้งอยู่ที่ Unnamed Road ตำบบ ก้อมอตนอ อำเภอ ก้อนครัว้ต ม ภาราอเรม 44150 ประเทศไทย มี: คอลกาเนอก้อลตัวอยราคริม (5 กม.), ห้ม้นอเมอสลอัมคค็ส ม ภาราอเรม (7 กม.), สถาตมพบาบท้อัมเคค (8 กม.), โอนดกเนแบขวมัปกึส ม ภาราอเรม (10 กม.)',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'
    ],
    roomTypes: [
      { type: 'ห้องพัดลม + แอร์', monthly: '3,500', daily: '-', term: '-', summer: '-' },
      { type: 'ห้องแอร์', monthly: '3,500', daily: '-', term: '-', summer: '-' }
    ],
    location: {
      latitude: '16.24948508',
      longitude: '103.26976854'
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.dormId = this.route.snapshot.paramMap.get('id') || '';
    console.log('Reviewing dorm ID:', this.dormId);
  }

  get prevImageIndex(): number {
    return this.currentImageIndex === 0 
      ? this.dormData.images.length - 1 
      : this.currentImageIndex - 1;
  }

  get nextImageIndex(): number {
    return this.currentImageIndex === this.dormData.images.length - 1 
      ? 0 
      : this.currentImageIndex + 1;
  }

  onPrevImage(): void {
    this.currentImageIndex = this.prevImageIndex;
  }

  onNextImage(): void {
    this.currentImageIndex = this.nextImageIndex;
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }

  onReject(): void {
    const reason = prompt('กรุณาระบุเหตุผลในการไม่อนุมัติ:');
    if (reason) {
      console.log('Rejected dorm:', this.dormId, 'Reason:', reason);
      alert('ไม่อนุมัติหอพักเรียบร้อยแล้ว');
      this.router.navigate(['/admin']);
    }
  }

  onApprove(): void {
    if (confirm('คุณแน่ใจหรือไม่ที่จะอนุมัติหอพักนี้?')) {
      console.log('Approved dorm:', this.dormId);
      alert('อนุมัติหอพักเรียบร้อยแล้ว');
      this.router.navigate(['/admin']);
    }
  }
}