import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavbarComponent } from "../navbar/navbar.component";

@Component({
  selector: 'app-dorm-compare',
  imports: [CommonModule, NavbarComponent],
  templateUrl: './dorm-compare.component.html',
  styleUrl: './dorm-compare.component.css'
})
export class DormCompareComponent {
  lowestPriceDorm: any = null;
  bestZoneDorm: any = null;
  lowestElectricityDorm: any = null;
  selectedZone: string = '';
  
  zoneOptions = ['หน้ามอ', 'กู่แก้ว', 'ขามเรียง', 'ท่าขอนยาง', 'ดอนนา'];
  
  dorms = [
    {
      name: 'บางเขน',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
      price: '2,000 - 3,000 บาท/เดือน',
      rating: 4.5,
      reviews: 120,
      owner: 'บางเขน',
      electricity: '8 บาท/หน่วย',
      water: '18 บาท/หน่วย',
      internet: true,
      tv: true,
      air: true,
      furniture: true,
      parking: true,
      cctv: true,
      keycard: true,
      laundry: true,
      elevator: true,
      pet: false,
      lobby: true,
      fan: true,
      waterHeater: true,
      microwave: true,
      refrigerator: true,
      wardrobe: true,
      bed: true,
      desk: true,
      dressingTable: true,
      sofa: true,
      sink: true,
      petAllowed: false,
      washingMachine: true,
      studyRoom: true,
      wifi: true,
      security: true,
      fitness: true,
      waterDispenser: true,
      swimmingPool: true,
      zone: 'ขามเรียง'
    },
    {
      name: 'ศรีสมาน',
      image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80',
      price: '2,000 - 3,000 บาท/เดือน',
      rating: 4.2,
      reviews: 98,
      owner: 'ศรีสมาน',
      electricity: '8 บาท/หน่วย',
      water: '18 บาท/หน่วย',
      internet: true,
      tv: true,
      air: true,
      furniture: true,
      parking: true,
      cctv: true,
      keycard: true,
      laundry: true,
      elevator: true,
      pet: false,
      lobby: true,
      fan: true,
      waterHeater: true,
      microwave: true,
      refrigerator: true,
      wardrobe: true,
      bed: true,
      desk: true,
      dressingTable: true,
      sofa: true,
      sink: true,
      petAllowed: false,
      washingMachine: true,
      studyRoom: true,
      wifi: true,
      security: true,
      fitness: true,
      waterDispenser: true,
      swimmingPool: true,
      zone: 'ท่าขอนยาง'
    },
    {
      name: 'จตุจักร',
      image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=600&q=80',
      price: '2,500 - 3,200 บาท/เดือน',
      rating: 3,
      reviews: 80,
      owner: 'จตุจักร',
      electricity: '9 บาท/หน่วย',
      water: '20 บาท/หน่วย',
      internet: true,
      tv: false,
      air: true,
      furniture: true,
      parking: false,
      cctv: true,
      keycard: false,
      laundry: true,
      elevator: false,
      pet: false,
      lobby: true,
      fan: true,
      waterHeater: true,
      microwave: true,
      refrigerator: true,
      wardrobe: true,
      bed: true,
      desk: true,
      dressingTable: true,
      sofa: true,
      sink: true,
      petAllowed: false,
      washingMachine: true,
      studyRoom: true,
      wifi: true,
      security: true,
      fitness: true,
      waterDispenser: true,
      swimmingPool: true,
      zone: 'ดอนนา'
    },
    {
      name: 'ลาดพร้าว',
      image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80',
      price: '2,200 - 2,900 บาท/เดือน',
      rating: 5,
      reviews: 150,
      owner: 'ลาดพร้าว',
      electricity: '8 บาท/หน่วย',
      water: '18 บาท/หน่วย',
      internet: true,
      tv: true,
      air: true,
      furniture: true,
      parking: true,
      cctv: true,
      keycard: true,
      laundry: true,
      elevator: true,
      pet: true,
      lobby: true,
      fan: true,
      waterHeater: true,
      microwave: true,
      refrigerator: true,
      wardrobe: true,
      bed: true,
      desk: true,
      dressingTable: true,
      sofa: true,
      sink: true,
      petAllowed: false,
      washingMachine: true,
      studyRoom: true,
      wifi: true,
      security: true,
      fitness: true,
      waterDispenser: true,
      swimmingPool: true,
      zone: 'กู่แก้ว'
    },
    {
      name: 'รังสิต',
      image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=600&q=80',
      price: '2,000 - 2,800 บาท/เดือน',
      rating: 2,
      reviews: 60,
      owner: 'รังสิต',
      electricity: '7 บาท/หน่วย',
      water: '15 บาท/หน่วย',
      internet: false,
      tv: false,
      air: false,
      furniture: true,
      parking: true,
      cctv: false,
      keycard: false,
      laundry: false,
      elevator: false,
      pet: false,
      lobby: false,
      fan: true,
      waterHeater: true,
      microwave: true,
      refrigerator: true,
      wardrobe: true,
      bed: true,
      desk: true,
      dressingTable: true,
      sofa: true,
      sink: true,
      petAllowed: false,
      washingMachine: true,
      studyRoom: true,
      wifi: true,
      security: true,
      fitness: true,
      waterDispenser: true,
      swimmingPool: true,
      zone: 'หน้ามอ'
    },
    // เพิ่มข้อมูลหอพักอื่น ๆ ตามต้องการ
  ];

  sortBy(key: string) {
    this.lowestPriceDorm = null;
    this.bestZoneDorm = null;
    this.lowestElectricityDorm = null;
    
    if (key === 'price') {
      this.dorms.sort((a, b) => {
        // แปลงช่วงราคาเป็นตัวเลขต่ำสุด
        const getMin = (price: string) => parseInt(price.split('-')[0].replace(/[^\d]/g, ''));
        return getMin(a.price) - getMin(b.price);
      });
      
      // Set the lowest price dorm after sorting
      if (this.dorms.length > 0) {
        this.lowestPriceDorm = this.dorms[0];
      }
    } else if (key === 'zone') {
      this.dorms.sort((a, b) => a.zone.localeCompare(b.zone, 'th'));
      
      // Set the first zone alphabetically
      if (this.dorms.length > 0) {
        this.bestZoneDorm = this.dorms[0];
      }
    } else if (key === 'electricity') {
      const getNum = (val: string) => parseInt(val.replace(/[^\d]/g, ''));
      this.dorms.sort((a, b) => getNum(a.electricity) - getNum(b.electricity));
      
      // Set the lowest electricity cost dorm
      if (this.dorms.length > 0) {
        this.lowestElectricityDorm = this.dorms[0];
      }
    }
  }
  
  filterByZone(zone: string) {
    this.selectedZone = zone;
  }
  
  isDormInSelectedZone(dorm: any): boolean {
    return this.selectedZone !== '' && dorm.zone === this.selectedZone;
  }
}
