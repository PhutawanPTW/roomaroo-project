import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from "../navbar/navbar.component";
import { DormitoryService, DormDetail, Dorm, Amenity } from '../../services/dormitory.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface AmenityDisplay {
  amenity_id: number;
  name: string;
  available: boolean;
}

interface Review {
  username: string;
  avatar: string;
  comment: string;
  rating: number;
  isPositive: boolean;
}

interface SimilarProperty {
  id: number;
  name: string;
  price: string;
  location: string;
  zone?: string; // เพิ่ม zone field
  image: string;
  rating: number;
  date: string;
}

@Component({
  selector: 'app-dorm-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './dorm-detail.component.html',
  styleUrls: ['./dorm-detail.component.css']
})
export class DormDetailComponent implements OnInit {
  dormId: number = 0;
  dormDetail: DormDetail | null = null;

  // UI state
  currentImageIndex: number = 0;
  images: string[] = [];
  newComment: string = '';
  isLoading: boolean = true;
  error: string | null = null;

  // Mock data (จะถูกแทนที่ด้วยข้อมูลจริง)
  dormName: string = '';
  dormPrice: string = '';
  priceRange: string = '';
  location: string = '';
  owner: string = '';
  description: string = '';
  amenities: AmenityDisplay[] = [];
  
  ownerProfile = {
    name: '',
    image: '../../../assets/images/image-removebg-preview.png',
    lineId: ''
  };

  // สำหรับแผนที่
  mapUrl: SafeResourceUrl | null = null;
  showMap: boolean = false;
  mapLatitude: number | null = null;
  mapLongitude: number | null = null;

  // Reviews data (ยังไม่มีในระบบ)
  overallRating: number = 5.0;
  reviews: Review[] = [
    {
      username: 'สมหมาย',
      avatar: '../../../assets/images/image-removebg-preview.png',
      comment: 'หอดีมาก',
      rating: 5,
      isPositive: true
    }
  ];

