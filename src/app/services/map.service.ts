import { Injectable } from '@angular/core';
import * as maptilersdk from '@maptiler/sdk';
import { DormDetail } from '../services/dormitory.service';

@Injectable({ providedIn: 'root' })
export class MapService {
  private map: maptilersdk.Map | null = null;
  private marker: maptilersdk.Marker | null = null;

  private isSatelliteView = false;
  private currentLat = 0;
  private currentLng = 0;
  private currentDormDetail: DormDetail | null = null;

  // refs & guards
  private satelliteControl: any | null = null;
  private navControl: maptilersdk.NavigationControl | null = null;
  private geoControl: maptilersdk.GeolocateControl | null = null;
  private pickHandler: ((e: any) => void) | null = null;
  private controlsAttached = false;

  // Singleton pattern properties
  private isInitialized = false;
  private currentContainerId: string | null = null;
  private mapInstances = new Map<string, { map: maptilersdk.Map; marker: maptilersdk.Marker | null }>();

  constructor() {
    maptilersdk.config.apiKey = 'Gpwk2Mpi9cl8hUkVrf6f';
  }

  initializeMap(
    containerId: string,
    lat: number,
    lng: number,
    dormName?: string,
    location?: string,
    dormDetail?: DormDetail
  ): void {
    // ตรวจสอบว่ามี map instance อยู่แล้วสำหรับ container นี้หรือไม่
    const existingInstance = this.mapInstances.get(containerId);
    if (existingInstance && existingInstance.map) {
      console.log(`[MapService] Reusing existing map instance for container: ${containerId}`);
      this.map = existingInstance.map;
      this.marker = existingInstance.marker;
      this.currentContainerId = containerId;
      
      // อัปเดตตำแหน่งและ marker
      this.map.setCenter([lng, lat]);
      this.updateMarker(lat, lng, dormName, location);
      return;
    }

    // ทำลาย map instance เดิม (ถ้ามี) เฉพาะเมื่อเปลี่ยน container
    if (this.currentContainerId && this.currentContainerId !== containerId) {
      this.destroyMap();
    }

    this.currentContainerId = containerId;
    this.currentLat = lat;
    this.currentLng = lng;
    this.currentDormDetail = dormDetail || null;

    console.log(`[MapService] Creating new map instance for container: ${containerId}`);

    this.map = new maptilersdk.Map({
      container: containerId,
      style: maptilersdk.MapStyle.STREETS,
      center: [lng, lat],
      zoom: 15,
      maxZoom: 20,
      minZoom: 3,
      pitch: 0,
      bearing: 0,
      // ปิดคอนโทรลเริ่มต้นทั้งหมด
      navigationControl: false,
      geolocateControl: false,
      attributionControl: false
    });

    this.map.on('load', () => {
      this.addControls();
      this.addMarker(lat, lng, dormName, location);
    });

    // เก็บ instance ไว้ใน Map
    this.mapInstances.set(containerId, { map: this.map, marker: null });
    this.isInitialized = true;
  }

