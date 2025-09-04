import { Component, Directive, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { DormitoryService, Dorm as APIDorm, Zone } from '../../services/dormitory.service';
import { RouterModule } from '@angular/router';

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

// UI model used in template (all required)
interface UIDorm {
  id: number;
  image: string;
  price: string;
  dailyPrice?: string;
  monthlyPrice?: string;
  name: string;
  location: string;
  zone: string;
  date: string;
  rating: number;
}

@Component({
  selector: 'app-dorm-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FormsModule, ClickOutsideDirective, RouterModule],
  templateUrl: './dorm-list.component.html',
  styleUrls: ['./dorm-list.component.css']
})
export class DormListComponent {
  // Filter variables
  showPriceFilter = false;
  showFilterPopup = false;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  filterMinPrice: number | null = null;
  filterMaxPrice: number | null = null;
  selectedZone: string = '';
  sortOrder: string = '';

  // Filter properties
  filters = {
    daily: false,
    monthly: false,
    rating5: false,
    rating4: false,
    rating3: false,
    rating2: false,
    rating1: false
  };

  // Amenities array สำหรับแสดงสิ่งอำนวยความสะดวกในตัวกรอง
  amenities = [
    { name: 'แอร์', available: true, checked: false },
    { name: 'พัดลม', available: true, checked: false },
    { name: 'TV', available: false, checked: false },
    { name: 'เครื่องทำน้ำอุ่น', available: true, checked: false },
    { name: 'ตู้เย็น', available: true, checked: false },
    { name: 'ตู้เสื้อผ้า', available: true, checked: false },
    { name: 'เตียงนอน', available: true, checked: false },
    { name: 'โต๊ะทำงาน', available: true, checked: false },
    { name: 'โต๊ะเครื่องแป้ง', available: false, checked: false },
    { name: 'โซฟา', available: false, checked: false },
    { name: 'อนุญาติให้เลี้ยงสัตว์', available: false, checked: false },
    { name: 'ซิงค์ล้างจาน', available: true, checked: false },
    { name: 'ไมโครเวฟ', available: true, checked: false },
    { name: 'เครื่องซักผ้า', available: true, checked: false },
    { name: 'คีย์การ์ด', available: true, checked: false },
    { name: 'กล้องวงจรปิด', available: false, checked: false },
    { name: 'ลิฟต์', available: false, checked: false },
    { name: 'WIFI', available: true, checked: false },
    { name: 'รปภ.', available: false, checked: false },
    { name: 'ฟิตเนส', available: false, checked: false },
    { name: 'ตู้กดน้ำหยอดเหรียญ', available: false, checked: false },
    { name: 'สระว่ายน้ำ', available: false, checked: false },
    { name: 'ที่จอดรถ', available: false, checked: false },
    { name: 'Lobby', available: false, checked: false }
  ];

  // Zone options
  zones: Zone[] = [];

  // All dorms and filtered dorms
  dorms: UIDorm[] = [];
  filteredDorms: UIDorm[] = [];
  recommendedDorms: UIDorm[] = [];
  latestDorms: UIDorm[] = [];

  constructor(private dormitoryService: DormitoryService) {
    this.loadZones();
    this.loadDormitories();
  }

  loadZones() {
    this.dormitoryService.getAllZones().subscribe({
      next: (zones) => {
        this.zones = zones;
      },
      error: (error) => {
        console.error('Error fetching zones:', error);
      }
    });
  }

  loadDormitories() {
    // ดึงข้อมูล recommended และ latest เหมือนใน main
    this.dormitoryService.getRecommended().subscribe({
      next: (recommended: APIDorm[]) => {
        console.log('Recommended dorms from API:', recommended);
        this.recommendedDorms = recommended.map(d => this.mapDormToUi(d));
        this.dorms = [...this.recommendedDorms]; // ใช้ recommended เป็นฐานข้อมูลเริ่มต้น
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error fetching recommended dorms:', error);
      }
    });

    this.dormitoryService.getLatest().subscribe({
      next: (latest: APIDorm[]) => {
        console.log('Latest dorms from API:', latest);
        this.latestDorms = latest.map(d => this.mapDormToUi(d));
        
        // รวม latest เข้ากับ dorms และกำจัดข้อมูลซ้ำโดยใช้ dorm_id
        const allDorms = [...this.dorms, ...this.latestDorms];
        const uniqueDorms = allDorms.filter((dorm, index, self) => 
          index === self.findIndex(d => d.id === dorm.id)
        );
        
        this.dorms = uniqueDorms;
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error fetching latest dorms:', error);
      }
    });
  }

  private mapDormToUi(d: APIDorm): UIDorm {
    let priceDisplay = '';

    // จัดการราคารายเดือน
    if (d.min_price && d.max_price) {
      priceDisplay = `${d.min_price.toLocaleString()} - ${d.max_price.toLocaleString()} บาท/เดือน`;
    } else if (d.monthly_price) {
      priceDisplay = `${d.monthly_price.toLocaleString()} บาท/เดือน`;
    }

    // เพิ่มราคารายวันในบรรทัดที่สอง (ถ้ามี)
    if (d.daily_price) {
      priceDisplay += `\n${d.daily_price.toLocaleString()} บาท/วัน`;
    }

    // Format location display
    let locationDisplay = d.location_display || d.address || '';
    if (d.zone_name) {
      locationDisplay = locationDisplay ? `${locationDisplay} (${d.zone_name})` : d.zone_name;
    }

    return {
      id: d.dorm_id,
      image: d.thumbnail_url || d.main_image_url || 'assets/images/photo.png',
      price: priceDisplay,
      name: d.dorm_name,
      location: locationDisplay,
      zone: d.zone_name || 'ไม่ระบุโซน',
      date: d.updated_date ? new Date(d.updated_date).toLocaleDateString('th-TH') : '',
      rating: d.rating || 5.0
    };
  }

  private loadImagesForList(list: UIDorm[]): void {
    list.forEach(dorm => {
      if (dorm.image) {
        const img = new Image();
        img.src = dorm.image;
      }
    });
  }

  getPriceHtml(price: string | undefined): string {
    if (!price) return '';

    const lines = price.split('\n');
    let html = '';

    if (lines[0]) {
      const monthlyMatch = lines[0].match(/([\d,]+)(\s*-\s*[\d,]+)?\s*(บาท\/เดือน)/);
      if (monthlyMatch) {
        if (monthlyMatch[2]) {
          const [_, start, range, unit] = monthlyMatch;
          html += `<div class="price-monthly">
            <span class="font-english">${start}</span>
            <span class="font-english">${range}</span>
            <span class="font-thai unit">${unit}</span>
          </div>`;
        } else {
          const [_, number, __, unit] = monthlyMatch;
          html += `<div class="price-monthly">
            <span class="font-english">${number}</span>
            <span class="font-thai unit">${unit}</span>
          </div>`;
        }
      }
    }

    if (lines[1]) {
      const dailyMatch = lines[1].match(/([\d,]+)\s*(บาท\/วัน)/);
      if (dailyMatch) {
        const [_, number, unit] = dailyMatch;
        html += `<div class="price-daily">
          <span class="font-english">${number}</span>
          <span class="font-thai unit">${unit}</span>
        </div>`;
      }
    }

    return html;
  }

  getStars(rating: number | undefined): number[] {
    return Array(5).fill(0); // ใช้ 5 ดาวเหมือนใน main
  }

  togglePriceFilter(event: Event) {
    event.stopPropagation();
    this.showPriceFilter = !this.showPriceFilter;
  }

  applyPriceFilter() {
    this.applyFilters();
    this.showPriceFilter = false;
  }

  filterByZone(zone: string) {
    this.selectedZone = zone;
    this.applyFilters();
  }

  applySelectedSort() {
    this.applyFilters();
  }

  getDormPrice(dorm: UIDorm): number {
    const match = dorm.price.match(/([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : 0;
  }

  isInPriceRange(dorm: UIDorm): boolean {
    if (this.minPrice === null && this.maxPrice === null) {
      return true;
    }

    const dormPrice = this.getDormPrice(dorm);

    if (this.minPrice !== null && dormPrice < this.minPrice) {
      return false;
    }

    if (this.maxPrice !== null && dormPrice > this.maxPrice) {
      return false;
    }

    return true;
  }

  applyFilters() {
    let filtered = [...this.dorms];

    // Filter by zone
    if (this.selectedZone) {
      filtered = filtered.filter(dorm => dorm.zone === this.selectedZone);
    }

    // Filter by price range
    filtered = filtered.filter(dorm => this.isInPriceRange(dorm));

    // Sort by price
    if (this.sortOrder) {
      filtered.sort((a, b) => {
        const priceA = this.getDormPrice(a);
        const priceB = this.getDormPrice(b);
        return this.sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      });
    }

    this.filteredDorms = filtered;
  }

  getDormsByZone(): Record<string, UIDorm[]> {
    const grouped: Record<string, UIDorm[]> = {};

    this.zones.forEach(zone => {
      grouped[zone.zone_name] = [];
    });

    this.dorms.forEach(dorm => {
      if (dorm.zone && grouped[dorm.zone]) {
        grouped[dorm.zone].push(dorm);
      }
    });

    return grouped;
  }

  getActiveZones(): string[] {
    const grouped = this.getDormsByZone();
    return Object.entries(grouped)
      .filter(([_, dorms]) => dorms.length > 0)
      .map(([zone]) => zone);
  }

  toggleFilterPopup(event: Event) {
    event.stopPropagation();
    this.showFilterPopup = !this.showFilterPopup;
    if (this.showFilterPopup) {
      this.showPriceFilter = false;
    }
  }

  clearPriceFilter() {
    this.minPrice = null;
    this.maxPrice = null;
    this.applyFilters();
    this.showPriceFilter = false;
  }

  clearFilters() {
    // Reset all filter properties
    this.filters = {
      daily: false,
      monthly: false,
      rating5: false,
      rating4: false,
      rating3: false,
      rating2: false,
      rating1: false
    };
    
    // Reset amenities
    this.amenities.forEach(amenity => {
      amenity.checked = false;
    });
    
    // Reset filter prices
    this.filterMinPrice = null;
    this.filterMaxPrice = null;
    
    this.applyFilters();
    this.showFilterPopup = false;
  }

  toggleAmenity(amenity: any) {
    amenity.checked = !amenity.checked;
  }
}