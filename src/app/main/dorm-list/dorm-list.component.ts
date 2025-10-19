import { Component, Directive, ElementRef, EventEmitter, HostListener, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { DormitoryService, Dorm as APIDorm, Zone } from '../../services/dormitory.service';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ComparePopupComponent } from '../shared/compare-popup/compare-popup.component';

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
  imports: [CommonModule, NavbarComponent, FormsModule, ClickOutsideDirective, RouterModule, ComparePopupComponent],
  templateUrl: './dorm-list.component.html',
  styleUrls: ['./dorm-list.component.css']
})
export class DormListComponent implements OnInit {
  // Filter variables
  showPriceFilter = false;
  showFilterPopup = false;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  filterMinPrice: number | null = null;
  filterMaxPrice: number | null = null;
  selectedZone: string = '';
  sortOrder: string = '';
  searchQuery: string = '';

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

  // API filtering state
  currentFilters: any = {};
  isFiltering = false;
  searchResults: {id: number, name: string}[] = [];
  showSearchResults = false;

  // Amenities array สำหรับแสดงสิ่งอำนวยความสะดวกในตัวกรอง (อัปเดตตาม API specification)
  amenities = [
    { id: 1, name: 'แอร์', available: true, checked: false },
    { id: 2, name: 'พัดลม', available: true, checked: false },
    { id: 3, name: 'TV', available: false, checked: false },
    { id: 10, name: 'เครื่องทำน้ำอุ่น', available: true, checked: false },
    { id: 4, name: 'ตู้เย็น', available: true, checked: false },
    { id: 7, name: 'ตู้เสื้อผ้า', available: true, checked: false },
    { id: 5, name: 'เตียงนอน', available: true, checked: false },
    { id: 8, name: 'โต๊ะทำงาน', available: true, checked: false },
    { id: 12, name: 'โต๊ะเครื่องแป้ง', available: false, checked: false },
    { id: 11, name: 'ซิงค์ล้างจาน', available: true, checked: false },
    { id: 9, name: 'ไมโครเวฟ', available: true, checked: false },
    { id: 24, name: 'เครื่องซักผ้า', available: true, checked: false },
    { id: 23, name: 'คีย์การ์ด', available: true, checked: false },
    { id: 13, name: 'กล้องวงจรปิด', available: false, checked: false },
    { id: 15, name: 'ลิฟต์', available: false, checked: false },
    { id: 6, name: 'WIFI', available: true, checked: false },
    { id: 14, name: 'รปภ.', available: false, checked: false },
    { id: 17, name: 'ฟิตเนส', available: false, checked: false },
    { id: 19, name: 'ตู้กดน้ำหยอดเหรียญ', available: false, checked: false },
    { id: 20, name: 'สระว่ายน้ำ', available: false, checked: false },
    { id: 16, name: 'ที่จอดรถ', available: false, checked: false },
    { id: 18, name: 'Lobby', available: false, checked: false },
    { id: 22, name: 'อนุญาตให้เลี้ยงสัตว์', available: false, checked: false }
  ];

  // Zone options
  zones: Zone[] = [];

  // All dorms and filtered dorms
  dorms: UIDorm[] = [];
  filteredDorms: UIDorm[] = [];
  recommendedDorms: UIDorm[] = [];
  latestDorms: UIDorm[] = [];
  isLoading = true;

  // Pagination variables
  displayedDorms: UIDorm[] = [];
  showLoadMoreButton = false;
  private readonly ITEMS_PER_PAGE = 20;

  private pendingLoads = 0;

  // เพิ่มตัวแปรสำหรับ similar search
  similarSearchParams: any = null;

