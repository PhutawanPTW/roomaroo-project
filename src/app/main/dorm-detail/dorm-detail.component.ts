import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from "../navbar/navbar.component";
import { DormitoryService, DormDetail, Dorm, Amenity } from '../../services/dormitory.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MapService } from '../../services/map.service';
import * as maptilersdk from '@maptiler/sdk';
import { Marker } from '@maptiler/sdk';

// Initialize MapTiler SDK with API key
maptilersdk.config.apiKey = 'Gpwk2Mpi9cl8hUkVrf6f';

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
  dailyPrice?: string;  // เพิ่มราคารายวัน
  monthlyPrice?: string; // เพิ่มราคารายเดือน
  price: string;  // เก็บไว้สำหรับ backward compatibility
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
export class DormDetailComponent implements OnInit, OnDestroy {
  @ViewChild('map') mapContainer!: ElementRef;
  
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

  // Map properties
  showMap: boolean = false;
  mapLatitude: number | null = null;
  mapLongitude: number | null = null;
  isSatelliteView: boolean = false;
  private map: maptilersdk.Map | null = null;
  private marker: maptilersdk.Marker | null = null;

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
    private mapService: MapService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // รับ dormId จาก URL และโหลดข้อมูล
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id && !isNaN(+id) && +id > 0) {
        this.dormId = +id;
        this.loadDormitoryDetail();
        this.loadSimilarDormitories();
      } else {
        this.error = 'ไม่พบรหัสหอพัก หรือรหัสหอพักไม่ถูกต้อง';
        this.isLoading = false;
        setTimeout(() => {
          this.router.navigate(['/main']);
        }, 2000);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.marker) {
      this.marker.remove();
    }
    if (this.map) {
      this.map.remove();
    }
  }

  private async loadDormitoryDetail() {
    try {
      this.isLoading = true;
      this.error = null;

      // โหลด amenities ทั้งหมดก่อน
      const allAmenities = await this.dormService.getAllAmenities().toPromise();
      
      // โหลดข้อมูลหอพัก
      const detail = await this.dormService.getDormitoryById(this.dormId).toPromise();
      
      if (!detail) {
        throw new Error('ไม่พบข้อมูลหอพัก');
      }

      // จัดการข้อมูลหอพัก
      this.dormDetail = detail;
      this.dormName = detail.dorm_name;
      this.location = detail.address;
      
      // จัดการรูปภาพ
      if (detail.images && detail.images.length > 0) {
        this.images = detail.images.map(img => img.image_url);
      }

      // จัดการราคา
      if (detail.min_price && detail.max_price) {
        this.priceRange = `${detail.min_price.toLocaleString()} - ${detail.max_price.toLocaleString()} บาท/เดือน`;
      } else if (detail.monthly_price) {
        this.dormPrice = `${detail.monthly_price.toLocaleString()} บาท/เดือน`;
      }

      // จัดการ amenities
      if (allAmenities && detail.amenities) {
        this.amenities = this.processAmenities(allAmenities, detail.amenities);
      }

      // ตั้งค่าแผนที่
      this.setupMapData(detail);

      this.isLoading = false;
    } catch (error: any) {
      console.error('Error loading dormitory detail:', error);
      this.error = error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก';
      this.isLoading = false;

      // ถ้าไม่พบข้อมูล (404) ให้นำทางกลับหน้าหลัก
      if (error.status === 404) {
        setTimeout(() => {
          this.router.navigate(['/main']);
        }, 2000);
      }
    }
  }

  private processAmenities(allAmenities: Amenity[], dormAmenities: any[]): AmenityDisplay[] {
    // สร้าง Set ของ amenity_id ที่หอพักมี
    const dormAmenityIds = new Set(dormAmenities.map(da => 
      // ตรวจสอบว่ามี amenity_id หรือไม่ ถ้าไม่มีให้ใช้ id แทน
      da.amenity_id || da.id
    ));
    
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
      const dorms = await this.dormService.getRecommended(5).toPromise();
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
    let dailyPrice: string | undefined;
    let monthlyPrice: string | undefined;
    
    // จัดการแสดงราคา
    if (dorm.daily_price) {
      dailyPrice = `${dorm.daily_price} บาท/วัน`;
      priceDisplay = dailyPrice;
    }
    
    if (dorm.monthly_price) {
      monthlyPrice = `${dorm.monthly_price} บาท/เดือน`;
      if (!priceDisplay) {
        priceDisplay = monthlyPrice;
      }
    }
    
    if (dorm.min_price && dorm.max_price) {
      monthlyPrice = `${dorm.min_price.toLocaleString()} - ${dorm.max_price.toLocaleString()} บาท/เดือน`;
      if (!priceDisplay) {
        priceDisplay = monthlyPrice;
      }
    } else if (dorm.price_display && !dailyPrice && !monthlyPrice) {
      priceDisplay = dorm.price_display;
    }
  
    // จัดการแสดงที่ตั้ง - แยกโซนออกมา
    let locationDisplay = dorm.location_display || dorm.address || '';
    let zoneDisplay = dorm.zone_name || '';
  
    return {
      id: dorm.dorm_id,
      name: dorm.dorm_name,
      dailyPrice: dailyPrice,
      monthlyPrice: monthlyPrice,
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
    if (detail.latitude && detail.longitude) {
      try {
        let lat = typeof detail.latitude === 'string' ? parseFloat(detail.latitude) : detail.latitude;
        let lng = typeof detail.longitude === 'string' ? parseFloat(detail.longitude) : detail.longitude;

        if (!isNaN(lat) && !isNaN(lng)) {
          console.log('Setting up map with valid coordinates:', { lat, lng });
          this.mapLatitude = lat;
          this.mapLongitude = lng;
          this.showMap = true;

          // Initialize map after a short delay to ensure DOM is ready
          setTimeout(() => {
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
              console.log('Map container found, dimensions:', {
                width: mapContainer.offsetWidth,
                height: mapContainer.offsetHeight,
                visible: mapContainer.offsetParent !== null
              });
              this.initializeMap();
            } else {
              console.error('Map container not found or not visible in DOM');
            }
          }, 100);
        } else {
          console.error('Invalid coordinates after parsing:', { lat, lng });
        }
      } catch (error) {
        console.error('Error in setupMapData:', error);
      }
    } else {
      console.error('No coordinates in detail:', detail);
    }
  }

  private initializeMap(): void {
    if (!this.mapLatitude || !this.mapLongitude) {
      console.error('Map coordinates not available:', { lat: this.mapLatitude, lng: this.mapLongitude });
      return;
    }

    try {
      console.log('Initializing map with coordinates:', { lat: this.mapLatitude, lng: this.mapLongitude });
      
      // Initialize map with longitude first, then latitude
      this.map = new maptilersdk.Map({
        container: 'map',
        style: maptilersdk.MapStyle.STREETS,
        center: [this.mapLongitude, this.mapLatitude], // [lng, lat] order
        zoom: 15,
        pitch: 0,
        bearing: 0
      });

      // Wait for map to load before adding marker and controls
      this.map.on('load', () => {
        console.log('Map loaded, adding marker...');
        this.addMarker();
        this.addMapControls();
      });

      // Add zoom controls
      this.map.addControl(new maptilersdk.NavigationControl({
        showCompass: false,
        showZoom: false,
        visualizePitch: false
      }), 'bottom-right');

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private addMarker(): void {
    if (!this.map || !this.mapLatitude || !this.mapLongitude) {
      console.error('Cannot add marker, map or coordinates not ready');
      return;
    }
  
    try {
      // Create a simple red marker
      this.marker = new Marker({ color: "#FF0000" })
        .setLngLat([this.mapLongitude, this.mapLatitude])
        .addTo(this.map);
  
      console.log('Marker added at:', [this.mapLongitude, this.mapLatitude]);
    } catch (error) {
      console.error('Error adding marker:', error);
    }
  }

  private addMapControls(): void {
    if (!this.map) return;

    // Add navigation control
    const nav = new maptilersdk.NavigationControl({
      showCompass: true,
      visualizePitch: true
    });
    this.map.addControl(nav, 'bottom-right');
  }

  toggleMapStyle(): void {
    this.isSatelliteView = !this.isSatelliteView;
    if (this.map) {
      const style = this.isSatelliteView ? 
        'https://api.maptiler.com/maps/hybrid/style.json?key=Gpwk2Mpi9cl8hUkVrf6f' : 
        maptilersdk.MapStyle.STREETS;
      
      const center = this.map.getCenter();
      const zoom = this.map.getZoom();
      
      this.map.setStyle(style);
      
      this.map.once('style.load', () => {
        this.map?.setCenter(center);
        this.map?.setZoom(zoom);
        if (this.mapLatitude && this.mapLongitude) {
          // ลบ marker เก่าก่อน
          if (this.marker) {
            this.marker.remove();
          }
          // สร้าง marker ใหม่
          this.addMarker();
        }
      });
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

  // เพิ่ม method สำหรับปุ่มดูเพิ่มเติม
  viewMoreSimilarDorms() {
    // นำทางไปยังหน้า dorm-list พร้อม query parameter เพื่อแสดงหอพักแนะนำ
    this.router.navigate(['/main/dorm-list'], { 
      queryParams: { 
        type: 'recommended',
        from: 'dorm-detail',
        currentDormId: this.dormId
      } 
    });
  }

  // Zoom functions
  zoomIn(): void {
    if (this.map) {
      this.map.zoomIn();
    }
  }

  zoomOut(): void {
    if (this.map) {
      this.map.zoomOut();
    }
  }
}
