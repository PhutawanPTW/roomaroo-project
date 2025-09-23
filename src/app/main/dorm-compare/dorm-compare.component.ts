import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { DormCompareService, CompareDormItem } from '../../services/dorm-compare.service';
import { Subscription } from 'rxjs';

interface CompareDormData extends CompareDormItem {
  description: string;
  dailyPrice?: number;
  monthlyPrice?: number;
  termPrice?: number;
  rating: number;
  reviewCount: number;
  amenities: string[];
  ownerName: string;
  ownerPhone: string;
  distance: string;
}

@Component({
  selector: 'app-dorm-compare',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './dorm-compare.component.html'
})
export class DormCompareComponent implements OnInit, OnDestroy {
  compareDorms: CompareDormData[] = [];
  sortBy: string = 'rating';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Amenities lists
  internalAmenities = [
    'แอร์', 'พัดลม', 'TV', 'เครื่องทำน้ำอุ่น', 'ตู้เย็น', 'ตู้เสื้อผ้า', 
    'เตียงนอน', 'โต๊ะทำงาน', 'โต๊ะเครื่องแป้ง', 'โซฟา', 'ซิงค์ล้างจาน', 
    'ไมโครเวฟ', 'อนุญาติให้เลี้ยงสัตว์ได้', 'เครื่องซักผ้า', 'คีย์การ์ด', 
    'กล้องวงจรปิด', 'ลิฟต์'
  ];
  
  externalAmenities = [
    'WIFI', 'รปภ.', 'ฟิตเนส', 'ตู้กดน้ำหยอดเหรียญ', 
    'สระว่ายน้ำ', 'ที่จอดรถ', 'Lobby'
  ];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private dormCompareService: DormCompareService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load mockup data instead of real data
    this.loadMockupData();
    this.sortDorms();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadMockupData(): void {
    const mockDorms: CompareDormData[] = [];
    
    for (let i = 0; i < 5; i++) {
      mockDorms.push({
        id: i + 1,
        name: `หอพักรวยมาก ${i + 1}`,
        description: this.getMockDescription(i),
        location: this.getMockLocation(i),
        zone: this.getMockZone(i),
        distance: this.getMockDistance(i),
        price: this.getMockPrice(i),
        dailyPrice: this.getMockDailyPrice(i),
        monthlyPrice: this.getMockMonthlyPrice(i),
        termPrice: this.getMockTermPrice(i),
        rating: this.getMockRating(i),
        reviewCount: this.getMockReviewCount(i),
        amenities: this.getMockAmenities(i),
        ownerName: this.getMockOwnerName(i),
        ownerPhone: this.getMockPhone(i),
        image: this.getMockImage(i)
      });
    }
    
    this.compareDorms = mockDorms;
  }

  private mapToCompareData(items: CompareDormItem[]): CompareDormData[] {
    return items.map((item, index) => ({
      ...item,
      description: this.getMockDescription(index),
      dailyPrice: this.getMockDailyPrice(index),
      monthlyPrice: this.getMockMonthlyPrice(index),
      termPrice: this.getMockTermPrice(index),
      rating: this.getMockRating(index),
      reviewCount: this.getMockReviewCount(index),
      amenities: this.getMockAmenities(index),
      ownerName: this.getMockOwnerName(index),
      ownerPhone: this.getMockPhone(index),
      distance: this.getMockDistance(index)
    }));
  }

