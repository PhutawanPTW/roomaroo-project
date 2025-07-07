import { Component, AfterViewInit, Renderer2, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NavbarComponent } from "../navbar/navbar.component";
import { DOCUMENT } from '@angular/common';
import { MapService } from '../../services/map.service';
import * as maptilersdk from '@maptiler/sdk';

// Import for leaflet if available
declare const L: any;
declare const google: any;

interface Amenity {
  id: string;
  name: string;
  checked: boolean;
}

@Component({
  selector: 'app-dorm-add',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './dorm-add.component.html',
  styleUrl: './dorm-add.component.css'
})
export class DormAddComponent implements AfterViewInit, OnDestroy {
  dormForm!: FormGroup;
  currentStep = 1;
  totalSteps = 4;
  maxReachedStep = 1; // Tracks the furthest step the user has reached
  map: maptilersdk.Map | null = null;
  previewMap: maptilersdk.Map | null = null;
  marker: maptilersdk.Marker | null = null;
  previewMarker: maptilersdk.Marker | null = null;
  defaultLocation = { lat: 13.7563, lng: 100.5018 }; // Bangkok default
  private googleMapsLoaded = false;
  private mapTilerLoaded = true; // MapTiler SDK is already imported
  private GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key
  selectedImages: any[] = [];
  imagePreviewUrls: string[] = [];
  amenities: Amenity[] = [
    { id: 'wifi', name: 'WiFi', checked: false },
    { id: 'aircon', name: 'แอร์', checked: false },
    { id: 'fan', name: 'พัดลม', checked: false },
    { id: 'tv', name: 'TV', checked: false },
    { id: 'fridge', name: 'ตู้เย็น', checked: false },
    { id: 'microwave', name: 'ไมโครเวฟ', checked: false },
    { id: 'waterHeater', name: 'เครื่องทำน้ำอุ่น', checked: false },
    { id: 'washingMachine', name: 'เครื่องซักผ้า', checked: false },
    { id: 'cctv', name: 'กล้องวงจรปิด', checked: false },
    { id: 'keyCard', name: 'คีย์การ์ด', checked: false },
    { id: 'securityGuard', name: 'รปภ.', checked: false },
    { id: 'parkingLot', name: 'ที่จอดรถ', checked: false },
    { id: 'elevator', name: 'ลิฟต์', checked: false },
    { id: 'pool', name: 'สระว่ายน้ำ', checked: false },
    { id: 'gym', name: 'ฟิตเนส', checked: false },
    { id: 'coveredParking', name: 'อินเทอร์เน็ตไฟเบอร์', checked: false },
    { id: 'petFriendly', name: 'ที่พักอาศัย', checked: false },
    { id: 'coWorkingSpace', name: 'สตูดิโอ', checked: false },
    { id: 'meetingRoom', name: 'ตู้น้ำดื่มหยอดเหรียญ', checked: false },
    { id: 'shop', name: 'ห้องอเนก', checked: false },
    { id: 'laundry', name: 'ห้องครัว', checked: false },
    { id: 'lobby', name: 'Lobby', checked: false }
  ];
  leafletMap: any;
  leafletMarker: any;

  constructor(
    private fb: FormBuilder,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private mapService: MapService
  ) {
    this.initForm();
  }