  // Similar properties (using real data)
  similarProperties: SimilarProperty[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dormService: DormitoryService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // รับ dormId จาก URL
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.dormId = +id; // แปลงเป็นตัวเลข
        this.loadDormitoryDetail();
        this.loadSimilarDormitories(); // เพิ่มการโหลดหอพักที่คล้ายกัน
      }
    });
  }

  private async loadDormitoryDetail() {
    try {
      this.isLoading = true;
      this.error = null;

      // Load dormitory detail and all amenities in parallel
      const [detail, allAmenities] = await Promise.all([
        this.dormService.getDormitoryById(this.dormId).toPromise(),
        this.dormService.getAllAmenities().toPromise()
      ]);

      if (!detail) {
        throw new Error('ไม่พบข้อมูลหอพัก');
      }

      // Log ข้อมูลทั้งหมดที่ได้จาก API
      console.log('API Response - Full dormitory detail:', detail);
      console.log('All amenities from API:', allAmenities);

      // อัพเดทข้อมูลหอพัก
      this.dormDetail = detail;
      
      // Map the API fields to the expected fields in the template
      if (detail.water_rate && !detail.water_bill) {
        detail.water_bill = detail.water_rate;
      }
      
      if (detail.electricity_rate && !detail.electric_bill) {
        detail.electric_bill = detail.electricity_rate;
      }
      
      if (detail.dorm_description && !detail.description) {
        detail.description = detail.dorm_description;
      }
      
      this.dormName = detail.dorm_name;
      this.location = detail.location_display || detail.address;
      
      console.log('Location data:', {
        location_display: detail.location_display,
        address: detail.address,
        latitude: detail.latitude,
        longitude: detail.longitude
      });
      
      // จัดการราคา
      console.log('Price data:', {
        daily_price: detail.daily_price,
        monthly_price: detail.monthly_price,
        min_price: detail.min_price,
        max_price: detail.max_price,
        price_display: detail.price_display
      });
      
      if (detail.daily_price) {
        this.dormPrice = `${detail.daily_price} บาท/วัน`;
        if (detail.monthly_price) {
          this.priceRange = `${detail.monthly_price} บาท/เดือน`;
        }
      } else if (detail.monthly_price) {
        this.dormPrice = `${detail.monthly_price} บาท/เดือน`;
      } else if (detail.min_price && detail.max_price) {
        this.priceRange = `${detail.min_price.toLocaleString()} - ${detail.max_price.toLocaleString()} บาท/เดือน`;
      }

      // ข้อมูลผู้จัดการ/เจ้าของ
      console.log('Owner data:', {
        manager_name: detail.manager_name,
        manager_phone: detail.manager_phone || detail.primary_phone,
        manager_line: detail.manager_line || detail.line_id
      });
      
      this.owner = detail.manager_name;
      this.ownerProfile = {
        name: detail.manager_name,
        image: '../../../assets/images/image-removebg-preview.png', // ใช้รูป default
        lineId: detail.manager_line || detail.line_id || ''
      };

      // Process water_bill and electric_bill to remove unit if it's already included
      if (detail.water_bill && detail.water_bill.includes('บาท/ยูนิต')) {
        detail.water_bill = detail.water_bill.replace(' บาท/ยูนิต', '');
      }
      
      if (detail.electric_bill && detail.electric_bill.includes('บาท/ยูนิต')) {
        detail.electric_bill = detail.electric_bill.replace(' บาท/ยูนิต', '');
      }

      // Log the utility rates
      console.log('Utility rates:', {
        water_bill: detail.water_bill,
        electric_bill: detail.electric_bill,
        description: detail.description
      });

      // รูปภาพ - ตรวจสอบก่อนว่ามีข้อมูลหรือไม่
      console.log('Images data:', detail.images);
      
      if (detail.images && Array.isArray(detail.images)) {
        this.images = detail.images.map(img => img.image_url);
        console.log('Processed images:', this.images);
      } else {
        this.images = [];
        console.log('No images available');
      }

      // สิ่งอำนวยความสะดวก - เปรียบเทียบกับรายการทั้งหมด
      console.log('Amenities data:', detail.amenities);
      console.log('All amenities from API:', allAmenities);
      
      // สร้างรายการสิ่งอำนวยความสะดวกทั้งหมดพร้อมสถานะ
      this.amenities = this.processAmenities(allAmenities || [], detail.amenities || []);
      console.log('Processed amenities with availability:', this.amenities);

      // ตรวจสอบและตั้งค่าข้อมูลแผนที่
      console.log('Map data before setup:', {
        latitude: detail.latitude,
        longitude: detail.longitude
      });
      
      this.setupMapData(detail);

      this.isLoading = false;
    } catch (error: any) {
      this.error = error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
      this.isLoading = false;
      console.error('Error loading dormitory detail:', error);
    }
  }

  private processAmenities(allAmenities: Amenity[], dormAmenities: any[]): AmenityDisplay[] {
    // สร้าง Set ของ amenity_id ที่หอพักมี
    const dormAmenityIds = new Set(dormAmenities.map(da => da.amenity_id));
    
    console.log('Dorm amenity IDs:', Array.from(dormAmenityIds));
    
    // สร้างรายการสิ่งอำนวยความสะดวกทั้งหมดพร้อมสถานะ
    return allAmenities.map(amenity => ({
      amenity_id: amenity.amenity_id,
      name: amenity.name,
      available: dormAmenityIds.has(amenity.amenity_id)
    }));
  }

  private async loadSimilarDormitories() {
    try {
      // ใช้ getRecommended เพื่อดึงหอพักแนะนำมาแสดงเป็นหอพักที่คล้ายกัน
      const dorms = await this.dormService.getRecommended(4).toPromise();
      if (dorms) {
        // กรองออกหอพักปัจจุบัน
        const filteredDorms = dorms.filter(d => d.dorm_id !== this.dormId);
        
        // แปลงข้อมูลให้ตรงกับ interface SimilarProperty
        this.similarProperties = filteredDorms.map(d => this.mapDormToSimilarProperty(d));
      }
    } catch (error) {
      console.error('Error loading similar dormitories:', error);
    }
  }

  private mapDormToSimilarProperty(dorm: Dorm): SimilarProperty {
    let priceDisplay = '';
    
    // จัดการแสดงราคา
    if (dorm.daily_price) {
      priceDisplay = `${dorm.daily_price} บาท/วัน`;
      if (dorm.monthly_price) {
        priceDisplay += `\n${dorm.monthly_price} บาท/เดือน`;
      }
    } else if (dorm.monthly_price) {
      priceDisplay = `${dorm.monthly_price} บาท/เดือน`;
    } else if (dorm.min_price && dorm.max_price) {
      priceDisplay = `${dorm.min_price.toLocaleString()} - ${dorm.max_price.toLocaleString()} บาท/เดือน`;
    } else if (dorm.price_display) {
      priceDisplay = dorm.price_display;
    }
  
    // จัดการแสดงที่ตั้ง - แยกโซนออกมา
    let locationDisplay = dorm.location_display || dorm.address || '';
    let zoneDisplay = dorm.zone_name || '';
  
    return {
      id: dorm.dorm_id,
      name: dorm.dorm_name,
      price: priceDisplay,
      location: locationDisplay,
      zone: zoneDisplay, // เพิ่ม zone แยกต่างหาก
      image: dorm.main_image_url || dorm.thumbnail_url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      rating: 5.0,
      date: dorm.updated_date ? `อัพเดทล่าสุด ${new Date(dorm.updated_date).toLocaleDateString('th-TH')}` : '',
    };
  }
  // เพิ่ม method สำหรับการนำทางไปยังหอพักที่คล้ายกัน
  viewSimilarDorm(id: number) {
    this.router.navigate(['/dorm-detail', id.toString()]);
  }

  // ตั้งค่าข้อมูลแผนที่
  private setupMapData(detail: DormDetail): void {
    // ตรวจสอบว่ามีข้อมูลพิกัดหรือไม่
    if (detail.latitude && detail.longitude) {
      try {
        // แปลงเป็น number
        let lat: number;
        let lng: number;
        
        if (typeof detail.latitude === 'string') {
          lat = parseFloat(detail.latitude);
        } else if (typeof detail.latitude === 'number') {
          lat = detail.latitude;
        } else {
          return; // ไม่สามารถแปลงค่าได้
        }
        
        if (typeof detail.longitude === 'string') {
          lng = parseFloat(detail.longitude);
        } else if (typeof detail.longitude === 'number') {
          lng = detail.longitude;
        } else {
          return; // ไม่สามารถแปลงค่าได้
        }
        
        if (!isNaN(lat) && !isNaN(lng)) {
          this.mapLatitude = lat;
          this.mapLongitude = lng;
          this.showMap = true;
          
          // ใช้ Google Maps Static API แทน (ไม่ต้องใช้ DomSanitizer)
          const googleMapsUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x400&markers=color:red%7C${lat},${lng}&key=YOUR_GOOGLE_MAPS_API_KEY`;
          
          // หรือใช้ OpenStreetMap แบบ static image
          const openStreetMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x400&markers=${lat},${lng},red`;
          
          // เลือกใช้ OpenStreetMap เพราะไม่ต้องใช้ API key
          this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(openStreetMapUrl);
        }
      } catch (e) {
        console.error('Error setting up map data:', e);
      }
    } else {
      this.showMap = false;
    }
  }

  // Image gallery methods
  prevImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    } else {
      this.currentImageIndex = this.images.length - 1;
    }
  }

  nextImage(): void {
    if (this.currentImageIndex < this.images.length - 1) {
      this.currentImageIndex++;
    } else {
      this.currentImageIndex = 0;
    }
  }

  setCurrentImage(index: number): void {
    this.currentImageIndex = index;
  }

  // Add to favorites method
  addToFavorites(): void {
    console.log('Added to favorites:', this.dormName);
    alert('Added to favorites!');
  }

  // Contact owner method
  contactOwner(): void {
    if (this.dormDetail?.manager_phone) {
      window.location.href = `tel:${this.dormDetail.manager_phone}`;
    } else {
      alert('ไม่พบข้อมูลการติดต่อ');
    }
  }

  // Reviews methods
  addComment(comment: string): void {
    if (comment.trim()) {
      alert('ขออภัย ระบบรีวิวยังไม่เปิดให้ใช้งาน');
      this.newComment = '';
    }
  }
  
  viewAllComments(): void {
    alert('ขออภัย ระบบรีวิวยังไม่เปิดให้ใช้งาน');
  }

  getStars(rating: number): number[] {
    const fullStars = Math.floor(rating);
    return Array(fullStars).fill(0);
  }
}
