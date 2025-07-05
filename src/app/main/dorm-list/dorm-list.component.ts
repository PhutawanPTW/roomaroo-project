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

@Component({
  selector: 'app-dorm-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FormsModule, ClickOutsideDirective, RouterModule],
  templateUrl: './dorm-list.component.html',
  styleUrl: './dorm-list.component.css'
})
export class DormListComponent {
  // Filter variables
  showPriceFilter = false;
  showFilterPopup = false;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedZone: string = '';
  sortOrder: string = '';
  
  // Zone options
  zones: Zone[] = [];

  // All dorms and filtered dorms
  dorms: APIDorm[] = [];
  filteredDorms: APIDorm[] = [];

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
    this.dormitoryService.getAllDormitories().subscribe({
      next: (dorms) => {
        this.dorms = dorms;
        this.filteredDorms = [...dorms];
      },
      error: (error) => {
        console.error('Error fetching dormitories:', error);
      }
    });
  }

  getStars(rating: number | undefined): number[] {
    const ratingValue = rating || 0;
    return Array(Math.round(ratingValue)).fill(0);
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

  // ฟังก์ชันสำหรับแปลงราคาให้เป็น number
  getDormPrice(dorm: APIDorm): number {
    // ใช้ monthly_price ก่อน ถ้าไม่มีให้ใช้ min_price
    const price = dorm.monthly_price || dorm.min_price;
    // แปลงเป็น number หรือ return 0 ถ้าไม่มีราคา
    return typeof price === 'number' ? price : 0;
  }

  // ฟังก์ชันสำหรับตรวจสอบว่าหอพักอยู่ในช่วงราคาที่กำหนดหรือไม่
  isInPriceRange(dorm: APIDorm): boolean {
    // ถ้าไม่ได้กำหนดช่วงราคา ให้แสดงทั้งหมด
    if (this.minPrice === null && this.maxPrice === null) {
      return true;
    }

    // ดึงราคาจากหอพัก
    const dormPrice = this.getDormPrice(dorm);

    // ถ้ามีการกำหนดราคาต่ำสุด
    if (this.minPrice !== null && dormPrice < this.minPrice) {
      return false;
    }

    // ถ้ามีการกำหนดราคาสูงสุด
    if (this.maxPrice !== null && dormPrice > this.maxPrice) {
      return false;
    }

    return true;
  }

  applyFilters() {
    let filtered = [...this.dorms];

    // Filter by zone
    if (this.selectedZone) {
      filtered = filtered.filter(dorm => dorm.zone_name === this.selectedZone);
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

  // Group dorms by zone
  getDormsByZone(): Record<string, APIDorm[]> {
    const grouped: Record<string, APIDorm[]> = {};
    
    // Initialize groups with all zones
    this.zones.forEach(zone => {
      grouped[zone.zone_name] = [];
    });

    // Group dorms by zone
    this.dorms.forEach(dorm => {
      if (dorm.zone_name && grouped[dorm.zone_name]) {
        grouped[dorm.zone_name].push(dorm);
      }
    });

    return grouped;
  }

  // Get active zones (zones that have dorms)
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
}
