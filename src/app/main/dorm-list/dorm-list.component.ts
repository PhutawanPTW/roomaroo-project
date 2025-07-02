import { Component, Directive, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';

// Click outside directive
@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event.target'])
  onClick(target: any) {
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.clickOutside.emit();
    }
  }
}

interface Dorm {
  id: number;
  image: string;
  price: string;
  dailyPrice?: string;
  name: string;
  location: string;
  availability: string;
  rating: number;
  numericPrice?: number; // For filtering purposes
  zone: string; // Zone information
}

@Component({
  selector: 'app-dorm-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FormsModule, ClickOutsideDirective],
  templateUrl: './dorm-list.component.html',
  styleUrl: './dorm-list.component.css'
})
export class DormListComponent {
  // Filter variables
  showPriceFilter = false;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedZone: string = '';
  sortOrder: string = '';
  
  // Zone options
  zones: string[] = ['ขามเรียง', 'ท่าขอนยาง', 'ดอนนา', 'กู่แก้ว', 'หน้ามอ'];

  // All dorms and filtered dorms
  dorms: Dorm[] = [
    {
      id: 1,
      image: 'assets/images/dorms/dorm1.jpg',
      price: '2,600 - 3,000 บาท/เดือน',
      name: 'หอพักดวงจันทร์',
      location: 'โรงเรียนกรุงเทพ',
      availability: 'วันเข้าพัก: 10 พฤศจิกายน 2024',
      rating: 5.0,
      numericPrice: 2800,
      zone: 'ขามเรียง'
    },
    {
      id: 2,
      image: 'assets/images/dorms/dorm2.jpg',
      price: '2,600 - 3,000 บาท/เดือน',
      dailyPrice: '400 บาท/วัน',
      name: 'หอพักรวมชาย',
      location: 'วิทยาลัยสาธร',
      availability: 'วันเข้าพัก: 10 พฤศจิกายน 2024',
      rating: 5.0,
      numericPrice: 2800,
      zone: 'ท่าขอนยาง'
    },
    {
      id: 3,
      image: 'assets/images/dorms/dorm3.jpg',
      price: '2,600 - 3,000 บาท/เดือน',
      name: 'หอพักเปิดใหม่รวย',
      location: 'โรงเรียนกรุงเทพ',
      availability: 'วันเข้าพัก: 14 พฤศจิกายน 2024',
      rating: 5.0,
      numericPrice: 2800,
      zone: 'ดอนนา'
    },
    {
      id: 4,
      image: 'assets/images/dorms/dorm4.jpg',
      price: '2,600 - 3,000 บาท/เดือน',
      name: 'หอพักรวมหญิง',
      location: 'โรงเรียนกรุงเทพ',
      availability: 'วันเข้าพัก: 10 พฤศจิกายน 2024',
      rating: 5.0,
      numericPrice: 2800,
      zone: 'กู่แก้ว'
    },
    {
      id: 5,
      image: 'assets/images/dorms/dorm5.jpg',
      price: '3,500 บาท/เดือน',
      name: 'หอพัก The Ment',
      location: 'โรงเรียนกรุงเทพ',
      availability: 'วันเข้าพัก: 10 พฤศจิกายน 2024',
      rating: 5.0,
      numericPrice: 3500,
      zone: 'หน้ามอ'
    },
    {
      id: 6,
      image: 'assets/images/dorms/dorm6.jpg',
      price: '2,900 บาท/เดือน',
      name: 'หอพัก อยู่ดี',
      location: 'โรงเรียนกรุงเทพ',
      availability: 'วันเข้าพัก: 10 พฤศจิกายน 2024',
      rating: 5.0,
      numericPrice: 2900,
      zone: 'ขามเรียง'
    },
    {
      id: 7,
      image: 'assets/images/dorms/dorm7.jpg',
      price: '2,800 บาท/เดือน',
      name: 'หอพัก บ้านเรา',
      location: 'โรงเรียนกรุงเทพ',
      availability: 'วันเข้าพัก: 10 พฤศจิกายน 2024',
      rating: 5.0,
      numericPrice: 2800,
      zone: 'ท่าขอนยาง'
    },
    {
      id: 8,
      image: 'assets/images/dorms/dorm8.jpg',
      price: '2,600 บาท/เดือน',
      name: 'หอพัก Lucky Cover',
      location: 'โรงเรียนกรุงเทพ',
      availability: 'วันเข้าพัก: 10 พฤศจิกายน 2024',
      rating: 5.0,
      numericPrice: 2600,
      zone: 'ดอนนา'
    },
    {
      id: 9,
      image: 'assets/images/dorms/dorm9.jpg',
      price: '39,000 บาท/เดือน',
      name: 'หอพักวันทรี',
      location: 'โรงเรียนกรุงเทพ',
      availability: 'วันเข้าพัก: 10 พฤศจิกายน 2024',
      rating: 5.0,
      numericPrice: 39000,
      zone: 'กู่แก้ว'
    },
    {
      id: 10,
      image: 'assets/images/dorms/dorm10.jpg',
      price: '2,700 บาท/เดือน',
      name: 'หอพักสมบูรณ์',
      location: 'โรงเรียนกรุงเทพ',
      availability: 'วันเข้าพัก: 10 พฤศจิกายน 2024',
      rating: 5.0,
      numericPrice: 2700,
      zone: 'หน้ามอ'
    },
    {
      id: 11,
      image: 'assets/images/dorms/dorm11.jpg',
      price: '2,900 - 3,500 บาท/เดือน',
      name: 'หอพักนิวไลฟ์',
      location: 'จุฬาลงกรณ์มหาวิทยาลัย',
      availability: 'วันเข้าพัก: 15 พฤศจิกายน 2024',
      rating: 4.8,
      numericPrice: 3200,
      zone: 'ขามเรียง'
    },
    {
      id: 12,
      image: 'assets/images/dorms/dorm12.jpg',
      price: '3,200 บาท/เดือน',
      dailyPrice: '350 บาท/วัน',
      name: 'หอพักสุขสบาย',
      location: 'มหาวิทยาลัยธรรมศาสตร์',
      availability: 'วันเข้าพัก: 12 พฤศจิกายน 2024',
      rating: 4.5,
      numericPrice: 3200,
      zone: 'ท่าขอนยาง'
    }
  ];

