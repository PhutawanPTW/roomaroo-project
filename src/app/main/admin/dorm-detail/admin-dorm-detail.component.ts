import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminProfile, AdminService } from '../../../services/admin.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { trigger, transition, animate, keyframes, style } from '@angular/animations';

interface Amenity {
  id: string;
  name: string;
  location_type: string;
}

@Component({
  selector: 'app-admin-dorm-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dorm-detail.component.html',
  styleUrl: './admin-dorm-detail.component.css',
  animations: [
    trigger('slideCenter', [
      transition(':increment', [
        animate('420ms cubic-bezier(0.22, 0.61, 0.36, 1)', keyframes([
          style({ transform: 'translate(calc(-40% - 0px), -50%)', opacity: 0.8, offset: 0 }),
          style({ transform: 'translate(calc(-48% - 0px), -50%)', opacity: 0.95, offset: 0.6 }),
          style({ transform: 'translate(-50%, -50%)', opacity: 1, offset: 1 })
        ]))
      ]),
      transition(':decrement', [
        animate('420ms cubic-bezier(0.22, 0.61, 0.36, 1)', keyframes([
          style({ transform: 'translate(calc(-60% - 0px), -50%)', opacity: 0.8, offset: 0 }),
          style({ transform: 'translate(calc(-52% - 0px), -50%)', opacity: 0.95, offset: 0.6 }),
          style({ transform: 'translate(-50%, -50%)', opacity: 1, offset: 1 })
        ]))
      ])
    ])
  ]
})
export class AdminDormDetailComponent implements OnInit {
  dormId: string = '';
  adminProfile: AdminProfile | null = null;
  profileDropdownOpen = false;
  showImageModalFlag = false;
  selectedImageUrl = '';
  selectedImageTitle = '';
  isLoading = false;
  errorMessage: string | null = null;
  isProcessing = false;

  // Form data
  dormForm!: FormGroup;
  roomTypes!: FormArray;
  amenities!: FormArray;
  electricity!: FormGroup;
  water!: FormGroup;
  amenitiesOther!: FormArray;
  amenitiesList: Amenity[] = [];

  // Image carousel
  imagePreviewUrls: string[] = [];
  currentImageIndex = 0;
  imageModalOpen = false;
  imageModalIndex = 0;

  // Amenity management
  amenityIndexMap: { [key: string]: number } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.dormId = params['id'];
      if (this.dormId) {
        this.loadDormitoryDetail();
      }
    });
    
    this.loadAdminProfile();
  }

  private initializeForm(): void {
    this.dormForm = this.fb.group({
      generalInfo: this.fb.group({
        name: [''],
        zone_id: [''],
        address: [''],
        description: ['']
      }),
      roomTypes: this.fb.array([]),
      utilities: this.fb.group({
        electricity: this.fb.group({
          type: [''],
          rate: ['']
        }),
        water: this.fb.group({
          type: [''],
          rate: ['']
        })
      }),
      amenities: this.fb.array([]),
      amenitiesOther: this.fb.array([])
    });

    this.roomTypes = this.dormForm.get('roomTypes') as FormArray;
    this.amenities = this.dormForm.get('amenities') as FormArray;
    this.electricity = this.dormForm.get('utilities.electricity') as FormGroup;
    this.water = this.dormForm.get('utilities.water') as FormGroup;
    this.amenitiesOther = this.dormForm.get('amenitiesOther') as FormArray;
  }

  private loadAdminProfile(): void {
    // TODO: Implement when AdminService has getAdminProfile method
    console.log('Loading admin profile...');
    // this.adminService.getAdminProfile().subscribe({
    //   next: (profile) => {
    //     this.adminProfile = profile;
    //   },
    //   error: (error) => {
    //     console.error('Error loading admin profile:', error);
    //   }
    // });
  }

  private loadDormitoryDetail(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // TODO: Replace with real API call when backend is ready
    console.log('Loading dormitory detail for ID:', this.dormId);
    
    // Mock data for now - will be replaced with real API
    setTimeout(() => {
      this.isLoading = false;
      console.log('Dormitory detail loaded (mock data)');
    }, 1000);
  }

  // Image carousel methods
  onPrevImage(): void {
    if (!this.imagePreviewUrls?.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.imagePreviewUrls.length) % this.imagePreviewUrls.length;
  }

  onNextImage(): void {
    if (!this.imagePreviewUrls?.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.imagePreviewUrls.length;
  }

  // Image modal methods
  openImageModal(index: number): void {
    this.imageModalIndex = index;
    this.imageModalOpen = true;
  }

  closeImageModal(): void {
    this.imageModalOpen = false;
  }

  prevModalImage(): void {
    if (this.imagePreviewUrls.length > 0) {
      this.imageModalIndex = (this.imageModalIndex - 1 + this.imagePreviewUrls.length) % this.imagePreviewUrls.length;
    }
  }

  nextModalImage(): void {
    if (this.imagePreviewUrls.length > 0) {
      this.imageModalIndex = (this.imageModalIndex + 1) % this.imagePreviewUrls.length;
    }
  }

  // Navigation methods
  editDormitory(): void {
    if (!this.dormId) return;
    this.router.navigate(['/admin/dorm-edit', this.dormId]);
  }

  deleteDormitory(): void {
    if (!this.dormId) return;
    if (confirm('คุณแน่ใจหรือไม่ว่าจะลบหอพักนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      this.isProcessing = true;
      const firebaseToken = localStorage.getItem('firebaseToken');
      if (!firebaseToken) {
        alert('ไม่พบโทเค็นสำหรับยืนยันตัวตน');
        this.isProcessing = false;
        return;
      }

      const headers = new HttpHeaders()
        .set('Authorization', `Bearer ${firebaseToken}`)
        .set('Content-Type', 'application/json');

      this.http.delete(`${environment.backendApiUrl}/admin/dormitories/${this.dormId}`, { headers }).subscribe({
        next: () => {
          alert('ลบหอพักเรียบร้อยแล้ว');
          this.router.navigate(['/admin']);
        },
        error: (error) => {
          console.error('Error deleting dormitory:', error);
          alert('เกิดข้อผิดพลาดในการลบหอพัก');
          this.isProcessing = false;
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }

  // Utility methods for form access
  get roomTypesFormArray(): FormArray {
    return this.dormForm.get('roomTypes') as FormArray;
  }

  get utilitiesFormGroup(): FormGroup {
    return this.dormForm.get('utilities') as FormGroup;
  }

  get electricityFormGroup(): FormGroup {
    return this.dormForm.get('utilities.electricity') as FormGroup;
  }

  get waterFormGroup(): FormGroup {
    return this.dormForm.get('utilities.water') as FormGroup;
  }

  get amenitiesFormArray(): FormArray {
    return this.dormForm.get('amenities') as FormArray;
  }

  get amenitiesOtherFormArray(): FormArray {
    return this.dormForm.get('amenitiesOther') as FormArray;
  }

  // Amenity management methods
  getAmenityIndex(amenityId: string): number {
    return this.amenityIndexMap[amenityId] || -1;
  }

  isAmenityChecked(id: string): boolean {
    const idx = this.getAmenityIndex(id);
    const arr = this.dormForm.get('amenities') as FormArray;
    return idx > -1 ? !!arr.at(idx).value : false;
  }
}