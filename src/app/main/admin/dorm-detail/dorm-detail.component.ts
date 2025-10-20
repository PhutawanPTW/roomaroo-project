import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

interface RoomType {
  type: string;
  bed_type: string;
  pricePerDay: number | null;
  pricePerMonth: number | null;
  pricePerTerm: number | null;
  pricePerSummer: number | null;
}

interface Amenity {
  id: string;
  name: string;
  location_type: string;
}

interface DormDetail {
  dorm_id: string;
  dorm_name: string;
  address: string;
  zone_name: string;
  description: string;
  owner_name: string;
  owner_username: string;
  submitted_date: string;
  main_image_url: string;
  images: string[];
  roomTypes: RoomType[];
  amenities: Amenity[];
  electricity_type: string;
  electricity_rate: number | null;
  water_type: string;
  water_rate: number | null;
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-dorm-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dorm-detail.component.html',
  styleUrl: './dorm-detail.component.css',
  animations: [
    trigger('slideCenter', [
      transition(':increment', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':decrement', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class DormDetailComponent implements OnInit {
  dormId: string = '';
  currentStep: 1 | 2 = 1;
  
  // Mock data
  dormDetail: DormDetail = {
    dorm_id: '1',
    dorm_name: 'สันกรีฑาอโศก',
    address: 'ระบุที่อยู่ของหอพัก ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 54150',
    zone_name: 'โซน A',
    description: 'อธิบายรายละเอียดของหอพัก สิ่งอำนวยความสะดวก และข้อมูลอื่นๆ รายละเอียดเพิ่มเติมเกี่ยวกับหอพัก สิ่งอำนวยความสะดวก และข้อมูลอื่นๆ ที่น่าสนใจ',
    owner_name: 'สมชาย ใจดี',
    owner_username: 'somchai123',
    submitted_date: '15-01-2025',
    main_image_url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'
    ],
    roomTypes: [
      {
        type: 'ห้องพัดลม',
        bed_type: 'เตียงเดี่ยว',
        pricePerDay: 200,
        pricePerMonth: 3500,
        pricePerTerm: null,
        pricePerSummer: null
      },
      {
        type: 'ห้องแอร์',
        bed_type: 'เตียงคู่',
        pricePerDay: null,
        pricePerMonth: 5500,
        pricePerTerm: 15000,
        pricePerSummer: 8000
      }
    ],
    amenities: [
      { id: 'wifi', name: 'Wi-Fi', location_type: 'ภายใน' },
      { id: 'aircon', name: 'เครื่องปรับอากาศ', location_type: 'ภายใน' },
      { id: 'bed', name: 'เตียง', location_type: 'ภายใน' },
      { id: 'wardrobe', name: 'ตู้เสื้อผ้า', location_type: 'ภายใน' },
      { id: 'cctv', name: 'กล้องวงจรปิด', location_type: 'ภายนอก' },
      { id: 'parking', name: 'ที่จอดรถ', location_type: 'ภายนอก' },
      { id: 'elevator', name: 'ลิฟต์', location_type: 'ภายนอก' }
    ],
    electricity_type: 'คิดตามหน่วย',
    electricity_rate: 8,
    water_type: 'เหมาจ่าย',
    water_rate: 200,
    latitude: 18.7883,
    longitude: 98.9853
  };

  // Image carousel
  currentImageIndex = 0;
  imageModalOpen = false;
  imageModalIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.dormId = this.route.snapshot.paramMap.get('id') || '';
    // TODO: Load actual dorm data from service
  }

  get prevImageIndex(): number {
    return this.currentImageIndex === 0 
      ? this.dormDetail.images.length - 1 
      : this.currentImageIndex - 1;
  }

  get nextImageIndex(): number {
    return this.currentImageIndex === this.dormDetail.images.length - 1 
      ? 0 
      : this.currentImageIndex + 1;
  }

  onPrevImage(): void {
    this.currentImageIndex = this.prevImageIndex;
  }

  onNextImage(): void {
    this.currentImageIndex = this.nextImageIndex;
  }

  openImageModal(index: number): void {
    this.imageModalIndex = index;
    this.imageModalOpen = true;
  }

  closeImageModal(): void {
    this.imageModalOpen = false;
  }

  prevModalImage(): void {
    this.imageModalIndex = this.imageModalIndex === 0 
      ? this.dormDetail.images.length - 1 
      : this.imageModalIndex - 1;
  }

  nextModalImage(): void {
    this.imageModalIndex = this.imageModalIndex === this.dormDetail.images.length - 1 
      ? 0 
      : this.imageModalIndex + 1;
  }

  goToStep(step: 1 | 2): void {
    this.currentStep = step;
  }

  formatNumberOrDash(value: number | null): string {
    return value ? value.toLocaleString('th-TH') : '-';
  }

  getRoomDisplayName(rt: RoomType): string {
    return `${rt.type} (${rt.bed_type})`;
  }

  getPriceRangeText(): string {
    const prices = this.dormDetail.roomTypes
      .map(rt => rt.pricePerMonth)
      .filter(p => p !== null) as number[];
    
    if (prices.length === 0) return '-';
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    if (min === max) {
      return `${min.toLocaleString('th-TH')} บาท/เดือน`;
    }
    return `${min.toLocaleString('th-TH')} - ${max.toLocaleString('th-TH')} บาท/เดือน`;
  }

  getAmenitiesByLocation(locationType: string): Amenity[] {
    return this.dormDetail.amenities.filter(a => a.location_type === locationType);
  }

  approveDorm(): void {
    if (confirm('คุณแน่ใจหรือไม่ที่จะอนุมัติหอพักนี้?')) {
      // TODO: Call API to approve
      alert('อนุมัติหอพักเรียบร้อยแล้ว');
      this.router.navigate(['/admin']);
    }
  }

  rejectDorm(): void {
    const reason = prompt('กรุณาระบุเหตุผลในการไม่อนุมัติ:');
    if (reason) {
      // TODO: Call API to reject with reason
      alert('ไม่อนุมัติหอพักเรียบร้อยแล้ว');
      this.router.navigate(['/admin']);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