  sortDorms(): void {
    this.compareDorms.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.sortBy) {
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'price':
          aValue = a.monthlyPrice || 0;
          bValue = b.monthlyPrice || 0;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (this.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  onSortChange(): void {
    this.sortDorms();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortDorms();
  }

  goBack(): void {
    this.router.navigate(['/main']);
  }

  viewDormDetail(dormId: number): void {
    this.router.navigate(['/dorm-detail', dormId]);
  }

  removeFromCompare(dormId: number): void {
    this.dormCompareService.removeFromCompare(dormId);
  }

  clearAll(): void {
    this.dormCompareService.clearAllCompare();
  }

  getStars(rating: number): number[] {
    const fullStars = Math.floor(rating);
    return Array(fullStars).fill(0);
  }

  getMockElectricityCost(dormId: number): string {
    const costs = ['8 บาท/หน่วย', '9 บาท/หน่วย', '8 บาท/หน่วย', '8 บาท/หน่วย', 'โทรสอบถาม'];
    return costs[dormId % costs.length];
  }

  getMockWaterCost(dormId: number): string {
    const costs = [
      'เหมาจ่าย 100 บาท/เดือน', 
      'เหมาจ่าย 100 บาท/เดือน', 
      '22 บาท/หน่วย', 
      '22 บาท/หน่วย', 
      '22 บาท/หน่วย'
    ];
    return costs[dormId % costs.length];
  }

  getAmenityIcon(amenity: string): string {
    const iconMap: { [key: string]: string } = {
      'แอร์': 'fa-snowflake',
      'พัดลม': 'fa-fan',
      'TV': 'fa-tv',
      'เครื่องทำน้ำอุ่น': 'fa-hot-tub',
      'ตู้เย็น': 'fa-igloo',
      'ตู้เสื้อผ้า': 'fa-tshirt',
      'เตียงนอน': 'fa-bed',
      'โต๊ะทำงาน': 'fa-desktop',
      'โต๊ะเครื่องแป้ง': 'fa-solid fa-wand-magic-sparkles',
      'โซฟา': 'fa-couch',
      'ซิงค์ล้างจาน': 'fa-sink',
      'ไมโครเวฟ': 'fa-microphone',
      'อนุญาติให้เลี้ยงสัตว์ได้': 'fa-paw',
      'เครื่องซักผ้า': 'fa-tshirt',
      'คีย์การ์ด': 'fa-key',
      'กล้องวงจรปิด': 'fa-video',
      'ลิฟต์': 'fa-elevator',
      'WIFI': 'fa-wifi',
      'รปภ.': 'fa-shield-alt',
      'ฟิตเนส': 'fa-dumbbell',
      'ตู้กดน้ำหยอดเหรียญ': 'fa-tint',
      'สระว่ายน้ำ': 'fa-swimming-pool',
      'ที่จอดรถ': 'fa-car',
      'Lobby': 'fa-building'
    };
    return iconMap[amenity] || 'fa-list';
  }

  hasAmenity(dormId: number, amenity: string): boolean {
    // สร้างข้อมูลสิ่งอำนวยความสะดวกที่แตกต่างกันสำหรับแต่ละหอพัก
    const amenityData: { [key: number]: string[] } = {
      1: ['แอร์', 'พัดลม', 'TV', 'เครื่องทำน้ำอุ่น', 'ตู้เย็น', 'ตู้เสื้อผ้า', 'เตียงนอน', 'โต๊ะทำงาน', 'โต๊ะเครื่องแป้ง', 'โซฟา', 'ซิงค์ล้างจาน', 'ไมโครเวฟ', 'เครื่องซักผ้า', 'คีย์การ์ด', 'กล้องวงจรปิด', 'ลิฟต์', 'WIFI', 'รปภ.', 'ฟิตเนส', 'ตู้กดน้ำหยอดเหรียญ', 'สระว่ายน้ำ', 'ที่จอดรถ', 'Lobby'],
      2: ['แอร์', 'พัดลม', 'TV', 'เครื่องทำน้ำอุ่น', 'ตู้เย็น', 'ตู้เสื้อผ้า', 'เตียงนอน', 'โต๊ะทำงาน', 'โซฟา', 'ซิงค์ล้างจาน', 'เครื่องซักผ้า', 'คีย์การ์ด', 'กล้องวงจรปิด', 'WIFI', 'รปภ.', 'ที่จอดรถ', 'Lobby'],
      3: ['แอร์', 'พัดลม', 'TV', 'เครื่องทำน้ำอุ่น', 'ตู้เสื้อผ้า', 'เตียงนอน', 'โต๊ะทำงาน', 'โต๊ะเครื่องแป้ง', 'โซฟา', 'ซิงค์ล้างจาน', 'อนุญาติให้เลี้ยงสัตว์ได้', 'เครื่องซักผ้า', 'กล้องวงจรปิด', 'ลิฟต์', 'WIFI', 'รปภ.', 'ฟิตเนส', 'ตู้กดน้ำหยอดเหรียญ', 'สระว่ายน้ำ', 'ที่จอดรถ', 'Lobby'],
      4: ['แอร์', 'พัดลม', 'TV', 'เครื่องทำน้ำอุ่น', 'ตู้เย็น', 'ตู้เสื้อผ้า', 'เตียงนอน', 'โต๊ะทำงาน', 'โต๊ะเครื่องแป้ง', 'โซฟา', 'ซิงค์ล้างจาน', 'ไมโครเวฟ', 'อนุญาติให้เลี้ยงสัตว์ได้', 'เครื่องซักผ้า', 'คีย์การ์ด', 'กล้องวงจรปิด', 'ลิฟต์', 'WIFI', 'รปภ.', 'ฟิตเนส', 'ตู้กดน้ำหยอดเหรียญ', 'สระว่ายน้ำ', 'ที่จอดรถ', 'Lobby'],
      5: ['แอร์', 'พัดลม', 'TV', 'เครื่องทำน้ำอุ่น', 'ตู้เย็น', 'ตู้เสื้อผ้า', 'เตียงนอน', 'โต๊ะทำงาน', 'โต๊ะเครื่องแป้ง', 'โซฟา', 'ซิงค์ล้างจาน', 'ไมโครเวฟ', 'อนุญาติให้เลี้ยงสัตว์ได้', 'เครื่องซักผ้า', 'คีย์การ์ด', 'กล้องวงจรปิด', 'ลิฟต์', 'WIFI', 'รปภ.', 'ฟิตเนส', 'ตู้กดน้ำหยอดเหรียญ', 'สระว่ายน้ำ', 'ที่จอดรถ', 'Lobby']
    };

    const dormAmenities = amenityData[dormId] || [];
    return dormAmenities.includes(amenity);
  }

  // Mockup Data Generators
  private getMockDescription(index: number): string {
    const descriptions = [
      'หอพักสไตล์โมเดิร์น ใกล้มหาวิทยาลัย ปลอดภัย มีระบบรักษาความปลอดภัย 24 ชั่วโมง',
      'หอพักใหม่ ใกล้ห้างสรรพสินค้า เดินทางสะดวก มีสิ่งอำนวยความสะดวกครบครัน',
      'หอพักสไตล์ลอฟท์ ดีไซน์เก๋ ใกล้สถานีรถไฟ มีพื้นที่ส่วนรวมสำหรับนั่งเล่น',
      'หอพักใกล้โรงพยาบาล เงียบสงบ เหมาะสำหรับนักศึกษาแพทย์ มีห้องสมุดส่วนตัว',
      'หอพักใกล้สนามบิน เดินทางสะดวก มีบริการรับส่งสนามบิน ปลอดภัย'
    ];
    return descriptions[index % descriptions.length];
  }

  private getMockDailyPrice(index: number): number {
    const prices = [150, 200, 180, 220, 160];
    return prices[index % prices.length];
  }

  private getMockMonthlyPrice(index: number): number {
    const prices = [4500, 6000, 5400, 6600, 4800];
    return prices[index % prices.length];
  }

  private getMockTermPrice(index: number): number {
    const prices = [15000, 20000, 18000, 22000, 16000];
    return prices[index % prices.length];
  }

  private getMockRating(index: number): number {
    const ratings = [4.2, 4.8, 4.5, 4.1, 4.6];
    return ratings[index % ratings.length];
  }

  private getMockReviewCount(index: number): number {
    const counts = [23, 45, 32, 18, 38];
    return counts[index % counts.length];
  }

  private getMockAmenities(index: number): string[] {
    const amenitiesList = [
      ['WiFi', 'เครื่องปรับอากาศ', 'ตู้เย็น', 'เครื่องซักผ้า', 'ที่จอดรถ'],
      ['WiFi', 'เครื่องปรับอากาศ', 'ตู้เย็น', 'เครื่องซักผ้า', 'ที่จอดรถ', 'ฟิตเนส', 'สระว่ายน้ำ'],
      ['WiFi', 'เครื่องปรับอากาศ', 'ตู้เย็น', 'เครื่องซักผ้า', 'ที่จอดรถ', 'ห้องสมุด'],
      ['WiFi', 'เครื่องปรับอากาศ', 'ตู้เย็น', 'เครื่องซักผ้า', 'ที่จอดรถ', 'ร้านค้า'],
      ['WiFi', 'เครื่องปรับอากาศ', 'ตู้เย็น', 'เครื่องซักผ้า', 'ที่จอดรถ', 'ฟิตเนส', 'สระว่ายน้ำ', 'ห้องสมุด']
    ];
    return amenitiesList[index % amenitiesList.length];
  }

  private getMockOwnerName(index: number): string {
    const names = ['สมชาย ใจดี', 'สมหญิง รักลูก', 'สมศักดิ์ ใจงาม', 'สมพร ใจบุญ', 'สมหมาย ใจเย็น'];
    return names[index % names.length];
  }

  private getMockPhone(index: number): string {
    const phones = ['081-234-5678', '082-345-6789', '083-456-7890', '084-567-8901', '085-678-9012'];
    return phones[index % phones.length];
  }

  private getMockDistance(index: number): string {
    const distances = ['0.5 กม.', '1.2 กม.', '0.8 กม.', '1.5 กม.', '0.3 กม.'];
    return distances[index % distances.length];
  }

  private getMockZone(index: number): string {
    const zones = ['ขามเรียง', 'ท่าขอนยาง', 'ดอนนา', 'คู่แก้ว', 'หน้ามอ'];
    return zones[index % zones.length];
  }

  private getMockPrice(index: number): string {
    const prices = ['2,600 - 3,000 บาท/เดือน', '3,500 - 4,200 บาท/เดือน', '1,800 - 2,500 บาท/เดือน', '4,000 - 5,000 บาท/เดือน', '3,200 - 3,800 บาท/เดือน'];
    return prices[index % prices.length];
  }

  private getMockLocation(index: number): string {
    const locations = [
      'ถนนมิตรภาพ ตำบลในเมือง อำเภอเมือง จังหวัดขอนแก่น',
      'ถนนศรีจันทร์ ตำบลในเมือง อำเภอเมือง จังหวัดขอนแก่น',
      'ถนนประชาสโมสร ตำบลในเมือง อำเภอเมือง จังหวัดขอนแก่น',
      'ถนนรื่นรมย์ ตำบลในเมือง อำเภอเมือง จังหวัดขอนแก่น',
      'ถนนกลางเมือง ตำบลในเมือง อำเภอเมือง จังหวัดขอนแก่น'
    ];
    return locations[index % locations.length];
  }

  private getMockImage(index: number): string {
    const images = [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=400&h=300&fit=crop'
    ];
    return images[index % images.length];
  }
}