import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from "../navbar/navbar.component";
import { DormitoryService, DormDetail, Dorm, Amenity, RoomType } from '../../services/dormitory.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MapService } from '../../services/map.service';
import { AuthService } from '../../services/auth.service';
import { SentimentService } from '../../services/sentiment.service';
import { DormCompareService, CompareDormItem } from '../../services/dorm-compare.service';
import { ComparePopupComponent } from '../shared/compare-popup/compare-popup.component';

interface AmenityDisplay {
  amenity_id: number;
  name: string;
  available: boolean;
}

interface Review {
  id?: number; // ID ของรีวิวจาก API
  username: string;
  avatar: string;
  comment: string;
  rating: number;
  isPositive: boolean;
  date: Date;
  isResident?: boolean; // เป็นสมาชิกหอพักหรือไม่
  isCurrentUser?: boolean; // เป็นรีวิวของผู้ใช้ปัจจุบันหรือไม่
  isEditing?: boolean; // กำลังแก้ไขหรือไม่
  editComment?: string; // ข้อความที่กำลังแก้ไข
  saving?: boolean; // กำลังบันทึกอยู่เพื่อกันการกดซ้ำ
}

interface SimilarProperty {
  id: number;
  name: string;
  dailyPrice?: string;
  monthlyPrice?: string;
  price: string;
  location: string;
  zone?: string;
  image: string;
  rating: number;
  date: string;
}

type SentimentType = 'positive' | 'negative' | 'neutral';

