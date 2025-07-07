import { Component, AfterViewInit, Renderer2, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from "../navbar/navbar.component";
import { DOCUMENT } from '@angular/common';
import { MapService } from '../../services/map.service';

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
  maxReachedStep = 1;
  
  defaultLocation = { lat: 16.2467, lng: 103.2521 }; // Mahasarakham University
  
  selectedImages: File[] = [];
  imagePreviewUrls: string[] = [];
  
  amenities: Amenity[] = [
    { id: 'wifi', name: 'WiFi', checked: false },
    { id: 'aircon', name: 'แอร์', checked: false },
    { id: 'fan', name: 'พัดลม', checked: false },
    { id: 'tv', name: 'TV', checked: false },
    { id: 'fridge', name: 'ตู้เย็น', checked: false },
    { id: 'wardrobe', name: 'ตู้เสื้อผ้า', checked: false },
    { id: 'waterHeater', name: 'เครื่องทำน้ำอุ่น', checked: false },
    { id: 'washingMachine', name: 'เครื่องซักผ้า', checked: false },
    { id: 'cctv', name: 'กล้องวงจรปิด', checked: false },
    { id: 'keyCard', name: 'คีย์การ์ด', checked: false },
    { id: 'elevator', name: 'ลิฟต์', checked: false },
    { id: 'security', name: 'รปภ.', checked: false },
    { id: 'bed', name: 'เตียงนอน', checked: false },
    { id: 'kitchen', name: 'ห้องครัว', checked: false },
    { id: 'microwave', name: 'ไมโครเวฟ', checked: false },
    { id: 'fiber', name: 'อินเทอร์เน็ตไฟเบอร์', checked: false },
    { id: 'parking', name: 'ที่จอดรถ', checked: false },
    { id: 'studio', name: 'สตูดิโอ', checked: false },
    { id: 'waterDispenser', name: 'ตู้น้ำดื่มหยอดเหรียญ', checked: false },
    { id: 'multipurpose', name: 'ห้องอเนกประสงค์', checked: false },
    { id: 'desk', name: 'โต๊ะทำงาน', checked: false },
    { id: 'lobby', name: 'Lobby', checked: false }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private mapService: MapService
  ) {
    this.initForm();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initLocationMap();
    }, 300);
  }

  ngOnDestroy() {
    this.mapService.destroyMap();
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

  get imagesArray() {
    return this.dormForm.get('images') as FormArray;
  }

  addRoomType() {
    this.roomTypes.push(this.createRoomType());
  }

  removeRoomType(index: number) {
    if (this.roomTypes.length > 1) {
      this.roomTypes.removeAt(index);
    }
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      if (this.currentStep > this.maxReachedStep) {
        this.maxReachedStep = this.currentStep;
      }
      
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
    if (step <= this.maxReachedStep && step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
      
      if (step === 2) {
        setTimeout(() => {
          this.initPreviewMap();
        }, 200);
      }
    }
  }

  onSubmit() {
    if (this.dormForm.valid) {
      // Process form data
      const formData = this.dormForm.value;
      console.log('Form submitted:', formData);
      
      // Go to success step
      this.currentStep = 4;
      this.maxReachedStep = 4;
      
      // Here you would typically call a service to save the data
      // this.dormService.createDorm(formData).subscribe(...)
    } else {
      console.log('Form is invalid');
      this.markFormGroupTouched(this.dormForm);
    }
  }

  goToMainPage() {
    this.router.navigate(['/main']);
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  onFileSelect(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files) as File[];
      
      files.forEach(file => {
        this.selectedImages.push(file);
        
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrls.push(e.target.result);
          
          const imageControl = this.fb.group({
            file: [file],
            preview: [e.target.result]
          });
          this.imagesArray.push(imageControl);
        };
        reader.readAsDataURL(file);
      });
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
    
    const location = this.dormForm.get('location');
    const lat = location?.get('latitude')?.value || this.defaultLocation.lat;
    const lng = location?.get('longitude')?.value || this.defaultLocation.lng;
    
    this.mapService.initializeMap('location-map', lat, lng);
    
    // Add click event listener for map
    mapElement.addEventListener('click', (e) => {
      // This is a simplified implementation
      // You would need to implement proper coordinate conversion
      const rect = mapElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // For now, just log the click - you'd implement proper coordinate mapping
      console.log('Map clicked at pixel coordinates:', { x, y });
    });
  }
  
  initPreviewMap() {
    const mapElement = document.getElementById('preview-map');
    if (!mapElement) return;
    
    const location = this.dormForm.get('location');
    const lat = location?.get('latitude')?.value || this.defaultLocation.lat;
    const lng = location?.get('longitude')?.value || this.defaultLocation.lng;
    
    this.mapService.initializeMap('preview-map', lat, lng);
  }

  zoomIn(): void {
    this.mapService.zoomIn();
  }

  zoomOut(): void {
    this.mapService.zoomOut();
  }
}