  filteredDorms: Dorm[] = [];

  constructor() {
    this.filteredDorms = [...this.dorms];
  }

  getStars(rating: number): number[] {
    return Array(Math.round(rating)).fill(0);
  }

  togglePriceFilter(event: Event): void {
    event.stopPropagation();
    this.showPriceFilter = !this.showPriceFilter;
  }

  applyPriceFilter(): void {
    this.applyFilters();
    this.showPriceFilter = false;
  }

  filterByZone(zone: string): void {
    this.selectedZone = zone;
    this.applyFilters();
  }

  sortByPrice(order: string): void {
    this.sortOrder = order;
    
    if (order === 'asc') {
      this.filteredDorms.sort((a, b) => (a.numericPrice || 0) - (b.numericPrice || 0));
    } else if (order === 'desc') {
      this.filteredDorms.sort((a, b) => (b.numericPrice || 0) - (a.numericPrice || 0));
    }
  }

  // Apply selected sort from dropdown
  applySelectedSort(): void {
    if (this.sortOrder === 'asc' || this.sortOrder === 'desc') {
      this.sortByPrice(this.sortOrder);
    }
  }

  // Apply both zone and price filters
  applyFilters(): void {
    this.filteredDorms = this.dorms.filter(dorm => {
      // Apply zone filter if a zone is selected
      if (this.selectedZone && dorm.zone !== this.selectedZone) {
        return false;
      }
      
      // Apply price filter if min or max price is set
      const price = dorm.numericPrice || 0;
      if (this.minPrice !== null && price < this.minPrice) {
        return false;
      }
      if (this.maxPrice !== null && price > this.maxPrice) {
        return false;
      }
      
      return true;
    });
    
    // Apply sorting after filtering if sort order is set
    if (this.sortOrder === 'asc') {
      this.filteredDorms.sort((a, b) => (a.numericPrice || 0) - (b.numericPrice || 0));
    } else if (this.sortOrder === 'desc') {
      this.filteredDorms.sort((a, b) => (b.numericPrice || 0) - (a.numericPrice || 0));
    }
  }

  // Group dorms by zone
  getDormsByZone(): Record<string, Dorm[]> {
    const grouped: Record<string, Dorm[]> = {};
    
    // Initialize groups with all zones
    this.zones.forEach(zone => {
      grouped[zone] = [];
    });
    
    // Add dorms to their respective zone groups
    this.filteredDorms.forEach(dorm => {
      if (grouped[dorm.zone]) {
        grouped[dorm.zone].push(dorm);
      }
    });
    
    return grouped;
  }

  // Get zones that have dorms after filtering
  getActiveZones(): string[] {
    return this.zones.filter(zone => 
      this.filteredDorms.some(dorm => dorm.zone === zone)
    );
  }
}
