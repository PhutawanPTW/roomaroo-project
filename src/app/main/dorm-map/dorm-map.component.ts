import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as maptilersdk from '@maptiler/sdk';
import { NavbarComponent } from '../navbar/navbar.component';
import {
  DormitoryService,
  Dorm,
  DormDetail,
} from '../../services/dormitory.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dorm-map',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './dorm-map.component.html',
  styleUrl: './dorm-map.component.css',
})
export class DormMapComponent implements OnInit, OnDestroy {
  // --- Mock data: ใช้เฉพาะเดโมก่อนเชื่อมจริง ---
  private mockDorms: Dorm[] = [
    {
      dorm_id: 1,
      dorm_name: 'โฟโมส เรซิเดนท์',
      min_price: 2600,
      max_price: 3000,
      zone_name: 'โซนขามเรียง',
      rating: 5.0,
      latitude: 16.2445,
      longitude: 103.2508,
      main_image_url:
        'https://happylongway.com/wp-content/uploads/2018/10/Eiffel-800x500.jpg',
    },
    {
      dorm_id: 2,
      dorm_name: 'บ้านพักวิวสวน',
      min_price: 2800,
      max_price: 3500,
      zone_name: 'โซนหลัง ม.',
      rating: 4.7,
      latitude: 16.246,
      longitude: 103.2465,
      main_image_url:
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1200&auto=format&fit=crop',
    },
  ] as any;

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private map: maptilersdk.Map | null = null;
  private markers: maptilersdk.Marker[] = [];
  private popup: maptilersdk.Popup | null = null;
  private subscription = new Subscription();

  // Map data
  dormitories: Dorm[] = [];
  selectedDorm: DormDetail | null = null;
  isLoading = true;
  error: string | null = null;
  totalDormitories: number = 0;

  // Map configuration
  private readonly defaultCenter: [number, number] = [98.9853, 18.7883]; // Chiang Mai (fallback)
  private readonly defaultZoom = 12;
  private isSatelliteView = true; // เริ่มต้นเป็นดาวเทียม

  constructor(private dormitoryService: DormitoryService) {
    maptilersdk.config.apiKey = environment.mapTilerApiKey;
  }

  ngOnInit(): void {
    this.loadDormitories();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroyMap();
  }

  private loadDormitories(): void {
    this.isLoading = true;
    this.error = null;

    this.subscription.add(
      this.dormitoryService.getAllDormitoriesForMap().subscribe({
        next: (result) => {
          const apiDorms = (result?.dormitories || []).filter(
            (d: Dorm) => d.latitude && d.longitude
          );
          // ถ้า API ไม่มี ใช้ mock ชั่วคราว
          this.dormitories = apiDorms.length ? apiDorms : this.mockDorms;
          this.totalDormitories = result?.total || this.dormitories.length;
          this.isLoading = false;
          this.initializeMap();
        },
        error: () => {
          // error → ใช้ mock data เพื่อให้เดโมต่อได้
          this.dormitories = this.mockDorms;
          this.totalDormitories = this.dormitories.length;
          this.isLoading = false;
          this.initializeMap();
        },
      })
    );
  }