  constructor(
    private dormitoryService: DormitoryService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {
    this.loadZones();
  }

  ngOnInit() {
    // รับ query parameters
    this.route.queryParams.subscribe(params => {
      if (params['type'] === 'similar' && params['from'] === 'dorm-detail') {
        // เก็บพารามิเตอร์สำหรับการค้นหาหอพักที่คล้ายกัน
        this.similarSearchParams = {
          currentDormId: parseInt(params['currentDormId']) || 0,
          similarName: params['similarName'] || '',
          zone: params['zone'] || '',
          minPrice: parseInt(params['minPrice']) || null,
          maxPrice: parseInt(params['maxPrice']) || null,
          amenities: params['amenities'] ? params['amenities'].split(',') : []
        };
        
        // ตั้งค่าโซนที่เลือกตามข้อมูลที่ส่งมา
        if (this.similarSearchParams.zone) {
          this.selectedZone = this.similarSearchParams.zone;
        }
        
        // ตั้งค่าช่วงราคาตามข้อมูลที่ส่งมา
        if (this.similarSearchParams.minPrice && this.similarSearchParams.maxPrice) {
          // ขยายช่วงราคา ±20% เพื่อหาหอพักในราคาใกล้เคียง
          const priceRange = this.similarSearchParams.maxPrice - this.similarSearchParams.minPrice;
          const buffer = Math.max(priceRange * 0.2, 1000); // อย่างน้อย 1000 บาท
          
          this.minPrice = Math.max(0, this.similarSearchParams.minPrice - buffer);
          this.maxPrice = this.similarSearchParams.maxPrice + buffer;
        }
        
        console.log('Similar search params:', this.similarSearchParams);
      }
      
      this.loadDormitories();
    });
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
    this.isLoading = true;
    this.pendingLoads = 2;
    // ดึงข้อมูล recommended และ latest เหมือนใน main
    this.dormitoryService.getRecommended().subscribe({
      next: (recommended: APIDorm[]) => {
        console.log('Recommended dorms from API:', recommended);
        this.recommendedDorms = recommended.map(d => this.mapDormToUi(d));
        this.dorms = [...this.recommendedDorms]; // ใช้ recommended เป็นฐานข้อมูลเริ่มต้น
        this.applyFilters();
        this.updateDisplayedDorms();
        this.markLoadDone();
      },
      error: (error) => {
        console.error('Error fetching recommended dorms:', error);
        this.markLoadDone();
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
        this.updateDisplayedDorms();
        this.markLoadDone();
      },
      error: (error) => {
        console.error('Error fetching latest dorms:', error);
        this.markLoadDone();
      }
    });
  }

  private markLoadDone() {
    this.pendingLoads = Math.max(0, this.pendingLoads - 1);
    if (this.pendingLoads === 0) {
      this.isLoading = false;
    }
  }

  private mapDormToUi(d: APIDorm): UIDorm {
    console.log('[DormListComponent] Raw dorm data from API:', d);
    console.log('[DormListComponent] Rating fields:', {
      rating: d.rating,
      avg_rating: (d as any).avg_rating,
      review_count: (d as any).review_count
    });

    let priceDisplay = '';

    // จัดการราคารายเดือน
    if (d.min_price != null && d.max_price != null) {
      const minVal = Number(d.min_price);
      const maxVal = Number(d.max_price);
      priceDisplay = (minVal === maxVal)
        ? `${minVal.toLocaleString()} บาท/เดือน`
        : `${minVal.toLocaleString()} - ${maxVal.toLocaleString()} บาท/เดือน`;
    } else if (d.monthly_price != null) {
      priceDisplay = `${Number(d.monthly_price).toLocaleString()} บาท/เดือน`;
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

    // ใช้ avg_rating จาก API ใหม่ หรือ fallback ไป rating เก่า
    // แปลง string เป็น number ก่อน
    const avgRating = (d as any).avg_rating;
    const finalRating = avgRating ? Number(avgRating) : (d.rating || 0.0);
    console.log('[DormListComponent] Final rating used:', finalRating);

    return {
      id: d.dorm_id,
      image: d.thumbnail_url || d.main_image_url || 'assets/images/photo.png',
      price: priceDisplay,
      name: d.dorm_name,
      location: locationDisplay,
      zone: d.zone_name || 'ไม่ระบุโซน',
      date: d.updated_date ? this.formatThaiDate(d.updated_date) : '',
      rating: finalRating
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

  getSafePriceHtml(price: string | undefined): SafeHtml {
    const html = this.getPriceHtml(price);
    return this.sanitizer.sanitize(1, html) || '';
  }

  getStars(rating: number | undefined): { filled: boolean }[] {
    const stars: { filled: boolean }[] = [];
    const actualRating = rating || 0;
    
    for (let i = 1; i <= 5; i++) {
      stars.push({ filled: i <= actualRating });
    }
    
    return stars;
  }

  togglePriceFilter(event: Event) {
    event.stopPropagation();
    this.showPriceFilter = !this.showPriceFilter;
  }

  applyPriceFilterOld() {
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
    this.isFiltering = true;
    
    // ถ้าเป็นการค้นหาหอพักที่คล้ายกัน ให้ใช้ similar search
    if (this.similarSearchParams) {
      this.applySimilarFilters();
      return;
    }

    // ใช้ API filtering แทน client-side filtering
    this.applyAPIFilters();
  }

  private applyAPIFilters() {
    // เริ่มต้นด้วย recommended dorms
    this.dormitoryService.getRecommended(20).subscribe({
      next: (dorms: APIDorm[]) => {
        this.dorms = dorms.map(d => this.mapDormToUi(d));
        this.filteredDorms = [...this.dorms];
        this.updateDisplayedDorms();
        this.isFiltering = false;
      },
      error: (error) => {
        console.error('Error fetching recommended dorms:', error);
        this.isFiltering = false;
      }
    });
  }

  // Method สำหรับกรองหอพักที่คล้ายกัน
  applySimilarFilters(): void {
    if (!this.similarSearchParams) return;

    let filtered = [...this.dorms];

    // 1. กรองออกหอพักปัจจุบัน
    filtered = filtered.filter(dorm => dorm.id !== this.similarSearchParams.currentDormId);

    // 2. ให้คะแนนความคล้าย และเรียงตามคะแนน
    const scoredDorms = filtered.map(dorm => ({
      ...dorm,
      similarityScore: this.calculateSimilarityScore(dorm)
    }));

    // เรียงตามคะแนนความคล้าย (สูงไปต่ำ)
    scoredDorms.sort((a, b) => b.similarityScore - a.similarityScore);

    // ส่งกลับเฉพาะหอพักที่มีคะแนนความคล้าย > 0
    this.filteredDorms = scoredDorms
      .filter(dorm => dorm.similarityScore > 0)
      .map(({ similarityScore, ...dorm }) => dorm); // เอา similarityScore ออก
    
    this.updateDisplayedDorms();
  }

  // คำนวณคะแนนความคล้าย
  calculateSimilarityScore(dorm: UIDorm): number {
    let score = 0;
    const params = this.similarSearchParams;

    // 1. โซนเดียวกัน (+30 คะแนน)
    if (dorm.zone === params.zone) {
      score += 30;
    }

    // 2. ชื่อหอพักที่คล้ายกัน (+20 คะแนน)
    if (params.similarName && dorm.name) {
      const similarity = this.calculateNameSimilarity(dorm.name, params.similarName);
      score += similarity * 20;
    }

    // 3. ราคาในช่วงใกล้เคียง (+25 คะแนน)
    if (params.minPrice && params.maxPrice) {
      const dormPrice = this.getDormPrice(dorm);
      const priceScore = this.calculatePriceSimilarity(dormPrice, params.minPrice, params.maxPrice);
      score += priceScore * 25;
    }

    // 4. สิ่งอำนวยความสะดวกที่คล้ายกัน (+25 คะแนน)
    // Note: ในปัจจุบันเราไม่มีข้อมูล amenities ใน UIDorm 
    // ถ้าต้องการใช้ต้องเพิ่มข้อมูลนี้ในอนาคต

    return score;
  }

  // คำนวณความคล้ายของชื่อ (Simple string similarity)
  calculateNameSimilarity(name1: string, name2: string): number {
    const str1 = name1.toLowerCase();
    const str2 = name2.toLowerCase();
    
    // ถ้ามีคำเดียวกัน
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let commonWords = 0;
    for (const word1 of words1) {
      if (word1.length > 2 && words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        commonWords++;
      }
    }
    
    return commonWords / Math.max(words1.length, words2.length);
  }

  // คำนวณความคล้ายของราคา
  calculatePriceSimilarity(dormPrice: number, minPrice: number, maxPrice: number): number {
    const midPrice = (minPrice + maxPrice) / 2;
    const priceRange = maxPrice - minPrice;
    
    // ถ้าราคาอยู่ในช่วง ให้คะแนนเต็ม
    if (dormPrice >= minPrice && dormPrice <= maxPrice) {
      return 1;
    }
    
    // คำนวณระยะห่างจากช่วงราคา
    const distance = Math.min(Math.abs(dormPrice - minPrice), Math.abs(dormPrice - maxPrice));
    const maxDistance = priceRange; // ระยะห่างสูงสุดที่ยังให้คะแนน
    
    return Math.max(0, 1 - (distance / maxDistance));
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

  // ===== NEW API FILTERING METHODS =====

  /** Search dormitories by name (autocomplete) */
  onSearchInput(event: any) {
    const query = event.target.value.trim();
    this.searchQuery = query;
    
    if (query.length >= 2) {
      this.dormitoryService.searchDormitories(query, 10).subscribe({
        next: (results) => {
          this.searchResults = results;
          this.showSearchResults = true;
        },
        error: (error) => {
          console.error('Error searching dormitories:', error);
          this.searchResults = [];
        }
      });
    } else {
      this.searchResults = [];
      this.showSearchResults = false;
    }
  }

  /** Select a search result */
  selectSearchResult(result: {id: number, name: string}) {
    this.searchQuery = result.name;
    this.showSearchResults = false;
    // Navigate to dorm detail or apply search filter
    this.applySearchFilter(result.id);
  }

  /** Apply search filter */
  private applySearchFilter(dormId: number) {
    // For now, just navigate to dorm detail
    // In the future, could implement search-based filtering
    console.log('Selected dorm:', dormId);
  }

  /** Apply rent type filter */
  applyRentTypeFilter() {
    const hasDaily = this.filters.daily;
    const hasMonthly = this.filters.monthly;
    
    if (!hasDaily && !hasMonthly) {
      this.applyAPIFilters();
      return;
    }

    this.isFiltering = true;
    this.dormitoryService.filterByRentType({
      daily: hasDaily,
      monthly: hasMonthly,
      limit: 20
    }).subscribe({
      next: (dorms: APIDorm[]) => {
        this.dorms = dorms.map(d => this.mapDormToUi(d));
        this.filteredDorms = [...this.dorms];
        this.updateDisplayedDorms();
        this.isFiltering = false;
      },
      error: (error) => {
        console.error('Error filtering by rent type:', error);
        this.isFiltering = false;
      }
    });
  }

  /** Apply rating filter */
  applyRatingFilter() {
    const selectedStars: number[] = [];
    if (this.filters.rating5) selectedStars.push(5);
    if (this.filters.rating4) selectedStars.push(4);
    if (this.filters.rating3) selectedStars.push(3);
    if (this.filters.rating2) selectedStars.push(2);
    if (this.filters.rating1) selectedStars.push(1);
    
    if (selectedStars.length === 0) {
      this.applyAPIFilters();
      return;
    }

    this.isFiltering = true;
    this.dormitoryService.filterByRating({
      stars: selectedStars,
      limit: 20
    }).subscribe({
      next: (dorms: APIDorm[]) => {
        this.dorms = dorms.map(d => this.mapDormToUi(d));
        this.filteredDorms = [...this.dorms];
        this.updateDisplayedDorms();
        this.isFiltering = false;
      },
      error: (error) => {
        console.error('Error filtering by rating:', error);
        this.isFiltering = false;
      }
    });
  }

  /** Apply price filter */
  applyPriceFilter() {
    const minPrice = this.filterMinPrice;
    const maxPrice = this.filterMaxPrice;
    
    if (!minPrice && !maxPrice) {
      this.applyAPIFilters();
      return;
    }

    this.isFiltering = true;
    this.dormitoryService.filterByPrice({
      min: minPrice || undefined,
      max: maxPrice || undefined,
      limit: 20
    }).subscribe({
      next: (dorms: APIDorm[]) => {
        this.dorms = dorms.map(d => this.mapDormToUi(d));
        this.filteredDorms = [...this.dorms];
        this.updateDisplayedDorms();
        this.isFiltering = false;
      },
      error: (error) => {
        console.error('Error filtering by price:', error);
        this.isFiltering = false;
      }
    });
  }

  /** Apply amenities filter */
  applyAmenitiesFilter() {
    const selectedAmenities = this.amenities
      .filter(amenity => amenity.checked)
      .map(amenity => amenity.id);
    
    if (selectedAmenities.length === 0) {
      this.applyAPIFilters();
      return;
    }

    this.isFiltering = true;
    this.dormitoryService.filterByAmenities({
      ids: selectedAmenities,
      match: 'any', // หรือ 'all' ตามต้องการ
      limit: 20
    }).subscribe({
      next: (dorms: APIDorm[]) => {
        this.dorms = dorms.map(d => this.mapDormToUi(d));
        this.filteredDorms = [...this.dorms];
        this.updateDisplayedDorms();
        this.isFiltering = false;
      },
      error: (error) => {
        console.error('Error filtering by amenities:', error);
        this.isFiltering = false;
      }
    });
  }

  // ล้างการค้นหาหอพักที่คล้ายกัน
  clearSimilarSearch() {
    this.similarSearchParams = null;
    this.selectedZone = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.sortOrder = '';
    
    // รีเซ็ตฟิลเตอร์ทั้งหมด
    this.clearFilters();
    
    // โหลดข้อมูลใหม่
    this.loadDormitories();
  }

  // Update displayed dorms based on pagination
  updateDisplayedDorms() {
    this.displayedDorms = this.filteredDorms.slice(0, this.ITEMS_PER_PAGE);
    this.showLoadMoreButton = this.filteredDorms.length > this.ITEMS_PER_PAGE;
  }

  // Load more dorms when "ดูหอพักทั้งหมด" is clicked
  loadMoreDorms() {
    const currentLength = this.displayedDorms.length;
    const nextBatch = this.filteredDorms.slice(currentLength, currentLength + this.ITEMS_PER_PAGE);
    this.displayedDorms = [...this.displayedDorms, ...nextBatch];
    
    // Hide button if all dorms are displayed
    this.showLoadMoreButton = this.displayedDorms.length < this.filteredDorms.length;
  }

  // Format date to Thai format
  formatThaiDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist Era
    
    return `อัพเดทล่าสุด: ${day} ${month} ${year}`;
  }
}