@Component({
  selector: 'app-dorm-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ComparePopupComponent],
  templateUrl: './dorm-detail.component.html',
  styleUrls: ['./dorm-detail.component.css']
})
export class DormDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('map') mapContainer!: ElementRef;

  dormId: number = 0;
  dormDetail: DormDetail | null = null;
  // สถานะห้อง (normalize) สำหรับใช้ในเทมเพลต
  statusDorm: string = '';

  // UI state
  currentImageIndex: number = 0;
  images: string[] = [];
  newComment: string = '';
  isLoading: boolean = true;
  error: string | null = null;
  
  // Image modal state
  showImageModal: boolean = false;
  modalImageIndex: number = 0;

  // Mock data (จะถูกแทนที่ด้วยข้อมูลจริง)
  dormName: string = '';
  dormPrice: string = '';
  priceRange: string = '';
  location: string = '';
  owner: string = '';
  description: string = '';
  amenities: AmenityDisplay[] = [];
  roomTypes: RoomType[] = [];

  // Owner contact information from API
  ownerContact = {
    name: '',
    phone: '',
    secondaryPhone: '',
    lineId: '',
    email: '',
    image: '../../../assets/images/image-removebg-preview.png'
  };

  // Map properties - ป้องกัน race conditions
  showMap: boolean = false;
  mapLatitude: number | null = null;
  mapLongitude: number | null = null;
  private mapState = {
    initialized: false,
    initializing: false,
    initPromise: null as Promise<void> | null
  };

  // Auth related
  isLoggedIn: boolean = false;
  userAvatar: string = '';
  isOwner: boolean = false;
  currentUserId: number | null = null;
  canReview: boolean = false;
  reviewEligibilityMessage: string = '';
  isResident: boolean = false; // เป็นสมาชิกหอพักนี้หรือไม่
  isPendingApproval: boolean = false; // แยกสถานะรออนุมัติออกจากเหตุผลอื่น
  
  // Review related
  sentimentResult: SentimentType | null = null;
  
  // Reviews data
  overallRating: number = 5.0;
  reviews: Review[] = [];

  // Auto-grow textarea on input
  autoGrow(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  }

  // Loading states to prevent duplicate actions
  isSubmittingComment: boolean = false;
  
  // Mockup reviews data
  mockupReviews: Review[] = [
    {
      username: 'สมหมาย',
      avatar: '../../../assets/images/image-removebg-preview.png',
      comment: 'หอนี้ดีมาก สะอาด ปลอดภัย เจ้าของใจดี',
      rating: 5,
      isPositive: true,
      date: new Date('2024-01-15'),
      isResident: true,
      isCurrentUser: false,
      isEditing: false
    },
    {
      username: 'น้องแอม',
      avatar: '../../../assets/images/image-removebg-preview.png',
      comment: 'หอพักนี้ดีมากเลย ใกล้มหาวิทยาลัย ราคาไม่แพง',
      rating: 5,
      isPositive: true,
      date: new Date('2024-01-10'),
      isResident: true,
      isCurrentUser: false,
      isEditing: false
    },
    {
      username: 'คุณสมชาย',
      avatar: '../../../assets/images/image-removebg-preview.png',
      comment: 'หอพักสะอาด มีสิ่งอำนวยความสะดวกครบครัน',
      rating: 4,
      isPositive: true,
      date: new Date('2024-01-08'),
      isResident: true,
      isCurrentUser: false,
      isEditing: false
    },
    {
      username: 'คุณสมหญิง',
      avatar: '../../../assets/images/image-removebg-preview.png',
      comment: 'หอพักนี้โอเค แต่เสียงรบกวนบ้าง',
      rating: 3,
      isPositive: false,
      date: new Date('2024-01-05'),
      isResident: true,
      isCurrentUser: false,
      isEditing: false
    },
    {
      username: 'คุณปัจจุบัน',
      avatar: '../../../assets/images/image-removebg-preview.png',
      comment: 'หอพักนี้ดีมากเลย อยู่สบายมาก',
      rating: 5,
      isPositive: true,
      date: new Date('2024-01-20'),
      isResident: true,
      isCurrentUser: true, // รีวิวของผู้ใช้ปัจจุบัน
      isEditing: false
    }
  ];

  // Similar properties (using real data)
  similarProperties: SimilarProperty[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dormitoryService: DormitoryService,
    private dormService: DormitoryService,
    private mapService: MapService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private sentimentService: SentimentService,
    public dormCompareService: DormCompareService
  ) { }

  // Popup state
  isPopupVisible = false;
  popupMessage = '';
  popupType: 'success' | 'error' | 'warning' | 'info' = 'info';
  private popupTimeoutHandle: any = null;

  private triggerPopup(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', durationMs: number = 2500) {
    this.popupMessage = message;
    this.popupType = type;
    this.isPopupVisible = true;
    if (this.popupTimeoutHandle) {
      clearTimeout(this.popupTimeoutHandle);
    }
    this.popupTimeoutHandle = setTimeout(() => {
      this.isPopupVisible = false;
    }, durationMs);
  }

  hidePopup() {
    if (this.popupTimeoutHandle) {
      clearTimeout(this.popupTimeoutHandle);
      this.popupTimeoutHandle = null;
    }
    this.isPopupVisible = false;
  }

  ngOnInit(): void {
    // Check login status
    this.checkLoginStatus();
    
    // รับ dormId จาก URL และโหลดข้อมูล
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id && !isNaN(+id) && +id > 0) {
        this.dormId = +id;
        // ทำลายแมพเก่าเมื่อเปลี่ยน dormId
        this.resetMapState();
        
        // ตรวจสอบสิทธิ์/โหลดข้อมูล หลัง token พร้อม แล้วรันพร้อมกัน
        console.log('[DormDetail] Initializing for dormId:', this.dormId);
        this.authService.refreshToken(false)
          .catch(err => {
            console.warn('[DormDetail] Token not ready, continue anyway:', err);
          })
          .finally(() => {
            this.checkReviewEligibility();
            this.loadReviews();
            this.loadDormitoryDetail();
            this.loadSimilarDormitories();
          });
      } else {
        this.error = 'ไม่พบรหัสหอพัก หรือรหัสหอพักไม่ถูกต้อง';
        this.isLoading = false;
        setTimeout(() => {
          this.router.navigate(['/main']);
        }, 2000);
      }
    });
  }

  ngAfterViewInit(): void {
    // ลองโหลดแผนที่หลังจาก View พร้อม
    this.tryInitializeMap();
  }

  // Method สำหรับรีเซ็ต map state
  private resetMapState(): void {
    try {
      this.mapService.destroyMap();
    } catch (error) {
      console.warn('[DormDetail] Error destroying map:', error);
    }
    this.mapState.initialized = false;
    this.mapState.initializing = false;
    this.mapState.initPromise = null;
  }

  ngOnDestroy(): void {
    // ใช้ MapService ในการ destroy map - ปรับปรุงให้ใช้ container-specific destroy
    if (this.mapContainer) {
      this.mapService.destroyMapByContainer('dorm-detail-map');
    } else {
      this.mapService.destroyMap();
    }
    this.mapState.initialized = false;
    this.mapState.initializing = false;
    this.mapState.initPromise = null;
  }

  // Public method for retry loading
  retryLoad(): void {
    this.loadDormitoryDetail();
  }

  // Public method for going back
  goBack(): void {
    this.router.navigate(['/main']);
  }

  // *** Loading state management - ป้องกัน race conditions ***
  private loadingState = {
    detail: false,
    amenities: false,
    similar: false,
    loadDetailPromise: null as Promise<void> | null
  };

  private async loadDormitoryDetail() {
    // Return existing promise if already loading
    if (this.loadingState.loadDetailPromise) {
      return this.loadingState.loadDetailPromise;
    }

    this.loadingState.loadDetailPromise = this.loadDormitoryDetailSafely();
    return this.loadingState.loadDetailPromise;
  }

  private async loadDormitoryDetailSafely(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;
      this.loadingState.detail = true;
      this.loadingState.amenities = true;

      // โหลด amenities และ detail พร้อมกัน แต่รอทั้งคู่เสร็จ
      const [allAmenities, detail] = await Promise.all([
        this.dormService.getAllAmenities().toPromise(),
        this.dormService.getDormitoryById(this.dormId).toPromise()
      ]);

      if (!detail) {
        throw new Error('ไม่พบข้อมูลหอพัก');
      }

      // Debug: ดูข้อมูลทั้งหมดที่ได้จาก API
      console.log('[DormDetail] Full API response:', detail);
      
      // Debug: ดูข้อมูล owner ที่มีใน response
      console.log('[DormDetail] Owner fields in response:', {
        owner_name: detail.owner_name,
        owner_manager_name: detail.owner_manager_name,
        owner_phone: detail.owner_phone,
        owner_secondary_phone: detail.owner_secondary_phone,
        owner_line_id: detail.owner_line_id,
        owner_email: detail.owner_email,
        owner_photo_url: detail.owner_photo_url
      });
      
      // Debug: ตรวจสอบ field names อื่นๆ ที่อาจเป็นรูปภาพ owner
      console.log('[DormDetail] Checking for photo fields:', {
        owner_photo_url: detail.owner_photo_url,
        owner_photo: (detail as any).owner_photo,
        owner_image: (detail as any).owner_image,
        owner_avatar: (detail as any).owner_avatar,
        photo_url: (detail as any).photo_url,
        image_url: (detail as any).image_url
      });
      
      // Debug: ดู keys ทั้งหมดใน response เพื่อหาชื่อ field ที่อาจเป็นรูปภาพ
      console.log('[DormDetail] All keys in response:', Object.keys(detail));
      console.log('[DormDetail] All values in response:', detail);

      // ตรวจสอบสถานะการอนุมัติ
      if (detail.approval_status === 'รออนุมัติ') {
        this.error = 'หอพักนี้ยังรออนุมัติ ไม่สามารถเข้าถึงได้';
        this.isLoading = false;
        this.loadingState.detail = false;
        this.loadingState.amenities = false;
        return;
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

      // จัดการสถานะห้อง (ว่าง/เต็ม) ให้เทมเพลตใช้งานได้สะดวก
      this.statusDorm = ((detail as any).status_dorm || (detail as any).status || '').toString();

      // โหลด room types
      try {
        const rts = await this.dormService.getRoomTypes(this.dormId).toPromise();
        console.log('Room Types Data:', rts);
        this.roomTypes = Array.isArray(rts) ? rts : [];
        console.log('Processed Room Types:', this.roomTypes);
        
        // Log each room type in detail
        this.roomTypes.forEach((rt, index) => {
          console.log(`Room Type ${index + 1}:`, {
            room_type_id: rt.room_type_id,
            dorm_id: rt.dorm_id,
            name: rt.name,
            bed_type: rt.bed_type,
            monthly_price: rt.monthly_price,
            daily_price: rt.daily_price,
            term_price: rt.term_price,
            summer_price: rt.summer_price
          });
        });
      } catch (e) {
        console.error('Error loading room types:', e);
        this.roomTypes = [];
      }

      // จัดการ amenities
      if (allAmenities && detail.amenities) {
        this.amenities = this.processAmenities(allAmenities, detail.amenities);
      }

      // จัดการข้อมูล contact เจ้าของหอ
      this.ownerContact = {
        name: detail.owner_manager_name || detail.owner_name || 'เจ้าของหอพัก',
        phone: detail.owner_phone || '',
        secondaryPhone: detail.owner_secondary_phone || '',
        lineId: detail.owner_line_id || '',
        email: detail.owner_email || '',
        image: detail.owner_photo_url || '../../../assets/images/image-removebg-preview.png'
      };
      
      console.log('[DormDetail] Processed owner contact:', this.ownerContact);

      // ตั้งค่าแผนที่
      this.setupMapData(detail);

      // ตรวจสอบว่า user เป็น owner ของหอพักนี้หรือไม่
      this.checkIfUserIsOwner(detail);

      // ลองโหลดแผนที่อีกครั้งหลังจากข้อมูลโหลดเสร็จ
      setTimeout(() => {
        this.tryInitializeMap();
      }, 100);

    } catch (error: any) {
      console.error('Error loading dormitory detail:', error);
      this.error = error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก';

      // ถ้าไม่พบข้อมูล (404) ให้นำทางกลับหน้าหลัก
      if (error.status === 404) {
        setTimeout(() => {
          this.router.navigate(['/main']);
        }, 2000);
      }
    } finally {
      this.isLoading = false;
      this.loadingState.detail = false;
      this.loadingState.amenities = false;
      this.loadingState.loadDetailPromise = null;
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
      zone: zoneDisplay,
      image: dorm.main_image_url || dorm.thumbnail_url || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      rating: 5.0,
      date: dorm.updated_date ? `อัพเดทล่าสุด ${new Date(dorm.updated_date).toLocaleDateString('th-TH')}` : '',
    };
  }

  // เพิ่ม method สำหรับการนำทางไปยังหอพักที่คล้ายกัน
  viewSimilarDorm(id: number) {
    this.router.navigate(['/dorm-detail', id.toString()]);
  }

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

  // ฟังก์ชันใหม่สำหรับการลองโหลดแผนที่ - ป้องกัน race conditions
  private tryInitializeMap(): void {
    // Return existing promise if already initializing
    if (this.mapState.initPromise) {
      return;
    }

    if (this.mapState.initialized || !this.showMap || !this.mapLatitude || !this.mapLongitude) {
      return;
    }

    if (this.mapState.initializing) {
      return;
    }

    this.mapState.initializing = true;
    this.mapState.initPromise = this.initializeMapSafely();
  }

  private async initializeMapSafely(): Promise<void> {
    try {
    const mapContainer = document.getElementById('map');
    if (mapContainer && this.dormDetail) {
      console.log('Map container found, initializing with MapService...');
        
        // ตรวจสอบว่า map container มีขนาดที่เหมาะสม
        if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
          console.log('Map container has no dimensions, waiting for layout...');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // ทำลาย map เก่าก่อนสร้างใหม่เสมอ เพื่อป้องกัน WebGL context issues
        this.mapService.destroyMap();
        
        // รอสักครู่เพื่อให้ DOM มีเวลา update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        this.mapService.initializeMap(
          'map', 
          this.mapLatitude!, 
          this.mapLongitude!, 
          this.dormName, 
          this.location, 
          this.dormDetail
        );
        
        this.mapState.initialized = true;
        console.log('Map initialized successfully');
    } else {
      console.log('Map container not ready, retrying...');
      // ลองอีกครั้งหลังจาก 200ms
        await new Promise(resolve => setTimeout(resolve, 200));
        if (!this.mapState.initialized) {
          this.mapState.initializing = false;
          this.mapState.initPromise = null;
          this.tryInitializeMap();
        }
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      // ลองอีกครั้งหลังจาก 1 วินาที
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!this.mapState.initialized) {
        this.mapState.initializing = false;
        this.mapState.initPromise = null;
        this.tryInitializeMap();
      }
    } finally {
      this.mapState.initializing = false;
      this.mapState.initPromise = null;
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

  // Image modal methods
  openImageModal(index: number = this.currentImageIndex): void {
    this.modalImageIndex = index;
    this.showImageModal = true;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeImageModal(): void {
    this.showImageModal = false;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  prevModalImage(): void {
    if (this.modalImageIndex > 0) {
      this.modalImageIndex--;
    } else {
      this.modalImageIndex = this.images.length - 1;
    }
  }

  nextModalImage(): void {
    if (this.modalImageIndex < this.images.length - 1) {
      this.modalImageIndex++;
    } else {
      this.modalImageIndex = 0;
    }
  }

  onModalKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.closeImageModal();
        break;
      case 'ArrowLeft':
        this.prevModalImage();
        break;
      case 'ArrowRight':
        this.nextModalImage();
        break;
    }
  }

  // Add to favorites method
  addToFavorites(): void {
    console.log('Added to favorites:', this.dormName);
    this.triggerPopup('เพิ่มในรายการโปรดแล้ว!', 'success');
  }

  // Contact owner method
  contactOwner(): void {
    if (this.ownerContact.phone) {
      window.location.href = `tel:${this.ownerContact.phone}`;
    } else {
      this.triggerPopup('ไม่พบข้อมูลการติดต่อ', 'error');
    }
  }

  // Contact owner via secondary phone
  contactOwnerSecondary(): void {
    if (this.ownerContact.secondaryPhone) {
      window.location.href = `tel:${this.ownerContact.secondaryPhone}`;
    } else {
      this.triggerPopup('ไม่พบเบอร์โทรสำรอง', 'error');
    }
  }

  // Contact owner via email
  contactOwnerEmail(): void {
    if (this.ownerContact.email) {
      window.location.href = `mailto:${this.ownerContact.email}`;
    } else {
      this.triggerPopup('ไม่พบอีเมล', 'error');
    }
  }

  // Utility rate display methods
  getWaterRateDisplay(): string {
    if (!this.dormDetail?.water_type) return '';
    
    // ถ้าเป็นตามมิเตอร์ ให้แสดงเป็นตามอัตราการประปา
    if (this.dormDetail.water_type === 'ตามมิเตอร์') {
      return 'ตามอัตราการประปา';
    }
    
    // กรณีอื่นๆ แสดงตามปกติ
    return `${this.dormDetail.water_rate} บาท/ยูนิต`;
  }

  getElectricityRateDisplay(): string {
    if (!this.dormDetail?.electricity_type) return '';
    
    // ถ้าเป็นตามมิเตอร์ ให้แสดงเป็นตามอัตราการไฟฟ้า
    if (this.dormDetail.electricity_type === 'ตามมิเตอร์') {
      return 'ตามอัตราการไฟฟ้า';
    }
    
    // กรณีอื่นๆ แสดงตามปกติ
    return `${this.dormDetail.electricity_rate} บาท/ยูนิต`;
  }

  getWaterTypeDisplay(): string {
    if (!this.dormDetail?.water_type) return '';
    
    // ถ้าเป็นตามมิเตอร์ ให้แสดงเป็นตามอัตราการประปา
    if (this.dormDetail.water_type === 'ตามมิเตอร์') {
      return 'ตามอัตราการประปา';
    }
    
    return this.dormDetail.water_type;
  }

  getElectricityTypeDisplay(): string {
    if (!this.dormDetail?.electricity_type) return '';
    
    // ถ้าเป็นตามมิเตอร์ ให้แสดงเป็นตามอัตราการไฟฟ้า
    if (this.dormDetail.electricity_type === 'ตามมิเตอร์') {
      return 'ตามอัตราการไฟฟ้า';
    }
    
    return this.dormDetail.electricity_type;
  }

  // Reviews methods
  private checkLoginStatus(): void {
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      console.log('[DormDetail] Login status:', this.isLoggedIn);
      if (user) {
        this.userAvatar = user.photoURL || '../../../assets/images/image-removebg-preview.png';
        this.currentUserId = user.id;
        console.log('[DormDetail] Current user ID:', this.currentUserId);
      } else {
        this.currentUserId = null;
        console.log('[DormDetail] No user logged in');
      }
    });
  }

  private checkIfUserIsOwner(detail: DormDetail): void {
    // ตรวจสอบว่า user เป็น owner หรือไม่
    this.authService.currentUser$.subscribe(user => {
      if (user && user.memberType === 'owner') {
        this.isOwner = true;
        // เจ้าของหอพักห้ามรีวิว
        this.canReview = false;
        this.reviewEligibilityMessage = 'เจ้าของหอพักไม่สามารถแสดงความคิดเห็นในหอตัวเองได้';
      } else {
        this.isOwner = false;
      }
    });
  }

  private checkReviewEligibility(): void {
    // ตรวจสอบสิทธิ์การรีวิวผ่าน API (ใช้ cache ตาม user)
    const uid = this.currentUserId ?? 'anon';
    this.dormitoryService.checkReviewEligibility(this.dormId, uid).subscribe({
      next: (response) => {
        // Debug: แสดง raw response ที่ได้รับ
        console.log('[DormDetail] Raw eligibility response:', response);
        console.log('[DormDetail] Response type:', typeof response);
        console.log('[DormDetail] Response keys:', Object.keys(response));
        
        // ใช้ field names ที่ตรงกับ API response จาก backend
        // ตรวจสอบ field can_review ก่อน (ตาม API spec ที่ Backend ส่งมา)
        if ((response as any).can_review !== undefined) {
          this.canReview = (response as any).can_review;
          console.log('[DormDetail] Using can_review field:', this.canReview);
        } else if (response.canReview !== undefined) {
          this.canReview = response.canReview;
          console.log('[DormDetail] Using canReview field:', this.canReview);
        } else if ((response as any).isEligible !== undefined) {
          this.canReview = (response as any).isEligible;
          console.log('[DormDetail] Using isEligible field:', this.canReview);
        } else {
          this.canReview = false;
          console.log('[DormDetail] No valid field found, defaulting to false');
        }
        
        // จัดการเหตุผลจาก backend และเคสพิเศษ (เคยรีวิวแล้ว / ไม่ใช่ผู้พักอาศัย)
        const backendReason = (response as any).reason || response.message || '';
        this.isPendingApproval = (response as any).status === 'pending_approval';

        const hasReviewed = (response as any).has_reviewed === true || (response as any).hasReviewed === true;
        if (hasReviewed) {
          this.canReview = false;
          this.reviewEligibilityMessage = 'คุณได้แสดงความคิดเห็นสำหรับหอนี้ไปแล้ว';
        } else if ((response as any).status === 'not_resident' || (response as any).is_resident === false) {
          this.canReview = false;
          this.reviewEligibilityMessage = 'เฉพาะสมาชิกที่อยู่อาศัยในหอพักนี้เท่านั้นที่สามารถแสดงความคิดเห็นได้';
        } else if (!this.canReview && !this.isPendingApproval) {
          // เคสอื่นๆที่ backend ไม่อนุญาต
          this.reviewEligibilityMessage = backendReason || 'ไม่สามารถแสดงความคิดเห็นได้';
        } else {
          this.reviewEligibilityMessage = backendReason;
        }
        
        // Debug: แสดง field values ที่ตรวจสอบ
        console.log('[DormDetail] Field check:', {
          'can_review': (response as any).can_review,
          'canReview': response.canReview,
          'isEligible': (response as any).isEligible,
          'final_canReview': this.canReview,
          'status': (response as any).status,
          'isPendingApproval': this.isPendingApproval
        });
        
        // Debug: แสดง reason/message
        console.log('[DormDetail] Message check:', {
          'reason': (response as any).reason,
          'message': response.message,
          'final_message': this.reviewEligibilityMessage
        });
        
        // Debug: แสดง has_reviewed field
        console.log('[DormDetail] Has reviewed check:', {
          'has_reviewed': (response as any).has_reviewed,
          'hasReviewed': (response as any).hasReviewed
        });
      },
      error: (error) => {
        console.error('[DormDetail] Error checking review eligibility:', error);
        this.canReview = false;
        this.reviewEligibilityMessage = 'ไม่สามารถตรวจสอบสิทธิ์การรีวิวได้';
      }
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/login'], { 
      queryParams: { returnUrl: this.router.url } 
    });
  }

  addComment(comment: string): void {
    if (!comment?.trim()) return;
    
    // ป้องกันการส่งข้อความว่าง
    const trimmedComment = comment.trim();
    if (trimmedComment.length === 0) {
      return;
    }

    // ตรวจสอบสถานะการล็อกอิน
    if (!this.isLoggedIn) {
      this.navigateToLogin();
      return;
    }

    if (this.isSubmittingComment) return; // กันการกดซ้ำ
    this.isSubmittingComment = true;

    // ส่งรีวิวไปยัง API - ส่งเฉพาะ comment (AI จะทำการ auto-rating)
    this.dormitoryService.createReview(this.dormId, {
      comment: trimmedComment
    }).subscribe({
      next: (response) => {
        console.log('[DormDetail] Review created successfully:', response);
        console.log('[DormDetail] Response keys:', Object.keys(response));
        
        // ใช้ predicted_rating จาก AI แทน manual rating
        const predictedRating = response.predicted_rating || 5;
        console.log('[DormDetail] Using predicted_rating:', predictedRating);
        
        // เพิ่มความคิดเห็นใหม่ในรายการ
        const newReview: Review = {
          username: 'ผู้ใช้งาน',
          avatar: this.userAvatar,
          comment: trimmedComment,
          rating: predictedRating, // ใช้ AI predicted rating
          isPositive: predictedRating >= 3,
          date: new Date(),
          isResident: true, // เนื่องจากผ่านการตรวจสอบสิทธิ์แล้ว
          isCurrentUser: true // เป็นรีวิวของผู้ใช้ปัจจุบัน
        };
        
        this.reviews.unshift(newReview);
        this.newComment = '';
        this.isSubmittingComment = false;
        
        // โหลดรีวิวใหม่จาก API เพื่อให้ได้ข้อมูลล่าสุด
        this.loadReviews();
      },
      error: (error) => {
        console.error('[DormDetail] Error creating review:', error);
        
        // จัดการ error message ใหม่ตามที่ backend แจ้งมา
        let errorMessage = 'ไม่สามารถส่งรีวิวได้';
        
        if (error.error?.message) {
          if (error.error.message.includes('รอการอนุมัติ')) {
            errorMessage = 'ต้องรอการอนุมัติจากเจ้าของหอพักก่อน';
            // อัปเดตสถานะการรีวิว
            this.canReview = false;
            this.reviewEligibilityMessage = errorMessage;
          } else {
            errorMessage = error.error.message;
          }
        } else if (error.status === 403) {
          errorMessage = 'คุณไม่มีสิทธิ์รีวิวหอพักนี้';
        } else if (error.status === 401) {
          errorMessage = 'กรุณาเข้าสู่ระบบก่อนรีวิว';
          this.navigateToLogin();
          return;
        }
        
        this.triggerPopup(errorMessage, 'warning');
        this.isSubmittingComment = false;
      }
    });
  }

  private loadReviews(): void {
    // โหลดรีวิวจาก API จริงเท่านั้น
    this.dormitoryService.getDormitoryReviews(this.dormId).subscribe({
      next: (response) => {
        console.log('[DormDetail] Raw API response:', response);
        
        // จัดการ API response ที่มี structure {reviews: Array} หรือ array โดยตรง
        let reviews = response;
        if (response && typeof response === 'object' && (response as any).reviews) {
          reviews = (response as any).reviews;
          console.log('[DormDetail] Extracted reviews from response:', reviews);
        }
        
        // ตรวจสอบว่า reviews เป็น array หรือไม่
        if (!Array.isArray(reviews)) {
          console.warn('[DormDetail] Reviews is not an array:', reviews);
          this.reviews = [];
          this.overallRating = 0;
          return;
        }
        
        this.reviews = reviews.map(review => ({
          id: review.review_id || review.id, // ID ของรีวิวจาก API
          username: review.username || 'ผู้ใช้งาน',
          avatar: review.avatar || '../../../assets/images/image-removebg-preview.png',
          comment: review.comment,
          rating: review.predicted_rating || review.rating, // ใช้ predicted_rating จาก AI
          isPositive: (review.predicted_rating || review.rating) >= 3,
          date: new Date(review.review_date || review.created_at),
          isResident: review.is_resident || false,
          isCurrentUser: review.user_id === this.currentUserId // ตรวจสอบว่าเป็นรีวิวของผู้ใช้ปัจจุบัน
        }));
        
        // คำนวณ overall rating จากรีวิวจริง (ค่าเฉลี่ย)
        if (this.reviews.length > 0) {
          const sum = this.reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
          this.overallRating = Math.round((sum / this.reviews.length) * 10) / 10;
        } else {
          this.overallRating = 0;
        }
        
        console.log('[DormDetail] Reviews loaded from API:', this.reviews);
        console.log('[DormDetail] Overall rating:', this.overallRating);
      },
      error: (error) => {
        console.error('[DormDetail] Error loading reviews:', error);
        // ถ้าโหลดไม่สำเร็จ ให้แสดงข้อความว่างแทนการใช้ mockup
        this.reviews = [];
        this.overallRating = 0;
        console.log('[DormDetail] No reviews available');
      }
    });
  }

  // private analyzeSentiment(comment: string): void {
  //   this.sentimentService.analyzeSentiment(comment).subscribe({
  //     next: (response) => {
  //       this.sentimentResult = response.sentiment_text;
  //       // เพิ่มความคิดเห็นหลังจากวิเคราะห์เสร็จ
  //       this.addCommentToList(comment, response.sentiment_text);
  //     },
  //     error: (error) => {
  //       console.error('Error analyzing sentiment:', error);
  //       // กรณีมีข้อผิดพลาด ให้เพิ่มความคิดเห็นโดยไม่มีผลวิเคราะห์
  //       this.addCommentToList(comment, 'neutral');
  //     }
  //   });
  // }

  // เพิ่มฟังก์ชันใหม่สำหรับเพิ่มความคิดเห็นลงในลิสต์
  private addCommentToList(comment: string, sentiment: string): void {
    const newReview: Review = {
      username: 'ผู้ใช้งาน',
      avatar: this.userAvatar,
      comment: comment,
      rating: 5, // ค่าเริ่มต้น หรือให้ผู้ใช้กำหนด
      isPositive: sentiment === 'positive',
      date: new Date()
    };
    
    this.reviews.unshift(newReview);
    this.newComment = '';
  }

  viewAllComments(): void {
    // 实现查看所有评论的逻辑
    console.log('View all comments clicked');
  }

  // ฟังก์ชันการแก้ไขรีวิว
  editReview(index: number): void {
    // ตรวจสอบว่าเป็นรีวิวของผู้ใช้ปัจจุบันหรือไม่
    if (!this.reviews[index]?.isCurrentUser) {
      console.warn('[DormDetail] ไม่สามารถแก้ไขรีวิวของผู้อื่นได้');
      return;
    }
    
    this.reviews[index].isEditing = true;
    this.reviews[index].editComment = this.reviews[index].comment;
  }

  saveReview(index: number): void {
    const review = this.reviews[index];
    if (!review.editComment || !review.editComment.trim()) {
      return;
    }

    // ป้องกันการกดซ้ำด้วย flag ภายในตัวรีวิว
    review.saving = true;

    // ส่งการแก้ไขไปยัง API
    this.dormitoryService.updateReview(review.id || index, {
      comment: review.editComment.trim()
    }).subscribe({
      next: (response) => {
        console.log('[DormDetail] Review updated successfully:', response);
        
        // อัปเดตข้อมูลรีวิวในรายการ
        review.comment = review.editComment!.trim();
        review.rating = response.predicted_rating || review.rating; // อัปเดต rating จาก AI
        review.isPositive = (response.predicted_rating || review.rating) >= 3;
        review.isEditing = false;
        review.editComment = '';
        review.saving = false;
        
        // โหลดรีวิวใหม่จาก API เพื่อให้ได้ข้อมูลล่าสุด
        this.loadReviews();
      },
      error: (error) => {
        console.error('[DormDetail] Error updating review:', error);
        this.triggerPopup('ไม่สามารถแก้ไขรีวิวได้: ' + (error.error?.message || 'เกิดข้อผิดพลาด'), 'error');
        review.saving = false;
      }
    });
  }

  cancelEdit(index: number): void {
    this.reviews[index].isEditing = false;
    this.reviews[index].editComment = '';
  }

  // ฟังก์ชันลบรีวิว
  deleteReview(index: number): void {
    const review = this.reviews[index];
    
    // ตรวจสอบว่าเป็นรีวิวของผู้ใช้ปัจจุบันหรือไม่
    if (!review.isCurrentUser) {
      console.warn('[DormDetail] ไม่สามารถลบรีวิวของผู้อื่นได้');
      return;
    }

    // ยืนยันการลบ
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรีวิวนี้?')) {
      return;
    }

    // ส่งคำขอลบไปยัง API
    this.dormitoryService.deleteReview(review.id || index).subscribe({
      next: (response) => {
        console.log('[DormDetail] Review deleted successfully:', response);
        
        // ลบรีวิวออกจากรายการ
        this.reviews.splice(index, 1);
        
        // โหลดรีวิวใหม่จาก API เพื่อให้ได้ข้อมูลล่าสุด
        this.loadReviews();
      },
      error: (error) => {
        console.error('[DormDetail] Error deleting review:', error);
        this.triggerPopup('ไม่สามารถลบรีวิวได้: ' + (error.error?.message || 'เกิดข้อผิดพลาด'), 'error');
      }
    });
  }

  // ฟังก์ชันสำหรับแสดงดาวว่าง
  getEmptyStars(rating: number): number[] {
    return Array(5 - rating).fill(0);
  }

  getStars(rating: number): number[] {
    const fullStars = Math.floor(rating);
    return Array(fullStars).fill(0);
  }

  // เพิ่ม method สำหรับปุ่มดูเพิ่มเติม
  viewMoreSimilarDorms() {
    // นำทางไปยังหน้า dorm-list พร้อม query parameter เพื่อแสดงหอพักแนะนำ
    this.router.navigate(['/dorm-list'], {
      queryParams: {
        type: 'recommended',
        from: 'dorm-detail',
        currentDormId: this.dormId
      }
    });
  }

  // เพิ่ม method สำหรับปุ่มเปรียบเทียบหอพัก
  compareDormitory() {
    if (!this.dormDetail) {
      console.error('[DormDetail] ไม่มีข้อมูลหอพักสำหรับเปรียบเทียบ');
      return;
    }

    // สร้าง CompareDormItem จากข้อมูลหอพักปัจจุบัน
    const compareItem: CompareDormItem = {
      id: this.dormId,
      name: this.dormName,
      image: this.images.length > 0 ? this.images[0] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      price: this.priceRange || this.dormPrice || 'ไม่ระบุราคา',
      location: this.location,
      zone: this.dormDetail.zone_name || 'ไม่ระบุโซน'
    };

    // เพิ่มเข้าสู่รายการเปรียบเทียบ
    const success = this.dormCompareService.addToCompare(compareItem);
    
    if (!success) {
      if (this.dormCompareService.isInCompare(this.dormId)) {
        console.log('[DormDetail] หอพักนี้อยู่ในรายการเปรียบเทียบแล้ว');
      } else {
        console.log('[DormDetail] ไม่สามารถเพิ่มหอพักได้ (เกินจำนวนสูงสุด)');
      }
    }
  }

}