  private initializeMap(): void {
    if (!this.mapContainer?.nativeElement) {
      console.error('[DormMap] Map container not found');
      return;
    }

    try {
      // Calculate center from dormitories if available
      let initialCenter = this.defaultCenter;
      let initialZoom = this.defaultZoom;

      if (this.dormitories.length > 0) {
        // Calculate center from all dormitories
        const validDorms = this.dormitories.filter(
          (dorm) => dorm.latitude && dorm.longitude
        );
        if (validDorms.length > 0) {
          const lats = validDorms.map((dorm) => dorm.latitude!);
          const lngs = validDorms.map((dorm) => dorm.longitude!);
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
          initialCenter = [centerLng, centerLat];
          initialZoom = 11; // Zoom out a bit to show more area
        }
      }

      // Create map with optimized settings
      this.map = new maptilersdk.Map({
        container: this.mapContainer.nativeElement,
        style: maptilersdk.MapStyle.SATELLITE, // เริ่มต้นเป็นดาวเทียม
        center: initialCenter,
        zoom: initialZoom,
        maxZoom: 20,
        minZoom: 8,
      });

      // Add only essential controls - ตำแหน่งตัวเองและดาวเทียม
      this.addMapControls();

      // Wait for map to load
      this.map.on('load', () => {
        console.log('[DormMap] Map loaded successfully');
        this.addMarkers();
      });

      // Handle map errors
      this.map.on('error', (e) => {
        console.error('[DormMap] Map error:', e);
        this.error = 'ไม่สามารถโหลดแผนที่ได้';
        this.isLoading = false;
      });

      // Handle style loading
      this.map.on('styledata', () => {
        console.log('[DormMap] Map style loaded');
      });
    } catch (error) {
      console.error('[DormMap] Error initializing map:', error);
      this.error = 'ไม่สามารถโหลดแผนที่ได้';
    }
  }

  private addMarkers(): void {
    if (!this.map) return;

    this.markers.forEach((m) => m.remove());
    this.markers = [];

    const bounds = new maptilersdk.LngLatBounds();

    this.dormitories.forEach((dorm) => {
      if (!dorm.latitude || !dorm.longitude) return;

      const marker = new maptilersdk.Marker({ color: '#EA4335', scale: 0.9 })
        .setLngLat([dorm.longitude, dorm.latitude])
        .addTo(this.map!);

      marker.getElement().style.cursor = 'pointer';

      const popup = new maptilersdk.Popup({
        closeButton: false,
        closeOnClick: true,
        maxWidth: 'none',
      }).setHTML(this.createPopupCard(dorm));

      marker.setPopup(popup);

      bounds.extend([dorm.longitude, dorm.latitude]);
      this.markers.push(marker);
    });

    // ถ้ามีหมุด ≥ 1 → ซูมครอบหมุดทั้งหมด
    if (!bounds.isEmpty() && this.map) {
      this.map.fitBounds(bounds, {
        padding: { top: 80, right: 80, bottom: 80, left: 80 },
        maxZoom: 15,
        duration: 800,
      });
    } else {
      // ไม่มีหมุด → ใช้ fallback เดิม
      this.map!.setCenter(this.defaultCenter);
      this.map!.setZoom(this.defaultZoom);
    }
  }

  /** การ์ด Popup (ไม่มี rounded, ใช้ tip เดิมของแผนที่) */
  private createPopupCard(d: Dorm | DormDetail): string {
    const img = (d as any).main_image_url || (d as any).thumbnail_url || '';
    const price = this.getPriceDisplay(d);
    const rating = (d.rating ?? 0).toFixed(1);

    return `
    <div class="font-thai w-[280px]">
      <div class="m-4">                       <!-- ระยะห่างจากขอบ popup -->
        ${
          img
            ? `
          <img src="${img}" alt="${d.dorm_name || ''}"
               class="w-full h-[140px] object-cover mb-3">`
            : ''
        }

        <div class="text-lg leading-7 font-semibold font-thai text-slate-900">
          ${price}
        </div>

        <div class="mt-2 text-[15px] leading-6 text-slate-800">
          ${d.dorm_name || '-'}
        </div>

        <div class="mt-1 text-[13px] leading-5 text-slate-400">
          ${d.zone_name || 'ไม่ระบุโซน'}
        </div>

        <div class="mt-3 flex items-center gap-2">
  <span class="text-[13px] font-bold text-slate-900 relative top-[1px]">${rating}</span>
  <div class="flex items-center gap-1">
    ${this.starRow(5)}
  </div>
</div>
      </div>
    </div>`;
  }

