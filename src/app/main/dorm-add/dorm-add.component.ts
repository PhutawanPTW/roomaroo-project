import { Component, AfterViewInit, Renderer2, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NavbarComponent } from "../navbar/navbar.component";
import { DOCUMENT } from '@angular/common';

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
  map: any;
  previewMap: any;
  marker: any;
  previewMarker: any;
  defaultLocation = { lat: 13.7563, lng: 100.5018 }; // Bangkok default
  private googleMapsLoaded = false;
  private leafletLoaded = false;
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
    @Inject(DOCUMENT) private document: Document
  ) {
    this.initForm();
  }

  ngAfterViewInit() {
    this.loadLeafletScript();
  }

  ngOnDestroy() {
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = null;
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

  loadLeafletScript() {
    // Check if Leaflet CSS is loaded
    if (!document.getElementById('leaflet-css')) {
      const link = this.renderer.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      link.id = 'leaflet-css';
      this.renderer.appendChild(document.head, link);
    }
    // Check if Leaflet JS is loaded
    if (typeof L !== 'undefined') {
      this.leafletLoaded = true;
      this.initLeafletMap();
      this.initPreviewMap();
      return;
    }
    const script = this.renderer.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.defer = true;
    script.async = true;
    script.onload = () => {
      this.leafletLoaded = true;
      this.initLeafletMap();
      this.initPreviewMap();
    };
    this.renderer.appendChild(document.body, script);
  }

  initLeafletMap() {
    setTimeout(() => {
      const mapElement = document.getElementById('location-map');
      if (!mapElement || !this.leafletLoaded) return;
      // Get current location from form or use default
      const location = this.dormForm.get('location');
      const lat = location?.get('latitude')?.value || this.defaultLocation.lat;
      const lng = location?.get('longitude')?.value || this.defaultLocation.lng;
      if (this.leafletMap) {
        this.leafletMap.remove();
      }
      this.leafletMap = L.map(mapElement).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.leafletMap);
      this.leafletMarker = L.marker([lat, lng], { draggable: true }).addTo(this.leafletMap);
      // Drag event
      this.leafletMarker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        this.dormForm.patchValue({
          location: {
            latitude: pos.lat,
            longitude: pos.lng,
            address: location?.get('address')?.value || ''
          }
        });
      });
      // Click event
      this.leafletMap.on('click', (e: any) => {
        this.leafletMarker.setLatLng(e.latlng);
        this.dormForm.patchValue({
          location: {
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
            address: location?.get('address')?.value || ''
          }
        });
      });
      this.leafletMap.invalidateSize();
    }, 500);
  }
  
  initPreviewMap() {
    if (!this.leafletLoaded) return;
    
    const mapElement = document.getElementById('preview-map');
    if (!mapElement) return;
    
    // Get current location from form or use default
    const location = this.dormForm.get('location');
    const lat = location?.get('latitude')?.value || this.defaultLocation.lat;
    const lng = location?.get('longitude')?.value || this.defaultLocation.lng;
    
    if (this.previewMap) {
      this.previewMap.remove();
    }
    
    this.previewMap = L.map(mapElement).setView([lat, lng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.previewMap);
    
    this.previewMarker = L.marker([lat, lng], {
      draggable: false
    }).addTo(this.previewMap);
    
    // Update map when step changes to ensure it renders properly
    this.previewMap.invalidateSize();
  }
}
