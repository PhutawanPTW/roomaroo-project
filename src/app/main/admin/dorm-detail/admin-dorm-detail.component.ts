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
  currentImageIndex = 0;
  
  // Stepper
  currentStep = 2;
  
  // Form
  dormForm!: FormGroup;
  
  // Images
  imagePreviewUrls: string[] = [];
  imageModalOpen = false;
  imageModalIndex = 0;
  
  // Amenities
  private readonly AMENITIES: Amenity[] = [
    // ภายในห้อง (Internal)
    { id: 'aircon', name: 'แอร์', location_type: 'ภายใน' },
    { id: 'fan', name: 'พัดลม', location_type: 'ภายใน' },
    { id: 'tv', name: 'TV', location_type: 'ภายใน' },
    { id: 'fridge', name: 'ตู้เย็น', location_type: 'ภายใน' },
    { id: 'bed', name: 'เตียงนอน', location_type: 'ภายใน' },
    { id: 'wifi', name: 'WIFI', location_type: 'ภายใน' },
    { id: 'wardrobe', name: 'ตู้เสื้อผ้า', location_type: 'ภายใน' },
    { id: 'desk', name: 'โต๊ะทำงาน', location_type: 'ภายใน' },
    { id: 'microwave', name: 'ไมโครเวฟ', location_type: 'ภายใน' },
    { id: 'waterHeater', name: 'เครื่องทำน้ำอุ่น', location_type: 'ภายใน' },
    { id: 'sink', name: 'ซิงค์ล้างจาน', location_type: 'ภายใน' },
    { id: 'dressingTable', name: 'โต๊ะเครื่องแป้ง', location_type: 'ภายใน' },

    // ภายนอก (External)
    { id: 'cctv', name: 'กล้องวงจรปิด', location_type: 'ภายนอก' },
    { id: 'security', name: 'รปภ.', location_type: 'ภายนอก' },
    { id: 'elevator', name: 'ลิฟต์', location_type: 'ภายนอก' },
    { id: 'parking', name: 'ที่จอดรถ', location_type: 'ภายนอก' },
    { id: 'fitness', name: 'ฟิตเนส', location_type: 'ภายนอก' },
    { id: 'lobby', name: 'Lobby', location_type: 'ภายนอก' },
    { id: 'waterDispenser', name: 'ตู้น้ำหยอดเหรียญ', location_type: 'ภายนอก' },
    { id: 'swimmingPool', name: 'สระว่ายน้ำ', location_type: 'ภายนอก' },
    { id: 'parcelShelf', name: 'ที่วางพัสดุ', location_type: 'ภายนอก' },
    { id: 'petsAllowed', name: 'อนุญาตให้เลี้ยงสัตว์', location_type: 'ภายนอก' },
    { id: 'keyCard', name: 'คีย์การ์ด', location_type: 'ภายนอก' },
    { id: 'washingMachine', name: 'เครื่องซักผ้า', location_type: 'ภายนอก' },
    { id: 'other', name: 'อื่นๆ', location_type: '' }
  ];

  private amenityIndexMap = new Map(this.AMENITIES.map((a, i) => [a.id, i]));

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private http: HttpClient,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadAdminProfile();
    this.initForm();
    this.dormId = this.route.snapshot.paramMap.get('id') || '';
    if (this.dormId) {
      this.loadDormitoryDetail();
    } else {
      this.errorMessage = 'ไม่พบข้อมูลหอพัก';
    }
  }

  initForm(): void {
    this.dormForm = this.fb.group({
      generalInfo: this.fb.group({
        name: [''],
        address: [''],
        description: [''],
        zone_id: ['']
      }),
      utilities: this.fb.group({
        electricity: this.fb.group({
          electricity_type: [''],
          electricity_rate: ['']
        }),
        water: this.fb.group({
          water_type: [''],
          water_rate: ['']
        })
      }),
      roomTypes: this.fb.array([]),
      amenities: this.fb.array([]),
      amenitiesOther: this.fb.array([]),
      location: this.fb.group({
        latitude: [''],
        longitude: ['']
      })
    });
  }

  loadAdminProfile(): void {
    const adminProfileStr = localStorage.getItem('adminProfile');
    if (adminProfileStr) {
      try {
        this.adminProfile = JSON.parse(adminProfileStr);
      } catch (error) {
        console.error('Error parsing admin profile:', error);
        this.redirectToLogin();
      }
    } else {
      this.redirectToLogin();
    }
  }

  redirectToLogin(): void {
    this.router.navigate(['/admin/login']);
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/admin-avatar.png';
  }

  toggleProfileDropdown(): void {
    this.profileDropdownOpen = !this.profileDropdownOpen;
  }

  closeProfileDropdown(): void {
    this.profileDropdownOpen = false;
  }

  onLogout(): void {
    this.closeProfileDropdown();
    localStorage.removeItem('adminProfile');
    this.router.navigate(['/admin/login']);
  }

  showImageModal(imageUrl: string, title: string): void {
    this.selectedImageUrl = imageUrl;
    this.selectedImageTitle = title;
    this.showImageModalFlag = true;
  }

  // closeImageModal(): void {
  //   this.showImageModalFlag = false;
  //   this.selectedImageUrl = '';
  //   this.selectedImageTitle = '';
  // }

  /**
   * โหลดรายละเอียดหอพักจาก API
   */
  loadDormitoryDetail(): void {
    this.isLoading = true;
    this.errorMessage = null;

      // Add room types
      const roomTypesArray = this.dormForm.get('roomTypes') as FormArray;
      roomTypesArray.clear();
      roomTypesArray.push(this.fb.group({
        type: 'ห้องแอร์ เตียงเดี่ยว',
        pricePerMonth: 3000,
        pricePerDay: null,
        pricePerTerm: null,
        pricePerSummer: null
      }));
      roomTypesArray.push(this.fb.group({
        type: 'ห้องพัดลม เตียงคู่',
        pricePerMonth: 2500,
        pricePerDay: null,
        pricePerTerm: null,
        pricePerSummer: null
      }));

      // Add amenities
      const amenitiesArray = this.dormForm.get('amenities') as FormArray;
      amenitiesArray.clear();
      this.AMENITIES.forEach(() => {
        amenitiesArray.push(this.fb.control(false));
      });

      // Set some amenities as checked
      const checkedAmenities = ['aircon', 'fan', 'tv', 'fridge', 'bed', 'wifi', 'wardrobe', 'desk', 'waterHeater', 'dressingTable', 'cctv', 'security', 'parking', 'lobby', 'waterDispenser', 'swimmingPool', 'parcelShelf', 'washingMachine'];
      checkedAmenities.forEach(amenityId => {
        const index = this.getAmenityIndex(amenityId);
        if (index >= 0) {
          amenitiesArray.at(index).setValue(true);
        }
      });

      // Set images
      this.imagePreviewUrls = [
        'assets/images/photo.png',
        'assets/images/photo.png',
        'assets/images/photo.png'
      ];

      this.isLoading = false;
    }, 1000);
  }

  /**
   * อนุมัติหอพัก
   */
  approveDormitory(): void {
    if (confirm('คุณแน่ใจหรือไม่ที่จะอนุมัติหอพักนี้?')) {
      this.isProcessing = true;
      
      // เรียก API เพื่ออนุมัติหอพัก
      this.updateDormitoryStatus('อนุมัติ').subscribe({
        next: (response) => {
          alert('อนุมัติหอพักเรียบร้อยแล้ว');
          this.router.navigate(['/admin']);
        },
        error: (error) => {
          console.error('Error approving dormitory:', error);
          alert('เกิดข้อผิดพลาดในการอนุมัติหอพัก');
          this.isProcessing = false;
        }
      });
    }
  }

  /**
   * ไม่อนุมัติหอพัก
   */
  rejectDormitory(): void {
    const reason = prompt('กรุณาระบุเหตุผลในการไม่อนุมัติ:');
    if (reason && reason.trim()) {
      this.isProcessing = true;
      
      // เรียก API เพื่อไม่อนุมัติหอพัก
      this.updateDormitoryStatus('ไม่อนุมัติ', reason).subscribe({
        next: (response) => {
          alert('ไม่อนุมัติหอพักเรียบร้อยแล้ว');
          this.router.navigate(['/admin']);
        },
        error: (error) => {
          console.error('Error rejecting dormitory:', error);
          alert('เกิดข้อผิดพลาดในการไม่อนุมัติหอพัก');
          this.isProcessing = false;
        }
      });
    }
  }

  /**
   * อัพเดทสถานะการอนุมัติหอพัก
   */
  private updateDormitoryStatus(status: string, rejectionReason?: string): any {
    const firebaseToken = localStorage.getItem('firebaseToken');
    if (!firebaseToken) {
      throw new Error('Firebase token not found');
    }

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${firebaseToken}`)
      .set('Content-Type', 'application/json');

    const body: any = { status };
    if (rejectionReason) {
      body.rejectionReason = rejectionReason;
    }

    return this.http.put(
      `${environment.backendApiUrl}/admin/dormitories/${this.dormId}/approval`,
      body,
      { headers }
    );
  }

  // Getters
  get roomTypes(): FormArray {
    return this.dormForm.get('roomTypes') as FormArray;
  }
  get utilities(): FormGroup {
    return this.dormForm.get('utilities') as FormGroup;
  }
  get electricity(): FormGroup {
    return this.utilities.get('electricity') as FormGroup;
  }
  get water(): FormGroup {
    return this.utilities.get('water') as FormGroup;
  }
  get amenitiesOther(): FormArray {
    return this.dormForm.get('amenitiesOther') as FormArray;
  }

  // Amenities helpers
  get amenitiesList(): Amenity[] {
    return this.AMENITIES;
  }
  getAmenityIndex(amenityId: string): number {
    return this.amenityIndexMap.get(amenityId) ?? -1;
  }
  isAmenityChecked(id: string): boolean {
    const idx = this.getAmenityIndex(id);
    const arr = this.dormForm.get('amenities') as FormArray;
    return idx > -1 ? !!arr.at(idx).value : false;
  }

  // Price helpers
  private toNumber(val: any): number | null {
    if (val === null || val === undefined) return null;
    const s = String(val).replace(/[,\s]/g, '');
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  private collectNumbers(keys: string[]): number[] {
    return (this.roomTypes.controls as FormGroup[])
      .map((g) => keys.map((k) => this.toNumber(g.get(k)?.value)))
      .flat()
      .filter((n): n is number => n !== null && n >= 0);
  }
  private thBaht(n: number): string {
    return new Intl.NumberFormat('th-TH').format(n);
  }

  get priceRangeText(): string {
    const monthly = this.collectNumbers(['pricePerMonth']);
    const pick = monthly.length
      ? monthly
      : this.collectNumbers(['pricePerDay']);
    if (!pick.length) return '-';
    const unit = monthly.length ? 'บาท/เดือน' : 'บาท/วัน';
    const min = Math.min(...pick);
    const max = Math.max(...pick);
    if (pick.length === 1 || min === max) return `${this.thBaht(min)} ${unit}`;
    return `${this.thBaht(min)} - ${this.thBaht(max)} ${unit}`;
  }

  get zoneName(): string {
    const id = Number(this.dormForm.get('generalInfo.zone_id')?.value);
    return id === 1 ? 'หน้ามอ' : '';
  }

  // Display helpers for room table
  getRoomDisplayName(rt: any): string {
    const nameRaw = rt?.type === 'other' ? (rt?.customType || '').trim() : rt?.type || '-';
    return nameRaw || '-';
  }

  formatNumberOrDash(value: any): string {
    if (value === null || value === undefined || value === '') return '-';
    const normalized = String(value).replace(/[,\s]/g, '');
    const num = Number(normalized);
    return Number.isFinite(num) ? num.toLocaleString('th-TH') : '-';
  }

  // Image carousel
  onPrevImage(): void {
    if (!this.imagePreviewUrls?.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.imagePreviewUrls.length) % this.imagePreviewUrls.length;
  }

  onNextImage(): void {
    if (!this.imagePreviewUrls?.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.imagePreviewUrls.length;
  }

  // Image modal
  openImageModal(index: number) {
    this.imageModalIndex = index;
    this.imageModalOpen = true;
  }

  closeImageModal() {
    this.imageModalOpen = false;
  }

  prevModalImage() {
    if (this.imagePreviewUrls.length > 0) {
      this.imageModalIndex = (this.imageModalIndex - 1 + this.imagePreviewUrls.length) % this.imagePreviewUrls.length;
    }
  }

  nextModalImage() {
    if (this.imagePreviewUrls.length > 0) {
      this.imageModalIndex = (this.imageModalIndex + 1) % this.imagePreviewUrls.length;
    }
  }

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
}
