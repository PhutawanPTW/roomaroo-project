import { Injectable } from '@angular/core';
import * as maptilersdk from '@maptiler/sdk';
import { DormDetail } from '../services/dormitory.service';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map: maptilersdk.Map | null = null;
  private marker: maptilersdk.Marker | null = null;
  private isSatelliteView: boolean = false;
  private currentLat: number = 0;
  private currentLng: number = 0;
  private currentDormDetail: DormDetail | null = null;
  private satelliteControl: any = null;

  constructor() {
    // Initialize MapTiler API key
    maptilersdk.config.apiKey = 'Gpwk2Mpi9cl8hUkVrf6f';
  }

  initializeMap(containerId: string, lat: number, lng: number, dormName?: string, location?: string, dormDetail?: DormDetail): void {
    try {
      // Store current coordinates and dormitory detail
      this.currentLat = lat;
      this.currentLng = lng;
      this.currentDormDetail = dormDetail || null;

      this.map = new maptilersdk.Map({
        container: containerId,
        style: maptilersdk.MapStyle.STREETS,
        center: [lng, lat],
        zoom: 15,
        maxZoom: 20,
        minZoom: 5,
        pitch: 0,
        bearing: 0
      });

      // Wait for map to load
      this.map.on('load', () => {
        this.addMarker(lat, lng, dormName, location);
        this.addSatelliteControl();
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private addSatelliteControl(): void {
    if (!this.map) return;

    // Create custom satellite toggle control
    this.satelliteControl = {
      onAdd: (map: any) => {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        const button = document.createElement('button');
        button.className = 'maplibregl-ctrl-icon satellite-toggle-btn';
        button.type = 'button';
        button.title = this.isSatelliteView ? 'Road Map' : 'Satellite Map';

        // Set initial icon
        this.updateButtonIcon(button);

        button.addEventListener('click', () => {
          this.toggleMapStyle();
          this.updateButtonIcon(button);
          button.title = this.isSatelliteView ? 'Road Map' : 'Satellite Map';
        });

        container.appendChild(button);
        return container;
      },

      onRemove: () => {
        // Cleanup if needed
      }
    };

    // Add control to map (will be positioned after zoom controls)
    this.map.addControl(this.satelliteControl, 'top-right');
  }

  private updateButtonIcon(button: HTMLButtonElement): void {
    button.innerHTML = this.isSatelliteView ?
      `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" style="margin: auto;">
        <path d="M240-280h480L570-480 450-320l-90-120-120 160Zm0-200q100 0 170-70t70-170h-68q0 72-50 122t-122 50v68Zm0-136q43 0 72.5-30.5T342-720H240v104Zm-40 496q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0 0v-560 560Z"/>
      </svg>` :
      `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" style="margin: auto;">
        <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-7-.5-14.5T799-507q-5 29-27 48t-52 19h-80q-33 0-56.5-23.5T560-520v-40H400v-80q0-33 23.5-56.5T480-720h40q0-23 12.5-40.5T563-789q-20-5-40.5-8t-42.5-3q-134 0-227 93t-93 227h200q66 0 113 47t47 113v40H400v110q20 5 39.5 7.5T480-160Z"/>
      </svg>`;
  }

  private addMarker(lat: number, lng: number, dormName?: string, location?: string): void {
    if (!this.map) return;
  
    // Remove existing marker if any
    if (this.marker) {
      this.marker.remove();
    }
  
    // Create marker with default red pin
    this.marker = new maptilersdk.Marker({
      color: '#EA4335' // Google Maps red color
    })
      .setLngLat([lng, lat])
      .addTo(this.map);
  
    // Add click event to marker element to open Google Maps
    const markerElement = this.marker.getElement();
    markerElement.style.cursor = 'pointer';
    markerElement.addEventListener('click', () => {
      const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(googleMapsUrl, '_blank');
    });
  
    // Get main image from dormitory detail
    let imageUrl = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200&q=80';
    if (this.currentDormDetail?.images && this.currentDormDetail.images.length > 0) {
      imageUrl = this.currentDormDetail.images[0].image_url;
    }
  
    // Generate price display logic (เหมือนใน similar properties)
    let dailyPriceHtml = '';
    let monthlyPriceHtml = '';
    let fallbackPriceHtml = '';
  
    if (this.currentDormDetail) {
      // ราคารายวัน
      if (this.currentDormDetail.daily_price) {
        dailyPriceHtml = `<div class="text-sm font-semibold text-[#4F5356] mb-1">${this.currentDormDetail.daily_price} บาท/วัน</div>`;
      }
      
      // ราคารายเดือน
      if (this.currentDormDetail.monthly_price) {
        monthlyPriceHtml = `<div class="text-lg font-bold text-[#4F5356] mb-1">${this.currentDormDetail.monthly_price.toLocaleString()} บาท/เดือน</div>`;
      }
      
      // Fallback ราคาเดิม (ถ้าไม่มีทั้งรายวันและรายเดือน)
      if (!this.currentDormDetail.daily_price && !this.currentDormDetail.monthly_price) {
        if (this.currentDormDetail.min_price && this.currentDormDetail.max_price) {
          fallbackPriceHtml = `<div class="text-lg font-bold text-[#4F5356] mb-1">${this.currentDormDetail.min_price.toLocaleString()} - ${this.currentDormDetail.max_price.toLocaleString()} บาท/เดือน</div>`;
        } else {
          fallbackPriceHtml = `<div class="text-lg font-bold text-[#4F5356] mb-1">ติดต่อสอบถาม</div>`;
        }
      }
    } else {
      fallbackPriceHtml = `<div class="text-lg font-bold text-[#4F5356] mb-1">ติดต่อสอบถาม</div>`;
    }
  
    // Get zone name
    const zoneName = this.currentDormDetail?.zone_name || 'ไม่ระบุโซน';
  
    // Get last updated date
    const lastUpdated = this.currentDormDetail?.updated_date ? 
      new Date(this.currentDormDetail.updated_date).toLocaleDateString('th-TH') : 
      'ไม่ทราบ';
  
    // Generate stars for rating (เหมือนใน similar properties)
    const generateStarsHtml = (rating: number): string => {
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        starsHtml += `<svg xmlns="http://www.w3.org/2000/svg" fill="#FDD836" viewBox="0 0 20 20" class="w-4 h-4 relative">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
        </svg>`;
      }
      return starsHtml;
    };
  
    const rating = 5.0; // Fixed rating for now
    
    // Create popup with exact same structure as similar properties
    const popup = new maptilersdk.Popup({
      offset: 10,
      closeButton: false,
      className: 'dorm-map-popup'
    })
      .setHTML(`
        <div class="border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer max-w-[300px]">
          <!-- Image section -->
          <div class="w-full h-36">
            <img src="${imageUrl}" alt="Similar Property" class="w-full h-full object-cover">
          </div>
          <!-- Content section -->
          <div class="p-3">
            <!-- ราคารายวัน -->
            ${dailyPriceHtml}
            <!-- ราคารายเดือน -->
            ${monthlyPriceHtml}
            <!-- Fallback ราคาเดิม -->
            ${fallbackPriceHtml}
            <div class="text-lg font-medium text-[#4F5356] mb-1 line-clamp-1">${dormName || 'ไม่ระบุชื่อ'}</div>
            <div class="text-sm text-[#4F5356] mb-1 line-clamp-1">${zoneName}</div>
            <div class="text-xs text-[#4F5356] mb-2">อัพเดทล่าสุด ${lastUpdated}</div>
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <span class="text-sm font-bold text-[#4F5356] relative top-0.5">${rating.toFixed(1)}</span>
                <div class="ml-2 flex relative top-[0.05rem]">
                  ${generateStarsHtml(rating)}
                </div>
              </div>
            </div>
          </div>
        </div>
      `);
  
    this.marker.setPopup(popup);
  }

  toggleMapStyle(): void {
    if (!this.map) return;

    this.isSatelliteView = !this.isSatelliteView;

    const newStyle = this.isSatelliteView ?
      'https://api.maptiler.com/maps/hybrid/style.json?key=Gpwk2Mpi9cl8hUkVrf6f' :
      maptilersdk.MapStyle.STREETS;

    const currentCenter = this.map.getCenter();
    const currentZoom = this.map.getZoom();
    const currentPitch = this.map.getPitch();
    const currentBearing = this.map.getBearing();

    this.map.setStyle(newStyle);

    this.map.once('style.load', () => {
      this.map?.setCenter(currentCenter);
      this.map?.setZoom(currentZoom);
      this.map?.setPitch(currentPitch);
      this.map?.setBearing(currentBearing);

      // Re-add marker if coordinates exist
      if (this.marker) {
        const coordinates = this.marker.getLngLat();
        this.addMarker(coordinates.lat, coordinates.lng);
      }
    });
  }

  destroyMap(): void {
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    if (this.map && this.satelliteControl) {
      this.map.removeControl(this.satelliteControl);
      this.satelliteControl = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.currentDormDetail = null;
  }

  // เพิ่ม method สำหรับ zoom controls (ใช้ built-in controls ของ MapTiler)
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

  // Method สำหรับแก้ไขปัญหา hot reload
  reinitializeMap(containerId: string, lat: number, lng: number, dormName?: string, location?: string, dormDetail?: DormDetail): void {
    // ลบแมพเก่าก่อน
    this.destroyMap();

    // รอสักหน่อยแล้วสร้างใหม่
    setTimeout(() => {
      this.initializeMap(containerId, lat, lng, dormName, location, dormDetail);
    }, 100);
  }
}