  /** เพิ่มเฉพาะคอนโทรลที่ต้องการ โดยล้างคอนโทรลเดิมก่อน */
  private addControls(): void {
    if (!this.map || this.controlsAttached) return;
    
    // ลบคอนโทรลเดิมทั้งหมดก่อน (กันไว้กรณีที่ยังมี)
    this.clearAllExistingControls();
    
    this.controlsAttached = true;

    // เพิ่มคอนโทรลที่เราต้องการเท่านั้น
    this.addSatelliteControl();

    // ไม่เพิ่ม NavigationControl เลย (ไม่มีเข็มทิศ ไม่มีปุ่ม zoom)

    // GeolocateControl: ตำแหน่งผู้ใช้
    this.geoControl = new maptilersdk.GeolocateControl({
      positionOptions: { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 600000 
      },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true
    });
    this.map.addControl(this.geoControl, 'top-right');
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
    const service = this;

    this.satelliteControl = {
      _container: undefined as HTMLElement | undefined,
      onAdd(map: maptilersdk.Map) {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'maplibregl-ctrl-icon';
        btn.title = service.isSatelliteView ? 'แผนที่ถนน' : 'ภาพถ่ายดาวเทียม';

        const renderIcon = () => {
          btn.innerHTML = service.isSatelliteView
            ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="20" height="20" fill="currentColor" style="margin:auto">
                 <path d="M240-160 80-220v-580l160 60 200-80 240 90 200-80v580l-160 60-240-90-200 80ZM280-272l160-64v-496l-160 64v496Zm360 32 160-64v-496l-160 64v496Zm-200-72 160 60v-496l-160-60v496Z"/>
               </svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="20" height="20" fill="currentColor" style="margin:auto">
                 <path d="M480-80q-83 0-156.5-31.5T197-197q-54-54-85.5-127.5T80-480q0-83 31.5-156.5T197-763q54-54 127.5-85.5T480-880q83 0 156.5 31.5T763-763q54 54 85.5 127.5T880-480q0 83-31.5 156.5T763-197q-54 54-127.5 85.5T480-80Zm0-80q134 0 227-93t93-227q0-7-.5-14t-1.5-14q-6 29-27.5 47.5T717-440h-80q-33 0-56.5-23.5T557-520v-40H400v-80q0-33 23.5-56.5T480-720h40q0-23 12.5-40.5T565-788q-20-5-41-8.5t-44-3.5q-134 0-227 93t-93 227h200q66 0 113 47t47 113v40H400v110q19 5 38.5 7.5T480-160Z"/>
               </svg>`;
        };

        renderIcon();

        btn.addEventListener('click', () => {
          service.toggleMapStyle();
          btn.title = service.isSatelliteView ? 'แผนที่ถนน' : 'ภาพถ่ายดาวเทียม';
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

    this.map.addControl(this.satelliteControl, 'top-right');
  }

  private addMarker(lat: number, lng: number, _dormName?: string, _location?: string): void {
    if (!this.map) return;

    if (this.marker) this.marker.remove();

    this.marker = new maptilersdk.Marker({ color: '#EA4335' })
      .setLngLat([lng, lat])
      .addTo(this.map);

    const el = this.marker.getElement();
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    });

    // อัปเดต marker ใน instance map
    if (this.currentContainerId) {
      const instance = this.mapInstances.get(this.currentContainerId);
      if (instance) {
        instance.marker = this.marker;
      }
    }
  }

  private updateMarker(lat: number, lng: number, _dormName?: string, _location?: string): void {
    if (this.marker) {
      this.marker.setLngLat([lng, lat]);
    } else {
      this.addMarker(lat, lng, _dormName, _location);
    }
  }

  toggleMapStyle(): void {
    if (!this.map) return;

    this.isSatelliteView = !this.isSatelliteView;
    const nextStyle = this.isSatelliteView
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${maptilersdk.config.apiKey}`
      : maptilersdk.MapStyle.STREETS;

    const center = this.map.getCenter();
    const zoom = this.map.getZoom();
    const pitch = this.map.getPitch();
    const bearing = this.map.getBearing();

    this.map.setStyle(nextStyle);

    this.map.once('style.load', () => {
      this.map?.setCenter(center);
      this.map?.setZoom(zoom);
      this.map?.setPitch(pitch);
      this.map?.setBearing(bearing);

      if (this.marker) {
        const c = this.marker.getLngLat();
        this.addMarker(c.lat, c.lng);
      }
    });
  }

  enablePickLocation(callback: (pos: { lat: number; lng: number }) => void): void {
    if (!this.map) return;

    if (this.pickHandler) {
      this.map.off('click', this.pickHandler as any);
      this.pickHandler = null;
    }

    this.pickHandler = (e: any) => {
      const lat = e.lngLat.lat;
      const lng = e.lngLat.lng;
      this.currentLat = lat;
      this.currentLng = lng;
      this.addMarker(lat, lng);
      callback({ lat, lng });
    };

    this.map.on('click', this.pickHandler as any);
  }

  resize(): void {
    this.map?.resize();
  }

  reinitializeMap(
    containerId: string,
    lat: number,
    lng: number,
    dormName?: string,
    location?: string,
    dormDetail?: DormDetail
  ): void {
    this.destroyMap();
    setTimeout(() => {
      this.initializeMap(containerId, lat, lng, dormName, location, dormDetail);
    }, 100);
  }

  destroyMap(): void {
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    if (this.map) {
      if (this.satelliteControl) {
        this.map.removeControl(this.satelliteControl);
        this.satelliteControl = null;
      }
      if (this.geoControl) {
        this.map.removeControl(this.geoControl);
        this.geoControl = null;
      }
      if (this.pickHandler) {
        this.map.off('click', this.pickHandler as any);
        this.pickHandler = null;
      }
      this.map.remove();
      this.map = null;
    }
    this.controlsAttached = false;
    this.currentDormDetail = null;
  }

  /**
   * ทำลาย map instance ที่เฉพาะเจาะจง โดย container ID
   */
  destroyMapByContainer(containerId: string): void {
    const instance = this.mapInstances.get(containerId);
    if (instance) {
      if (instance.marker) {
        instance.marker.remove();
      }
      instance.map.remove();
      this.mapInstances.delete(containerId);
      
      // ถ้า instance ที่ลบเป็น current instance
      if (this.currentContainerId === containerId) {
        this.map = null;
        this.marker = null;
        this.currentContainerId = null;
        this.controlsAttached = false;
      }
      
      console.log(`[MapService] Destroyed map instance for container: ${containerId}`);
    }
  }

  /**
   * ทำลาย map instances ทั้งหมด
   */
  destroyAllMaps(): void {
    this.mapInstances.forEach((instance, containerId) => {
      if (instance.marker) {
        instance.marker.remove();
      }
      instance.map.remove();
      console.log(`[MapService] Destroyed map instance for container: ${containerId}`);
    });
    
    this.mapInstances.clear();
    this.map = null;
    this.marker = null;
    this.currentContainerId = null;
    this.controlsAttached = false;
    this.isInitialized = false;
    this.currentDormDetail = null;
  }
}