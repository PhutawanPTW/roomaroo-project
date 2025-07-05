import { Injectable } from '@angular/core';
import * as maptilersdk from '@maptiler/sdk';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map: maptilersdk.Map | null = null;
  private marker: maptilersdk.Marker | null = null;
  private isSatelliteView: boolean = false;

  constructor() {
    // Initialize MapTiler API key
    maptilersdk.config.apiKey = 'Gpwk2Mpi9cl8hUkVrf6f';
  }

  initializeMap(containerId: string, lat: number, lng: number): void {
    try {
      console.log('Initializing map with coordinates:', { lat, lng });

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

      // Create map controls container
      const mapControls = document.createElement('div');
      mapControls.className = 'map-controls';
      document.getElementById(containerId)?.appendChild(mapControls);

      // Create layer toggle button (Google Maps style)
      const layerToggle = document.createElement('div');
      layerToggle.className = 'layer-toggle';
      layerToggle.innerHTML = `
        <button class="map-button">
          <div class="button-content">
            <img src="https://maps.gstatic.com/mapfiles/maps_lite/images/2x/ic_map_black_24dp.png" 
                 alt="Map Type" class="map-icon" />
            <span class="button-text">แผนที่</span>
          </div>
        </button>
      `;
      mapControls.appendChild(layerToggle);

      // Wait for map to load
      this.map.on('load', () => {
        console.log('Map loaded successfully');
        this.addMarker(lat, lng);
        this.addControls();
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private addMarker(lat: number, lng: number): void {
    if (!this.map) return;

    console.log('Adding marker at coordinates:', { lat, lng });

    // Remove existing marker if any
    if (this.marker) {
      this.marker.remove();
    }

    // Create marker container
    const el = document.createElement('div');
    el.className = 'custom-marker';
    
    // Create marker pin
    const pin = document.createElement('div');
    pin.className = 'marker-pin';
    el.appendChild(pin);

    // Create marker label
    const label = document.createElement('div');
    label.className = 'marker-label';
    label.textContent = 'หอพัก';
    el.appendChild(label);

    // Create new marker
    this.marker = new maptilersdk.Marker({
      element: el,
      anchor: 'bottom',
      offset: [0, -5]
    })
      .setLngLat([lng, lat])
      .addTo(this.map);

    // Add popup with coordinates
    const popup = new maptilersdk.Popup({
      offset: 25,
      closeButton: false,
      className: 'google-maps-popup'
    })
      .setHTML(`
        <div class="popup-content">
          <div class="popup-title">ตำแหน่งหอพัก</div>
          <div class="popup-coordinates">
            <span>ละติจูด: ${lat.toFixed(6)}</span>
            <span>ลองจิจูด: ${lng.toFixed(6)}</span>
          </div>
        </div>
      `);

    // Show popup on hover
    this.marker.getElement().addEventListener('mouseenter', () => {
      console.log('Showing popup for coordinates:', { lat, lng });
      this.marker?.setPopup(popup);
      popup.addTo(this.map!);
    });

    this.marker.getElement().addEventListener('mouseleave', () => {
      popup.remove();
    });
  }

  private addControls(): void {
    if (!this.map) return;

    // Add zoom and navigation controls (Google Maps style)
    const nav = new maptilersdk.NavigationControl({
      showCompass: true,
      visualizePitch: true,
      showZoom: true
    });
    this.map.addControl(nav, 'bottom-right');

    // Add custom layer toggle control
    const layerControl = {
      onAdd: (map: maptilersdk.Map) => {
        const container = document.createElement('div');
        container.className = 'google-maps-control';
        
        const button = document.createElement('button');
        button.className = 'google-maps-button';
        button.type = 'button';
        
        const updateButtonContent = () => {
          button.innerHTML = `
            <div class="button-content">
              <img src="${this.isSatelliteView ? 
                'https://maps.gstatic.com/mapfiles/maps_lite/images/2x/ic_satellite_black_24dp.png' : 
                'https://maps.gstatic.com/mapfiles/maps_lite/images/2x/ic_map_black_24dp.png'}" 
                alt="Map Type" class="map-icon" />
              <span class="button-text">${this.isSatelliteView ? 'ดาวเทียม' : 'แผนที่'}</span>
            </div>
          `;
        };
        
        updateButtonContent();
        
        button.onclick = () => {
          this.toggleMapStyle();
          updateButtonContent();
        };
        
        container.appendChild(button);
        return container;
      },
      onRemove: () => {}
    };
    
    this.map.addControl(layerControl, 'top-right');
  }

  toggleMapStyle(): void {
    if (!this.map) return;
    
    this.isSatelliteView = !this.isSatelliteView;
    console.log('Toggling map style:', this.isSatelliteView ? 'Satellite' : 'Streets');

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
        console.log('Re-adding marker after style change:', coordinates);
        this.addMarker(coordinates.lat, coordinates.lng);
      }
    });
  }

  destroyMap(): void {
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    console.log('Map destroyed');
  }
} 