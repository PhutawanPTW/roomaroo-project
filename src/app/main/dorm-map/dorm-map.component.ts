import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as maptilersdk from '@maptiler/sdk';
import { NavbarComponent } from '../navbar/navbar.component';
import { DormitoryService, Dorm, DormDetail } from '../../services/dormitory.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dorm-map',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './dorm-map.component.html',
  styleUrl: './dorm-map.component.css'
})
export class DormMapComponent implements OnInit, OnDestroy {
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
    maptilersdk.config.apiKey = 'Gpwk2Mpi9cl8hUkVrf6f';
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
          console.log('[DormMap] Loaded dormitories:', result);
          this.dormitories = result.dormitories.filter(dorm => dorm.latitude && dorm.longitude);
          this.totalDormitories = result.total || this.dormitories.length;
          this.isLoading = false;
          this.initializeMap();
        },
        error: (err) => {
          console.error('[DormMap] Error loading dormitories:', err);
          this.error = 'ไม่สามารถโหลดข้อมูลหอพักได้';
          this.isLoading = false;
        }
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
        const validDorms = this.dormitories.filter(dorm => dorm.latitude && dorm.longitude);
        if (validDorms.length > 0) {
          const lats = validDorms.map(dorm => dorm.latitude!);
          const lngs = validDorms.map(dorm => dorm.longitude!);
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
        minZoom: 8
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

    // Clear existing markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    console.log('[DormMap] Adding markers for', this.dormitories.length, 'dormitories');

    // Add markers for each dormitory
    this.dormitories.forEach(dorm => {
      if (dorm.latitude && dorm.longitude) {
        const marker = new maptilersdk.Marker({ 
          color: '#EA4335', // Red color for all dormitories
          scale: 0.8
        })
          .setLngLat([dorm.longitude, dorm.latitude])
          .addTo(this.map!);

        // Add click event
        marker.getElement().addEventListener('click', () => {
          this.onMarkerClick(dorm);
        });

        this.markers.push(marker);
      }
    });

    // ไม่ต้อง fitBounds อีก เพราะเริ่มต้นที่ตำแหน่งหมุดแล้ว
    // แต่ถ้าไม่มีหมุด ให้เริ่มต้นที่เชียงใหม่
    if (this.markers.length === 0 && this.map) {
      this.map.setCenter(this.defaultCenter);
      this.map.setZoom(this.defaultZoom);
    }
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
        }
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
      maxWidth: '300px'
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
      maxWidth: '300px'
    })
      .setLngLat([dorm.longitude, dorm.latitude])
      .setHTML(popupContent)
      .addTo(this.map!);
  }

  private createPopupContent(dormDetail: DormDetail): string {
    const imageUrl = dormDetail.main_image_url || dormDetail.thumbnail_url || '';
    const priceDisplay = this.getPriceDisplay(dormDetail);
    const rating = dormDetail.rating || 0;
    const stars = this.getStarRating(rating);

    return `
      <div class="popup-content">
        ${imageUrl ? `<img src="${imageUrl}" alt="${dormDetail.dorm_name}" class="popup-image">` : ''}
        <div class="popup-info">
          <h3 class="popup-title">${dormDetail.dorm_name}</h3>
          <p class="popup-price">${priceDisplay}</p>
          <p class="popup-zone">${dormDetail.zone_name || 'ไม่ระบุโซน'}</p>
          <div class="popup-rating">
            <span class="rating-text">${rating.toFixed(1)}</span>
            <div class="stars">${stars}</div>
          </div>
          ${dormDetail.dorm_description ? `<p class="popup-description">${dormDetail.dorm_description}</p>` : ''}
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
    container.querySelectorAll('.maplibregl-ctrl-zoom, .mapboxgl-ctrl-zoom').forEach(el => {
      el.parentElement?.removeChild(el);
    });
    
    // ลบ navigation controls เดิม
    container.querySelectorAll('.maplibregl-ctrl-compass, .mapboxgl-ctrl-compass').forEach(el => {
      const parent = el.closest('.maplibregl-ctrl-group, .mapboxgl-ctrl-group');
      if (parent) parent.parentElement?.removeChild(parent);
    });
    
    // ลบ geolocate controls เดิม
    container.querySelectorAll('.maplibregl-ctrl-geolocate, .mapboxgl-ctrl-geolocate').forEach(el => {
      const parent = el.closest('.maplibregl-ctrl-group, .mapboxgl-ctrl-group');
      if (parent) parent.parentElement?.removeChild(parent);
    });
    
    // ลบ satellite controls เดิม (ถ้ามี)
    container.querySelectorAll('[title*="ดาวเทียม"], [title*="satellite"]').forEach(el => {
      const parent = el.closest('.maplibregl-ctrl-group, .mapboxgl-ctrl-group');
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
            ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="20" height="20" fill="currentColor" style="margin:auto">
                 <path d="M240-160 80-220v-580l160 60 200-80 240 90 200-80v580l-160 60-240-90-200 80ZM280-272l160-64v-496l-160 64v496Zm360 32 160-64v-496l-160 64v496Zm-200-72 160 60v-496l-160-60v496Z"/>
               </svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="20" height="20" fill="currentColor" style="margin:auto">
                 <path d="M480-80q-83 0-156.5-31.5T197-197q-54-54-85.5-127.5T80-480q0-83 31.5-156.5T197-763q54-54 127.5-85.5T480-880q83 0 156.5 31.5T763-763q54 54 85.5 127.5T880-480q0 83-31.5 156.5T763-197q-54 54-127.5 85.5T480-80Zm0-80q134 0 227-93t93-227q0-7-.5-14t-1.5-14q-6 29-27.5 47.5T717-440h-80q-33 0-56.5-23.5T557-520v-40H400v-80q0-33 23.5-56.5T480-720h40q0-23 12.5-40.5T565-788q-20-5-41-8.5t-44-3.5q-134 0-227 93t-93 227h200q66 0 113 47t47 113v40H400v110q19 5 38.5 7.5T480-160Z"/>
               </svg>`;
        };

        renderIcon();

        btn.addEventListener('click', () => {
          component.toggleMapStyle();
          btn.title = component.isSatelliteView ? 'แผนที่ถนน' : 'ภาพถ่ายดาวเทียม';
          renderIcon();
        });

        container.appendChild(btn);
        (this as any)._container = container;
        return container;
      },
      onRemove() {
        const c = (this as any)._container as HTMLElement | undefined;
        if (c && c.parentNode) c.parentNode.removeChild(c);
      }
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

    this.markers.forEach(marker => marker.remove());
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