  private starRow(count: number): string {
    const star = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
           class="w-[18px] h-[18px] fill-yellow-400">
        <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.95 4.8 17.5l.99-5.78L1.6 7.62l5.82-.85L10 1.5z"/>
      </svg>`;
    return new Array(count).fill(star).join('');
  }

  /** สร้างดาวแบบ Tailwind (เต็ม/ครึ่ง/ว่าง) */
  private getStarIcons(rating: number): string {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;

    const fullStar = '<span class="text-yellow-400 text-xl">★</span>';
    const halfStar =
      '<span class="relative text-xl"><span class="text-yellow-400">★</span><span class="absolute inset-y-0 right-0 w-1/2 bg-white"></span></span>';
    const emptyStar = '<span class="text-gray-300 text-xl">★</span>';

    return `${fullStar.repeat(full)}${half ? halfStar : ''}${emptyStar.repeat(
      empty
    )}`;
  }

  private onMarkerClick(dorm: Dorm): void {
    // Close existing popup
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }

    // Load detailed data for popup
    this.subscription.add(
      this.dormitoryService.getDormitoryPopup(dorm.dorm_id).subscribe({
        next: (dormDetail) => {
          this.selectedDorm = dormDetail;
          this.showPopup(dormDetail);
        },
        error: (err) => {
          console.error('[DormMap] Error loading dormitory popup:', err);
          // Show basic popup with available data
          this.showBasicPopup(dorm);
        },
      })
    );
  }

  private showPopup(dormDetail: DormDetail): void {
    if (!this.map || !dormDetail.latitude || !dormDetail.longitude) return;

    // Create popup content
    const popupContent = this.createPopupContent(dormDetail);

    // Create and show popup
    this.popup = new maptilersdk.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px',
    })
      .setLngLat([dormDetail.longitude, dormDetail.latitude])
      .setHTML(popupContent)
      .addTo(this.map!);
  }

  private showBasicPopup(dorm: Dorm): void {
    if (!this.map || !dorm.latitude || !dorm.longitude) return;

    const popupContent = this.createBasicPopupContent(dorm);

    this.popup = new maptilersdk.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px',
    })
      .setLngLat([dorm.longitude, dorm.latitude])
      .setHTML(popupContent)
      .addTo(this.map!);
  }

  private createPopupContent(dormDetail: DormDetail): string {
    const imageUrl =
      dormDetail.main_image_url || dormDetail.thumbnail_url || '';
    const priceDisplay = this.getPriceDisplay(dormDetail);
    const rating = dormDetail.rating || 0;
    const stars = this.getStarRating(rating);

    return `
      <div class="popup-content">
        ${
          imageUrl
            ? `<img src="${imageUrl}" alt="${dormDetail.dorm_name}" class="popup-image">`
            : ''
        }
        <div class="popup-info">
          <h3 class="popup-title">${dormDetail.dorm_name}</h3>
          <p class="popup-price">${priceDisplay}</p>
          <p class="popup-zone">${dormDetail.zone_name || 'ไม่ระบุโซน'}</p>
          <div class="popup-rating">
            <span class="rating-text">${rating.toFixed(1)}</span>
            <div class="stars">${stars}</div>
          </div>
          ${
            dormDetail.dorm_description
              ? `<p class="popup-description">${dormDetail.dorm_description}</p>`
              : ''
          }
        </div>
      </div>
    `;
  }

  private createBasicPopupContent(dorm: Dorm): string {
    const priceDisplay = this.getPriceDisplay(dorm);
    const rating = dorm.rating || 0;
    const stars = this.getStarRating(rating);

    return `
      <div class="popup-content">
        <div class="popup-info">
          <h3 class="popup-title">${dorm.dorm_name}</h3>
          <p class="popup-price">${priceDisplay}</p>
          <p class="popup-zone">${dorm.zone_name || 'ไม่ระบุโซน'}</p>
          <div class="popup-rating">
            <span class="rating-text">${rating.toFixed(1)}</span>
            <div class="stars">${stars}</div>
          </div>
        </div>
      </div>
    `;
  }

  private getPriceDisplay(dorm: Dorm | DormDetail): string {
    if (dorm.min_price && dorm.max_price) {
      return `${dorm.min_price.toLocaleString()} - ${dorm.max_price.toLocaleString()} บาท/เดือน`;
    } else if (dorm.price_display) {
      return dorm.price_display;
    } else {
      return 'ติดต่อสอบถาม';
    }
  }

  private getStarRating(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '';
    for (let i = 0; i < fullStars; i++) {
      stars += '<span class="star full">★</span>';
    }
    if (hasHalfStar) {
      stars += '<span class="star half">★</span>';
    }
    for (let i = 0; i < emptyStars; i++) {
      stars += '<span class="star empty">☆</span>';
    }

    return stars;
  }

  private addMapControls(): void {
    if (!this.map) return;

    // ลบคอนโทรลเดิมทั้งหมดที่อาจจะมี
    this.clearAllExistingControls();

    // เพิ่ม Satellite Control
    this.addSatelliteControl();
  }

  /** ลบคอนโทรลเดิมทั้งหมดที่อาจจะมี */
  private clearAllExistingControls(): void {
    if (!this.map) return;

    const container = this.map.getContainer() as HTMLElement;

    // ลบ zoom controls
    container
      .querySelectorAll('.maplibregl-ctrl-zoom, .mapboxgl-ctrl-zoom')
      .forEach((el) => {
        el.parentElement?.removeChild(el);
      });

    // ลบ navigation controls เดิม
    container
      .querySelectorAll('.maplibregl-ctrl-compass, .mapboxgl-ctrl-compass')
      .forEach((el) => {
        const parent = el.closest(
          '.maplibregl-ctrl-group, .mapboxgl-ctrl-group'
        );
        if (parent) parent.parentElement?.removeChild(parent);
      });

    // ลบ geolocate controls เดิม
    container
      .querySelectorAll('.maplibregl-ctrl-geolocate, .mapboxgl-ctrl-geolocate')
      .forEach((el) => {
        const parent = el.closest(
          '.maplibregl-ctrl-group, .mapboxgl-ctrl-group'
        );
        if (parent) parent.parentElement?.removeChild(parent);
      });

    // ลบ satellite controls เดิม (ถ้ามี)
    container
      .querySelectorAll('[title*="ดาวเทียม"], [title*="satellite"]')
      .forEach((el) => {
        const parent = el.closest(
          '.maplibregl-ctrl-group, .mapboxgl-ctrl-group'
        );
        if (parent) parent.parentElement?.removeChild(parent);
      });
  }

  private addSatelliteControl(): void {
    if (!this.map) return;
    const component = this;

    const satelliteControl = {
      _container: undefined as HTMLElement | undefined,
      onAdd(map: maptilersdk.Map) {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'maplibregl-ctrl-icon';
        btn.title = component.isSatelliteView ? 'แผนที่ถนน' : 'ภาพถ่ายดาวเทียม';

        const renderIcon = () => {
          btn.innerHTML = component.isSatelliteView
            ? '<span class="material-symbols-outlined">streetview</span>'
            : '<span class="material-symbols-outlined">globe</span>';
        };

        renderIcon();

        btn.addEventListener('click', () => {
          component.toggleMapStyle();
          btn.title = component.isSatelliteView
            ? 'แผนที่ถนน'
            : 'ภาพถ่ายดาวเทียม';
          renderIcon();
        });

        container.appendChild(btn);
        (this as any)._container = container;
        return container;
      },
      onRemove() {
        const c = (this as any)._container as HTMLElement | undefined;
        if (c && c.parentNode) c.parentNode.removeChild(c);
      },
    };

    this.map.addControl(satelliteControl, 'top-right');
  }

  private toggleMapStyle(): void {
    if (!this.map) return;

    this.isSatelliteView = !this.isSatelliteView;

    if (this.isSatelliteView) {
      this.map.setStyle(maptilersdk.MapStyle.SATELLITE);
    } else {
      this.map.setStyle(maptilersdk.MapStyle.STREETS);
    }
  }

  private destroyMap(): void {
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }

    this.markers.forEach((marker) => marker.remove());
    this.markers = [];

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // Public methods for template
  getTotalDormitories(): number {
    return this.totalDormitories;
  }

  retryLoad(): void {
    this.loadDormitories();
  }
}