  ngAfterViewInit() {
    // Initialize maps after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.initLocationMap();
    }, 300);
  }

  ngOnDestroy() {
    // Clean up maps
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    if (this.previewMap) {
      this.previewMap.remove();
      this.previewMap = null;
    }
  }

  initForm() {
    this.dormForm = this.fb.group({
      generalInfo: this.fb.group({
        name: ['', Validators.required],
        type: ['', Validators.required],
        price: ['', Validators.required],
        description: ['', Validators.required]
      }),
      roomTypes: this.fb.array([this.createRoomType()]),
      utilities: this.fb.group({
        electricity: this.fb.group({
          type: ['คิดตามปลั๊ว', Validators.required],
          pricePerUnit: [''],
          fixedPrice: ['']
        }),
        water: this.fb.group({
          type: ['คิดตามปลั๊ว', Validators.required],
          pricePerUnit: [''],
          fixedPrice: ['']
        })
      }),
      location: this.fb.group({
        latitude: [this.defaultLocation.lat, Validators.required],
        longitude: [this.defaultLocation.lng, Validators.required],
        address: ['']
      }),
      images: this.fb.array([]),
      amenities: this.fb.array(
        this.amenities.map(amenity => this.fb.control(amenity.checked))
      ),
      contactInfo: this.fb.group({
        facebook: [''],
        lineId: [''],
        phone1: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
        phone2: ['', Validators.pattern('^[0-9]{10}$')]
      })
    });
  }

  createRoomType() {
    return this.fb.group({
      type: ['', Validators.required],
      pricePerMonth: ['', Validators.required],
      capacity: ['', Validators.required]
    });
  }

  get roomTypes() {
    return this.dormForm.get('roomTypes') as FormArray;
  }

  get utilities() {
    return this.dormForm.get('utilities') as FormGroup;
  }

  get electricity() {
    return this.utilities.get('electricity') as FormGroup;
  }

  get water() {
    return this.utilities.get('water') as FormGroup;
  }

  addRoomType() {
    this.roomTypes.push(this.createRoomType());
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      // Update the max reached step
      if (this.currentStep > this.maxReachedStep) {
        this.maxReachedStep = this.currentStep;
      }
      
      // If going to step 2, initialize the preview map after a short delay
      if (this.currentStep === 2) {
        setTimeout(() => {
          this.initPreviewMap();
        }, 200);
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number) {
    // Only allow navigation to steps that have been reached before
    if (step <= this.maxReachedStep && step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
      
      // If going to step 2, initialize the preview map after a short delay
      // to ensure the DOM is ready
      if (step === 2) {
        setTimeout(() => {
          this.initPreviewMap();
        }, 200);
      }
    }
  }

  onSubmit() {
    if (this.dormForm.valid) {
      console.log(this.dormForm.value);
      // Call service to save data
    }
  }

  get imagesArray() {
    return this.dormForm.get('images') as FormArray;
  }

  onFileSelect(event: any) {
    if (event.target.files.length > 0) {
      const files = event.target.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.selectedImages.push(file);
        
        // Create a preview URL
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrls.push(e.target.result);
          
          // Add to form array
          const imageControl = this.fb.group({
            file: [file],
            preview: [e.target.result]
          });
          this.imagesArray.push(imageControl);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeImage(index: number) {
    this.imagePreviewUrls.splice(index, 1);
    this.selectedImages.splice(index, 1);
    this.imagesArray.removeAt(index);
  }

  toggleAmenity(index: number) {
    const amenitiesArray = this.dormForm.get('amenities') as FormArray;
    const currentValue = amenitiesArray.at(index).value;
    amenitiesArray.at(index).setValue(!currentValue);
    this.amenities[index].checked = !currentValue;
  }

  initLocationMap() {
    const mapElement = document.getElementById('location-map');
    if (!mapElement) return;
    
    // Get current location from form or use default
    const location = this.dormForm.get('location');
    const lat = location?.get('latitude')?.value || this.defaultLocation.lat;
    const lng = location?.get('longitude')?.value || this.defaultLocation.lng;
    
    // Use MapService to initialize the map
    this.mapService.initializeMap('location-map', lat, lng);
    
    // Add click event to map
    document.getElementById('location-map')?.addEventListener('click', (e) => {
      // Get clicked coordinates and update form
      const mapElement = document.getElementById('location-map');
      if (!mapElement) return;
      
      // Get map bounds
      const rect = mapElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Convert pixel coordinates to geo coordinates
      const lngLat = this.map?.unproject([x, y]);
      if (lngLat) {
        this.dormForm.patchValue({
          location: {
            latitude: lngLat.lat,
            longitude: lngLat.lng,
            address: location?.get('address')?.value || ''
          }
        });
      }
    });
  }
  
  initPreviewMap() {
    const mapElement = document.getElementById('preview-map');
    if (!mapElement) return;
    
    // Get current location from form or use default
    const location = this.dormForm.get('location');
    const lat = location?.get('latitude')?.value || this.defaultLocation.lat;
    const lng = location?.get('longitude')?.value || this.defaultLocation.lng;
    
    // Use MapService to initialize the preview map
    this.mapService.initializeMap('preview-map', lat, lng);
  }

  zoomIn(): void {
    if (this.map) {
      const currentZoom = this.map.getZoom();
      this.map.setZoom(currentZoom + 1);
    }
  }

  zoomOut(): void {
    if (this.map) {
      const currentZoom = this.map.getZoom();
      this.map.setZoom(Math.max(currentZoom - 1, 1));
    }
  }
}
