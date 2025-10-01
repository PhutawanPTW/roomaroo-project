  import {
  Component,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ValidationErrors,
  AbstractControl,
  ValidatorFn,
} from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Router, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { MapService } from '../../services/map.service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { OwnerDormitoryService } from '../../services/owner-dormitory.service';
import { DormitoryService, RoomType } from '../../services/dormitory.service';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { trigger, transition, animate, keyframes, style } from '@angular/animations';

interface Amenity {
  id: string;
  name: string;
  location_type: string;
}
interface ZoneOption {
  zone_id: number;
  zone_name: string;
}
@Component({
  selector: 'app-dorm-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent, DragDropModule],
  templateUrl: './dorm-edit.component.html',
  styleUrls: ['./dorm-edit.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideCenter', [
      // next -> slide from right to center
      transition(':increment', [
        animate('420ms cubic-bezier(0.22, 0.61, 0.36, 1)', keyframes([
          style({ transform: 'translate(calc(-40% - 0px), -50%)', opacity: 0.8, offset: 0 }),
          style({ transform: 'translate(calc(-48% - 0px), -50%)', opacity: 0.95, offset: 0.6 }),
          style({ transform: 'translate(-50%, -50%)', opacity: 1, offset: 1 })
        ]))
      ]),
      // prev -> slide from left to center
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
export class DormEditComponent implements AfterViewInit, OnDestroy {
  dormForm!: FormGroup;

  // stepper
  currentStep = 1;
  totalSteps = 3;
  maxReachedStep = 1;

  // submit
  imageError = false;
  isSubmitting = false;
  showErrorModal = false;
  submitErrorMessage: string | null = null;

  // tailwind heights
  mapHeightClass = 'h-80';
  defaultLocation = { lat: 16.2467, lng: 103.2521 };

  // images
  selectedImages: File[] = [];
  imagePreviewUrls: string[] = [];
  // edit mode
  isEditMode = false;
  editingDormId: number | null = null;
  
  // drag & drop
  isDragOver = false;
  draggedIndex: number | null = null;

  sliderImages: Array<{ src: string; alt: string }> = [];

  private readonly mapRetryDelayMs = 1000;
  private readonly maxMapInitAttempts = 20;
  private locationMapInitAttempts = 0;
  private previewMapInitAttempts = 0;
  private locationResizeObserver?: ResizeObserver;
  private previewResizeObserver?: ResizeObserver;

  // carousel state (single center image with faded sides)
  currentImageIndex = 0;

  get hasImages(): boolean {
    return Array.isArray(this.imagePreviewUrls) && this.imagePreviewUrls.length > 0;
  }
  get prevImageIndex(): number {
    if (!this.hasImages) return 0;
    return (this.currentImageIndex - 1 + this.imagePreviewUrls.length) % this.imagePreviewUrls.length;
  }
  get nextImageIndex(): number {
    if (!this.hasImages) return 0;
    return (this.currentImageIndex + 1) % this.imagePreviewUrls.length;
  }
  onPrevImage(): void {
    if (!this.hasImages) return;
    this.currentImageIndex = this.prevImageIndex;
    this.cdr.markForCheck();
  }
  onNextImage(): void {
    if (!this.hasImages) return;
    this.currentImageIndex = this.nextImageIndex;
    this.cdr.markForCheck();
  }

  // อ้างอิง viewport ของสไลด์แบบ strip เพื่อสั่งเลื่อนด้วยปุ่ม
  @ViewChild('stripViewport') stripViewportRef?: ElementRef<HTMLDivElement>;

  // โมดัลรูปภาพเต็มจอ
  imageModalOpen = false;
  imageModalIndex = 0;

  // ===== แหล่งความจริง: สิ่งอำนวยความสะดวก (แยกภายใน/ภายนอก) =====
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
    {
      id: 'petsAllowed',
      name: 'อนุญาตให้เลี้ยงสัตว์',
      location_type: 'ภายนอก',
    },
    { id: 'keyCard', name: 'คีย์การ์ด', location_type: 'ภายนอก' },
    { id: 'washingMachine', name: 'เครื่องซักผ้า', location_type: 'ภายนอก' },
    { id: 'other', name: 'อื่นๆ', location_type: '' }, // ให้เลือกเอง
  ];

  private amenityIndexMap = new Map(this.AMENITIES.map((a, i) => [a.id, i]));

  zones: ZoneOption[] = [];
  zonesLoading = false;
  zonesError: string | null = null;

  // ต้องมี "รายเดือน" หรือ "รายวัน" อย่างน้อย 1 ช่อง (เฉพาะ 2 ช่องนี้เท่านั้น)
  private readonly requireMonthOrDay: ValidatorFn = (
    group: AbstractControl
  ): ValidationErrors | null => {
    if (!(group instanceof FormGroup)) return null;
    const m = (group.get('pricePerMonth')?.value ?? '').toString().trim();
    const d = (group.get('pricePerDay')?.value ?? '').toString().trim();
    const result = m !== '' || d !== '' ? null : { needMonthOrDay: true };
    return result;
  };

  // Custom popup properties
  showPopup = false;
  popupMessage = '';
  popupType: 'error' | 'warning' | 'success' = 'error';
  private popupTargetSelector: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(DOCUMENT) private document: Document,
    private mapService: MapService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private ownerDormitoryService: OwnerDormitoryService,
    private dormitoryService: DormitoryService,
    private authService: AuthService
  ) {
    this.initForm();
    this.loadZones();
    this.initSliderImages();
    this.bootstrapEditModeIfNeeded();
  }

  private bootstrapEditModeIfNeeded(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const idFromQuery = this.route.snapshot.queryParamMap.get('id');
    const raw = idParam || idFromQuery;
    const id = raw ? parseInt(raw, 10) : NaN;
    if (!isNaN(id) && id > 0) {
      this.isEditMode = true;
      this.editingDormId = id;
      this.loadDormitoryForEdit(id);
    }
  }

  private async loadDormitoryForEdit(dormId: number): Promise<void> {
    try {
      // โหลดข้อมูลหลัก + room types + images พร้อมกัน (ใช้เส้น edit สำหรับ room-types/images)
      const detail$ = this.dormitoryService.getDormitoryById(dormId).toPromise();
      const roomTypes$ = this.dormitoryService.getRoomTypes(dormId).toPromise();
      const images$ = this.dormitoryService.getImages(dormId).toPromise();
      const [detail, roomTypes, images] = await Promise.all([detail$, roomTypes$, images$]);

      if (detail) {
        // General
        this.dormForm.get('generalInfo.name')?.setValue(detail.dorm_name || '');
        this.dormForm.get('generalInfo.zone_id')?.setValue((detail as any).zone_id || '');
        this.dormForm.get('generalInfo.address')?.setValue(detail.address || '');
        this.dormForm.get('generalInfo.description')?.setValue(detail.dorm_description || detail.description || '');

        // Utilities (normalize using *_type and *_rate)
        const eType = detail.electricity_type || 'ตามมิเตอร์';
        const wType = detail.water_type || 'ตามมิเตอร์';
        this.electricity.get('electricity_type')?.setValue(eType);
        this.electricity.get('electricity_rate')?.setValue(detail.electricity_rate || '');
        this.water.get('water_type')?.setValue(wType);
        this.water.get('water_rate')?.setValue(detail.water_rate || '');

        // Location
        const lat = Number(detail.latitude) || this.defaultLocation.lat;
        const lng = Number(detail.longitude) || this.defaultLocation.lng;
        this.dormForm.get('location.latitude')?.setValue(lat);
        this.dormForm.get('location.longitude')?.setValue(lng);
      }

      // Room types (normalize common response shapes/fields)
      let roomTypeList: any[] = [];
      if (Array.isArray(roomTypes)) {
        roomTypeList = roomTypes as any[];
      } else if (roomTypes && typeof roomTypes === 'object') {
        const rt = (roomTypes as any).room_types || (roomTypes as any).data || (roomTypes as any).items || [];
        roomTypeList = Array.isArray(rt) ? rt : [];
      }

      if (roomTypeList.length) {
        // clear existing
        while (this.roomTypes.length) this.roomTypes.removeAt(0);
        roomTypeList.forEach(rt => {
          const g = this.createRoomType();
          const name = rt.name || rt.room_name || rt.type || '';
          const bedType = rt.bed_type || rt.bedType || '';
          const monthly = rt.monthly_price ?? rt.monthlyPrice ?? null;
          const daily = rt.daily_price ?? rt.dailyPrice ?? null;
          const term = (rt as any).term_price ?? (rt as any).termPrice ?? null;
          const summer = (rt as any).summer_price ?? (rt as any).summerPrice ?? null;

          g.get('type')?.setValue(name);
          g.get('customType')?.setValue('');
          g.get('bed_type')?.setValue(String(bedType));
          g.get('room_type_id')?.setValue(rt.room_type_id || rt.id || (rt as any).roomTypeId || null);
          if (monthly !== null && monthly !== undefined) g.get('pricePerMonth')?.setValue(String(monthly));
          if (daily !== null && daily !== undefined) g.get('pricePerDay')?.setValue(String(daily));
          if (term !== null && term !== undefined) g.get('pricePerTerm')?.setValue(String(term));
          if (summer !== null && summer !== undefined) g.get('pricePerSummer')?.setValue(String(summer));
          this.roomTypes.push(g);
        });
      }

      // Images
      if (Array.isArray(images) && images.length) {
        this.imagePreviewUrls = images.map((img: any) => img.image_url).filter(Boolean);
        // sync form array for previews (no File objects in edit)
        while (this.imagesArray.length) this.imagesArray.removeAt(0);
        this.imagePreviewUrls.forEach(url => {
          this.imagesArray.push(this.fb.group({ file: [null], preview: [url], image_type: [''] }));
        });
        this.updateSliderImages();
      }

      // Amenities: map using names present in detail.amenities
      const amenitiesFromApi = Array.isArray((detail as any)?.amenities) ? (detail as any).amenities : [];
      const amenityNames = new Set<string>(
        amenitiesFromApi.map((a: any) => (a.name || a.amenity_name || '').toString().trim())
      );
      const arr = this.dormForm.get('amenities') as FormArray;
      this.AMENITIES.forEach((a, idx) => {
        const checked = amenityNames.has(a.name);
        arr.at(idx).setValue(checked);
      });

      // stepper: jump to step 2 for quick verify
      this.maxReachedStep = 2;
      this.currentStep = 1;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.initLocationMap();
        this.initPreviewMap();
      }, 300);
    } catch (e) {
      console.error('[DormEdit] Failed to load dormitory for edit:', e);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initLocationMap();
      this.adjustMapHeight();
      this.cdr.markForCheck();
    }, 100);

    this.electricity
      .get('electricity_type')
      ?.valueChanges.subscribe(() => this.adjustMapHeight());
    this.water
      .get('water_type')
      ?.valueChanges.subscribe(() => this.adjustMapHeight());
  }

  // ---------- Strip manual controls (Step 2) ----------
  private getStripCardWidth(): number {
    const viewport = this.stripViewportRef?.nativeElement;
    if (!viewport) return 0;
    const viewportWidth = viewport.clientWidth;
    const gap = 16; // 1rem
    const visibleCards =
      viewportWidth <= 640 ? 1 : viewportWidth <= 1024 ? 2 : 3;
    const totalGap = gap * (visibleCards - 1);
    return Math.max(0, (viewportWidth - totalGap) / visibleCards);
  }
  onStripPrev(): void {
    const viewport = this.stripViewportRef?.nativeElement;
    if (!viewport) return;
    const cardWidth = this.getStripCardWidth() + 16; // รวม gap
    if (viewport.scrollLeft <= 0) viewport.scrollLeft = viewport.scrollWidth; // วน
    viewport.scrollBy({ left: -cardWidth, behavior: 'smooth' });
  }
  onStripNext(): void {
    const viewport = this.stripViewportRef?.nativeElement;
    if (!viewport) return;
    const cardWidth = this.getStripCardWidth() + 16;
    if (
      Math.ceil(viewport.scrollLeft + viewport.clientWidth) >=
      viewport.scrollWidth
    )
      viewport.scrollLeft = 0; // วน
    viewport.scrollBy({ left: cardWidth, behavior: 'smooth' });
  }

  openImageModal(index: number) {
    this.imageModalIndex = index;
    this.imageModalOpen = true;
    this.cdr.markForCheck();
  }
  closeImageModal() {
    this.imageModalOpen = false;
    this.cdr.markForCheck();
  }
  prevModalImage() {
    const len = this.sliderImages.length;
    this.imageModalIndex = (this.imageModalIndex - 1 + len) % len;
    this.cdr.markForCheck();
  }
  nextModalImage() {
    const len = this.sliderImages.length;
    this.imageModalIndex = (this.imageModalIndex + 1) % len;
    this.cdr.markForCheck();
  }

  // ---------- Map ----------
  private adjustMapHeight() {
    const isElecOfficial =
      this.electricity.get('electricity_type')?.value === 'ตามมิเตอร์';
    const isWaterOfficial =
      this.water.get('water_type')?.value === 'ตามมิเตอร์';
    this.mapHeightClass = isElecOfficial || isWaterOfficial ? 'h-100' : 'h-96';
    setTimeout(() => this.mapService.resize(), 0);
  }

  // --------- ฟอร์ม ---------
  initForm() {
    this.dormForm = this.fb.group({
      generalInfo: this.fb.group({
        name: ['', Validators.required],
        zone_id: ['', Validators.required],
        address: ['', Validators.required],
        description: ['', Validators.required],
      }),
      roomTypes: this.fb.array([this.createRoomType()]),
      utilities: this.fb.group({
        electricity: this.fb.group({
          electricity_type: ['คิดตามหน่วย', Validators.required],
          electricity_rate: [''],
        }),
        water: this.fb.group({
          water_type: ['คิดตามหน่วย', Validators.required],
          water_rate: [''],
        }),
      }),
      location: this.fb.group({
        latitude: [this.defaultLocation.lat, Validators.required],
        longitude: [this.defaultLocation.lng, Validators.required],
      }),
      images: this.fb.array([]),

      // amenity: boolean list + ช่อง 'อื่นๆ'
      amenities: this.fb.array(
        this.AMENITIES.map(() => this.fb.control(false))
      ),
      amenitiesOther: this.fb.array([]), // << ช่องกรอก 'อื่นๆ'
    });

    this.setupUtilityValidators();
  }

  // --------- getters เพิ่มเติม ---------
  get amenitiesOther(): FormArray {
    return this.dormForm.get('amenitiesOther') as FormArray;
  }
  isAmenityChecked(id: string): boolean {
    const idx = this.getAmenityIndex(id);
    const arr = this.dormForm.get('amenities') as FormArray;
    return idx > -1 ? !!arr.at(idx).value : false;
  }
  getAmenityLocationType(id: string): string {
    const amenity = this.AMENITIES.find((a) => a.id === id);
    return amenity?.location_type || '';
  }

  // --------- toggle 'อื่นๆ' ---------
  onAmenityChange(index: number, id: string) {
    if (id !== 'other') return;
    const checked = (this.dormForm.get('amenities') as FormArray).at(
      index
    ).value;

    if (checked && this.amenitiesOther.length === 0) {
      this.amenitiesOther.push(
        this.fb.group({
          name: ['', [Validators.required, Validators.maxLength(50)]],
          location_type: ['', Validators.required],
        })
      );
    }
    if (!checked) {
      // เคลียร์รายการอื่นๆ เมื่อยกเลิกติ๊ก
      while (this.amenitiesOther.length) this.amenitiesOther.removeAt(0);
    }
  }
  addOtherAmenityField() {
    this.amenitiesOther.push(
      this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(50)]],
        location_type: ['', Validators.required],
      })
    );
  }
  removeOtherAmenityField(i: number) {
    this.amenitiesOther.removeAt(i);
  }

  private setupUtilityValidators() {
    // ไฟฟ้า
    this.electricity
      .get('electricity_type')
      ?.valueChanges.subscribe((type: string) => {
        const rateControl = this.electricity.get('electricity_rate')!;
        if (type === 'คิดตามหน่วย') {
          rateControl.setValidators([Validators.required, Validators.min(0)]);
        } else {
          // ตามมิเตอร์ = ไม่ต้องใส่ราคา
          rateControl.clearValidators();
          rateControl.setValue('');
        }
        rateControl.updateValueAndValidity();
      });

    // น้ำ
    this.water.get('water_type')?.valueChanges.subscribe((type: string) => {
      const rateControl = this.water.get('water_rate')!;
      if (type === 'คิดตามหน่วย' || type === 'เหมาจ่าย') {
        rateControl.setValidators([Validators.required, Validators.min(0)]);
      } else {
        // ตามมิเตอร์ = ไม่ต้องใส่ราคา
        rateControl.clearValidators();
        rateControl.setValue('');
      }
      rateControl.updateValueAndValidity();
    });
  }

  private loadZones(): void {
    this.zonesLoading = true;
    this.zonesError = null;
    this.dormitoryService.getAllZones().subscribe({
      next: (res) => {
        this.zones = Array.isArray(res) ? res : [];
        this.zonesLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.zonesLoading = false;
        this.zonesError = 'ไม่สามารถโหลดรายการโซนได้';
        console.error(err);
        this.cdr.markForCheck();
      },
    });
  }

  createRoomType() {
    return this.fb.group(
      {
      type: ['', Validators.required],
      customType: [''],
        bed_type: ['', Validators.required], // เพิ่มประเภทเตียง
      pricePerMonth: [''],
      pricePerDay: [''],
      pricePerTerm: [''],
        pricePerSummer: [''],
        room_type_id: [null],
      },
      { validators: this.requireMonthOrDay }
    );
  }

  // === Helpers ===
  get amenitiesList(): Amenity[] {
    return this.AMENITIES;
  }
  getAmenityIndex(amenityId: string): number {
    return this.amenityIndexMap.get(amenityId) ?? -1;
  }

  isOther(i: number): boolean {
    const g = this.roomTypes.at(i) as FormGroup;
    return g.get('type')?.value === 'other';
  }
  onTypeChange(i: number) {
    const g = this.roomTypes.at(i) as FormGroup;
    const type = g.get('type')?.value;
    const custom = g.get('customType');
    if (type === 'other') {
      custom?.setValidators([Validators.required, Validators.maxLength(100)]);
    } else {
      custom?.clearValidators();
      custom?.setValue('');
    }
    custom?.updateValueAndValidity({ emitEvent: false });

    if (type === 'other')
      setTimeout(() => {
        const el = this.document.querySelector<HTMLInputElement>(
          'input[formcontrolname="customType"]'
        );
      el?.focus();
    });
    this.cdr.markForCheck();
  }
  confirmOther(i: number) {
    const g = this.roomTypes.at(i) as FormGroup;
    const custom = (g.get('customType')?.value || '').trim();
    if (!custom) {
      g.get('type')?.setValue('');
      g.get('customType')?.setValue('');
      g.get('customType')?.clearValidators();
      g.get('customType')?.updateValueAndValidity({ emitEvent: false });
    }
    this.cdr.markForCheck();
  }
  revertOther(i: number) {
    const g = this.roomTypes.at(i) as FormGroup;
    g.get('type')?.setValue('');
    g.get('customType')?.setValue('');
    g.get('customType')?.clearValidators();
    g.get('customType')?.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  }

  // getters
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
  get imagesArray(): FormArray {
    return this.dormForm.get('images') as FormArray;
  }

  // number helpers
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

  // price text
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
    const z = this.zones.find((z) => z.zone_id === id);
    return z?.zone_name ?? '';
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

  addRoomType() {
    this.roomTypes.push(this.createRoomType());
  }
  removeRoomType(index: number) {
    if (this.roomTypes.length > 1) this.roomTypes.removeAt(index);
  }

  // จำกัดให้กรอกเฉพาะตัวเลขในช่องราคา
  enforceNumeric(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    const cleaned = input.value.replace(/[^\d]/g, '');
    if (cleaned !== input.value) input.value = cleaned;
  }

  // nav
  nextStep() {
    // Validate current step before proceeding
    if (this.currentStep === 1) {
      // ตรวจสอบตามลำดับที่กำหนด

      // 1. ข้อมูลทั่วไป
      const generalInfoGroup = this.dormForm.get('generalInfo') as FormGroup;
      if (!generalInfoGroup) {
        this.showCustomPopup('กรุณากรอกข้อมูลทั่วไปให้ครบถ้วน', 'error');
        return;
      }

      const name = generalInfoGroup.get('name')?.value?.trim();
      const zone_id = generalInfoGroup.get('zone_id')?.value;
      const address = generalInfoGroup.get('address')?.value?.trim();
      const description = generalInfoGroup.get('description')?.value?.trim();

      if (!name) {
        this.showCustomPopup('กรุณากรอกชื่อหอพัก', 'error', 'input[formControlName="name"]');
        return;
      }
      if (!zone_id) {
        this.showCustomPopup('กรุณาเลือกโซน', 'error', 'select[formControlName="zone_id"]');
        return;
      }
      if (!address) {
        this.showCustomPopup('กรุณากรอกที่อยู่', 'error', 'input[formControlName="address"]');
        return;
      }
      if (!description) {
        this.showCustomPopup('กรุณากรอกรายละเอียดเพิ่มเติม', 'error', 'textarea[formControlName="description"]');
        return;
      }

      // 2. ประเภทห้อง
      const roomTypesArray = this.roomTypes;
      if (roomTypesArray.length === 0) {
        this.showCustomPopup('กรุณาเพิ่มประเภทห้องอย่างน้อย 1 ประเภท', 'error');
        return;
      }

      // ตรวจสอบแต่ละประเภทห้อง
      for (let i = 0; i < roomTypesArray.length; i++) {
        const roomType = roomTypesArray.at(i) as FormGroup;
        const typeField = roomType.get('type')?.value;
        const bedTypeField = roomType.get('bed_type')?.value;
        const monthlyPrice = roomType.get('pricePerMonth')?.value?.trim();
        const dailyPrice = roomType.get('pricePerDay')?.value?.trim();

        if (!typeField) {
          this.showCustomPopup(`กรุณาเลือกประเภทห้องที่ ${i + 1}`, 'error', `#room-type-header-${i}`);
          return;
        }
        if (!bedTypeField) {
          this.showCustomPopup(`กรุณาเลือกประเภทเตียงที่ ${i + 1}`, 'error', `#room-type-header-${i}`);
          return;
        }
        // ตรวจสอบว่าค่าที่กรอกเป็นตัวเลขและขั้นต่ำ 1
        const isMonthlyValid = !monthlyPrice || (/^\d+$/.test(monthlyPrice) && Number(monthlyPrice) >= 1);
        const isDailyValid = !dailyPrice || (/^\d+$/.test(dailyPrice) && Number(dailyPrice) >= 1);

        if (!monthlyPrice && !dailyPrice) {
          this.showCustomPopup(`กรุณากรอกราคารายเดือนหรือรายวันที่ ${i + 1}`, 'error', `#room-type-header-${i}`);
          return;
        }

        if (monthlyPrice && !/^\d+$/.test(monthlyPrice)) {
          this.showCustomPopup(`กรุณากรอกราคารายเดือนเป็นตัวเลขเท่านั้นที่ ${i + 1}`, 'error', `#room-type-header-${i}`);
          return;
        }

        if (dailyPrice && !/^\d+$/.test(dailyPrice)) {
          this.showCustomPopup(`กรุณากรอกราคารายวันเป็นตัวเลขเท่านั้นที่ ${i + 1}`, 'error', `#room-type-header-${i}`);
          return;
        }
        if ((monthlyPrice && Number(monthlyPrice) === 0) || (dailyPrice && Number(dailyPrice) === 0)) {
          this.showCustomPopup(`กรุณากรอกราคาอย่างน้อย 1 บาท ที่ประเภทห้อง ${i + 1}`, 'error', `#room-type-header-${i}`);
          return;
        }
      }

      // 3. สิ่งอำนวยความสะดวก
      const amenitiesArray = this.dormForm.get('amenities') as FormArray;
      const selectedAmenities = amenitiesArray.value.filter(
        (amenity: boolean) => amenity === true
      );
      if (selectedAmenities.length === 0) {
        this.showCustomPopup('กรุณาเลือกสิ่งอำนวยความสะดวกอย่างน้อย 1 รายการ', 'error', 'input[type="checkbox"]');
        return;
      }

      // 4. ค่าใช้จ่าย
      const utilities = this.dormForm.get('utilities') as FormGroup;
      const electricityType = utilities.get(
        'electricity.electricity_type'
      )?.value;
      const waterType = utilities.get('water.water_type')?.value;
      const electricityRate = utilities.get('electricity.electricity_rate')?.value?.trim();
      const waterRate = utilities.get('water.water_rate')?.value?.trim();

      if (!electricityType) {
        this.showCustomPopup('กรุณาเลือกประเภทค่าไฟ', 'error', 'button[ng-reflect-ng-switch-case], select[formControlName="electricity_type"]');
        return;
      }
      if (!waterType) {
        this.showCustomPopup('กรุณาเลือกประเภทค่าน้ำ', 'error', 'button[ng-reflect-ng-switch-case], select[formControlName="water_type"]');
        return;
      }

      // ตรวจสอบอัตราค่าไฟ
      if (electricityType === 'คิดตามหน่วย') {
        if (!electricityRate) {
          this.showCustomPopup('กรุณากรอกอัตราค่าไฟ', 'error', 'input[formControlName="electricity_rate"]');
          return;
        }
        if (!/^\d+(\.\d{1,2})?$/.test(electricityRate)) {
          this.showCustomPopup('กรุณากรอกอัตราค่าไฟเป็นตัวเลขเท่านั้น', 'error', 'input[formControlName="electricity_rate"]');
          return;
        }
      }

      // ตรวจสอบอัตราค่าน้ำ
      if (waterType === 'คิดตามหน่วย' || waterType === 'เหมาจ่าย') {
        if (!waterRate) {
          this.showCustomPopup('กรุณากรอกอัตราค่าน้ำ', 'error', 'input[formControlName="water_rate"]');
          return;
        }
        if (!/^\d+(\.\d{1,2})?$/.test(waterRate)) {
          this.showCustomPopup('กรุณากรอกอัตราค่าน้ำเป็นตัวเลขเท่านั้น', 'error', 'input[formControlName="water_rate"]');
          return;
        }
      }

      // 5. ตำแหน่ง
      const location = this.dormForm.get('location') as FormGroup;
      const latitude = location.get('latitude')?.value;
      const longitude = location.get('longitude')?.value;

      if (!latitude || !longitude) {
        this.showCustomPopup('กรุณาเลือกตำแหน่งหอพักบนแผนที่', 'error');
        return;
      }

      // 6. รูปภาพ
      if (this.imagePreviewUrls.length < 5) {
        this.showCustomPopup('กรุณาอัปโหลดรูปภาพอย่างน้อย 5 ภาพ', 'error', '#file-upload');
        return;
      }
    } else if (this.currentStep === 2) {
      // Validate Room Types
      const roomTypesArray = this.roomTypes;

      if (roomTypesArray.length === 0) {
        this.showCustomPopup('กรุณาเพิ่มประเภทห้องอย่างน้อย 1 ประเภท', 'error');
        return;
      }

      // Validate each room type
      let hasValidRoomType = false;
      let validationErrors: string[] = [];

      for (let i = 0; i < roomTypesArray.length; i++) {
        const roomType = roomTypesArray.at(i) as FormGroup;
        this.markFormGroupTouched(roomType);

        const typeField = roomType.get('type');
        const bedTypeField = roomType.get('bed_type');
        const monthlyPrice = roomType.get('pricePerMonth')?.value?.trim();
        const dailyPrice = roomType.get('pricePerDay')?.value?.trim();

        console.log(`[DormAdd nextStep] Room type ${i + 1} validation:`, {
          valid: roomType.valid,
          type: {
            value: typeField?.value,
            valid: typeField?.valid,
            errors: typeField?.errors,
          },
          bed_type: {
            value: bedTypeField?.value,
            valid: bedTypeField?.valid,
            errors: bedTypeField?.errors,
          },
          pricePerMonth: monthlyPrice,
          pricePerDay: dailyPrice,
          groupErrors: roomType.errors,
        });

        // ตรวจสอบว่าค่าที่กรอกเป็นตัวเลขหรือไม่
        const isMonthlyValid = !monthlyPrice || /^\d+$/.test(monthlyPrice);
        const isDailyValid = !dailyPrice || /^\d+$/.test(dailyPrice);

        if (roomType.valid && isMonthlyValid && isDailyValid) {
          hasValidRoomType = true;
        } else {
          if (typeField?.hasError('required')) {
            validationErrors.push('กรุณาเลือกประเภทห้อง');
          }
          if (bedTypeField?.hasError('required')) {
            validationErrors.push('กรุณาเลือกประเภทเตียง');
          }
          if (!monthlyPrice && !dailyPrice) {
            validationErrors.push('กรุณากรอกราคารายเดือนหรือรายวัน');
          }
          if (monthlyPrice && !isMonthlyValid) {
            validationErrors.push('กรุณากรอกราคารายเดือนเป็นตัวเลขเท่านั้น');
          }
          if (dailyPrice && !isDailyValid) {
            validationErrors.push('กรุณากรอกราคารายวันเป็นตัวเลขเท่านั้น');
          }
        }
      }

      console.log('[DormAdd nextStep] Validation summary:', {
        hasValidRoomType,
        validationErrors,
        totalRoomTypes: roomTypesArray.length,
      });

      if (!hasValidRoomType) {
        const errorMessage =
          validationErrors.length > 0
            ? 'กรุณาแก้ไขข้อผิดพลาด:\n' + validationErrors.join('\n')
            : 'กรุณากรอกข้อมูลประเภทห้องให้ครบถ้วน';
        console.log('[DormAdd nextStep] About to show alert:', errorMessage);
        this.showCustomPopup(errorMessage, 'error');
        return;
      }

      // Check if at least one room type has price
      const roomPayloads = this.buildRoomTypePayloads();
      if (roomPayloads.length === 0) {
        this.showCustomPopup(
          'กรุณากรอกราคารายเดือนหรือรายวันสำหรับประเภทห้องอย่างน้อย 1 ประเภท',
          'error'
        );
        return;
      }
    }

    // Proceed to next step if validation passes
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      if (this.currentStep > this.maxReachedStep)
        this.maxReachedStep = this.currentStep;

      // Initialize map เมื่อไปยัง step ที่มี map
      if (this.currentStep === 2) {
        setTimeout(() => {
          this.initLocationMap();
          this.initPreviewMap();
          this.cdr.markForCheck();
        }, 500);
      }
    }
  }
  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      // เมื่อย้อนกลับมา Step 2 ให้สร้างแผนที่ใหม่เสมอ (เหมือนหน้า Add)
      if (this.currentStep === 2) {
        setTimeout(() => {
          this.initLocationMap();
          this.initPreviewMap();
          this.cdr.markForCheck();
        }, 500);
      }
    }
  }
  goToStep(step: number) {
    if (step <= this.maxReachedStep && step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;

      // Initialize map เมื่อไปยัง step ที่มี map
      if (this.currentStep === 2) {
        setTimeout(() => {
          // ตรวจสอบและสร้างแมปถ้ายังไม่มี
          this.initLocationMap();
          this.initPreviewMap();
          this.cdr.markForCheck();
        }, 500);
      }
    }
  }

  // *** ป้องกัน multiple submissions ***
  private isSubmittingGuard = false;

  // submit
  onSubmit() {
    console.log('[DormEdit] onSubmit called, currentStep:', this.currentStep);
    
    // *** Guard against multiple simultaneous submissions ***
    if (this.isSubmittingGuard) {
      console.log('[DormEdit] Submission already in progress, ignoring');
      return;
    }
    
    // เซ็ต guard flag
    this.isSubmittingGuard = true;

    // ตรวจสอบข้อมูลทั่วไป (Step 1)
    const generalInfoGroup = this.dormForm.get('generalInfo') as FormGroup;
    if (!generalInfoGroup || !generalInfoGroup.valid) {
      console.log(
        '[DormEdit] General info validation failed:',
        generalInfoGroup?.errors
      );
      this.markFormGroupTouched(generalInfoGroup || this.dormForm);
      this.showCustomPopup('กรุณากรอกข้อมูลทั่วไปให้ครบถ้วน', 'error');
      this.isSubmittingGuard = false; // รีเซ็ต guard
      return;
    }

    // ตรวจสอบข้อมูลประเภทห้อง (Step 2)
    const roomTypesArray = this.roomTypes;
    console.log(
      '[DormEdit] Room types validation - count:',
      roomTypesArray.length
    );

    if (roomTypesArray.length === 0) {
      this.showCustomPopup('กรุณาเพิ่มประเภทห้องอย่างน้อย 1 ประเภท', 'error');
      this.isSubmittingGuard = false; // รีเซ็ต guard
      return;
    }

    // ตรวจสอบ room type แต่ละประเภท
    let validationErrors: string[] = [];
    let hasValidRoomType = false;

    for (let i = 0; i < roomTypesArray.length; i++) {
      const roomType = roomTypesArray.at(i) as FormGroup;
      this.markFormGroupTouched(roomType);

      const typeField = roomType.get('type');
      const bedTypeField = roomType.get('bed_type');
      const monthlyPrice = roomType.get('pricePerMonth')?.value;
      const dailyPrice = roomType.get('pricePerDay')?.value;

      console.log(`[DormEdit] Room type ${i + 1} detailed validation:`);
      console.log('  - valid:', roomType.valid);
      console.log(
        '  - type:',
        typeField?.value,
        'valid:',
        typeField?.valid,
        'errors:',
        typeField?.errors
      );
      console.log(
        '  - bed_type:',
        bedTypeField?.value,
        'valid:',
        bedTypeField?.valid,
        'errors:',
        bedTypeField?.errors
      );
      console.log('  - pricePerMonth:', monthlyPrice);
      console.log('  - pricePerDay:', dailyPrice);
      console.log('  - groupErrors:', roomType.errors);

      // ไม่พึ่ง roomType.valid แล้ว ให้ตรวจสอบเองทุกอย่าง
      let roomHasErrors = false;

      console.log(`  -> Checking Room type ${i + 1} manually...`);

      // ตรวจสอบ type แบบง่ายๆ
      const typeValue = typeField?.value?.toString().trim() || '';
      if (typeValue === '') {
        console.log(`    - Missing type field (value: "${typeValue}")`);
        validationErrors.push(`ประเภทห้องที่ ${i + 1}: กรุณาเลือกประเภทห้อง`);
        roomHasErrors = true;
      }

      // ตรวจสอบ bed_type แบบง่ายๆ
      const bedTypeValue = bedTypeField?.value?.toString().trim() || '';
      if (bedTypeValue === '') {
        console.log(`    - Missing bed_type field (value: "${bedTypeValue}")`);
        validationErrors.push(`ประเภทห้องที่ ${i + 1}: กรุณาเลือกประเภทเตียง`);
        roomHasErrors = true;
      }

      // ตรวจสอบราคา
      const hasMonthlyPrice =
        monthlyPrice && monthlyPrice.toString().trim() !== '';
      const hasDailyPrice = dailyPrice && dailyPrice.toString().trim() !== '';
      if (!hasMonthlyPrice && !hasDailyPrice) {
        console.log(
          `    - Missing price (month: "${monthlyPrice}", day: "${dailyPrice}")`
        );
        validationErrors.push(
          `ประเภทห้องที่ ${i + 1}: กรุณากรอกราคารายเดือนหรือรายวัน`
        );
        roomHasErrors = true;
      }

      if (!roomHasErrors) {
        hasValidRoomType = true;
        console.log(`  -> Room type ${i + 1} is VALID (manual check)`);
      } else {
        console.log(`  -> Room type ${i + 1} has errors (manual check)`);
      }

      console.log(`    - Total errors so far:`, validationErrors.length);
    }

    console.log('[DormEdit] Validation summary:', {
      hasValidRoomType,
      validationErrors,
      totalRoomTypes: roomTypesArray.length,
    });

    if (!hasValidRoomType) {
      const errorMessage =
        validationErrors.length > 0
          ? 'กรุณาแก้ไขข้อผิดพลาด:\n' + validationErrors.join('\n')
          : 'กรุณากรอกข้อมูลประเภทห้องให้ครบถ้วน';
      console.log('[DormEdit] About to show alert:', errorMessage);
      this.showCustomPopup(errorMessage, 'error');
      this.isSubmittingGuard = false; // รีเซ็ต guard
      return;
    }

    // ตรวจสอบว่ามี room payload ที่พร้อมส่งหรือไม่
    const roomPayloads = this.buildRoomTypePayloads();
    console.log('[DormEdit] Room payloads generated:', roomPayloads);

    if (roomPayloads.length === 0) {
      this.showCustomPopup(
        'กรุณากรอกราคารายเดือนหรือรายวันสำหรับประเภทห้องอย่างน้อย 1 ประเภท',
        'error'
      );
      return;
    }

    const v = this.dormForm.value;
    try {
      const u = this.authService.currentUser$.value;
      console.log('[DormEdit] submit by user:', {
        email: u?.email ?? null,
        role: u?.memberType ?? 'unknown',
      });
    } catch {}

    const payloadBasic: any = {
      dormName: v.generalInfo.name,
      address: v.generalInfo.address,
      description: v.generalInfo.description,
      zoneId: Number(v.generalInfo.zone_id),
      electricityType: v.utilities.electricity.electricity_type,
      waterType: v.utilities.water.water_type,
      latitude: typeof v.location.latitude === 'string' ? Number(v.location.latitude) : v.location.latitude,
      longitude: typeof v.location.longitude === 'string' ? Number(v.location.longitude) : v.location.longitude
    };
    // Optional numeric rates: only include when present
    const eraw = v.utilities.electricity.electricity_rate;
    if (eraw !== null && eraw !== undefined && String(eraw).toString().trim() !== '') {
      payloadBasic.electricityRate = Number(String(eraw).replace(/[,\s]/g, ''));
    }
    const wraw = v.utilities.water.water_rate;
    if (wraw !== null && wraw !== undefined && String(wraw).toString().trim() !== '') {
      payloadBasic.waterRate = Number(String(wraw).replace(/[,\s]/g, ''));
    }
    console.log('[DormEdit] payload basic ->', payloadBasic);

    // *** Set both guards ***
    this.isSubmittingGuard = true;
    this.isSubmitting = true;
    this.cdr.markForCheck();

    // ใช้เส้นทางแก้ไขเมื่ออยู่ในโหมดแก้ไข
    if (this.isEditMode && this.editingDormId) {
      const dormId = this.editingDormId;
      console.log('[DormEdit] Updating basic dormitory via service');
      this.ownerDormitoryService.updateDormitoryBasic(dormId, payloadBasic).subscribe({
        next: (resp) => {
          console.log('[DormEdit] Basic dormitory updated:', resp);
          console.log('[DormEdit] Diff room types for dorm ID:', dormId);
          const existingIds = new Set<number>();
          const toAdd: Array<Partial<RoomType>> = [];
          const toUpdate: Array<{ id: number; data: Partial<RoomType> }> = [];

          // Collect form rows
          (this.roomTypes.controls as FormGroup[]).forEach((g) => {
            const idRaw = g.get('room_type_id')?.value;
            const id = idRaw !== null && idRaw !== undefined && idRaw !== '' ? Number(idRaw) : null;
            const type = g.get('type')?.value;
            const customType = g.get('customType')?.value;
            const bedType = g.get('bed_type')?.value;
            const monthly = this.toNumber(g.get('pricePerMonth')?.value);
            const daily = this.toNumber(g.get('pricePerDay')?.value);
            const term = this.toNumber(g.get('pricePerTerm')?.value);
            const summer = this.toNumber(g.get('pricePerSummer')?.value);
            const hasAny = [monthly, daily, term, summer].some(v => v !== null);
            if (!hasAny) return;
            const data: Partial<RoomType> = {
              name: type === 'other' ? (customType || '').trim() : type,
              bed_type: bedType
            };
            if (monthly !== null) data.monthly_price = monthly;
            if (daily !== null) data.daily_price = daily;
            if (term !== null) (data as any).term_price = term;
            if (summer !== null) (data as any).summer_price = summer;

            if (id) {
              existingIds.add(id);
              toUpdate.push({ id, data });
            } else {
              toAdd.push(data);
            }
          });

          // Fire requests: updates then adds
          const calls = [
            ...toUpdate.map(({ id, data }) => this.dormitoryService.updateRoomType(id, data)),
            ...toAdd.map((data) => this.dormitoryService.addRoomTypeForEdit(dormId, data))
          ];
          forkJoin(calls.length ? calls : [of(null)]).subscribe({
            next: (individualResp) => {
              console.log('[DormEdit] Room types saved (edit) successfully:', individualResp);
              this.uploadImagesIfAny(dormId);
            },
            error: (err2) => {
              console.error('[DormEdit] Save room types (edit) error:', err2);
              this.isSubmittingGuard = false;
              this.isSubmitting = false;
              this.submitErrorMessage = 'บันทึกประเภทห้องไม่สำเร็จ: ' + (err2?.message || 'ไม่ทราบสาเหตุ');
              this.showErrorModal = true;
              this.cdr.markForCheck();
            }
          });
        },
        error: (err) => {
          console.error('[DormEdit] Update dormitory error:', err);
          this.isSubmittingGuard = false;
          this.isSubmitting = false;
          this.submitErrorMessage = 'บันทึกไม่สำเร็จ: ' + (err?.message || 'ไม่ทราบสาเหตุ');
          this.showErrorModal = true;
          this.cdr.markForCheck();
        }
      });
      return;
    }

    // โหมดเพิ่มใหม่ (fallback เดิม)
    this.ownerDormitoryService.addDormitoryBasic(payloadBasic).subscribe({
      next: (resp) => {
        console.log('[DormEdit] Basic dormitory added (create mode):', resp);
        const dormId =
          resp?.dorm_id ??
          resp?.id ??
          resp?.dorm?.dorm_id ??
          resp?.data?.dorm_id ??
          null;

        if (!dormId) {
          console.error('[DormEdit] No dorm ID received from backend (create mode)');
          this.isSubmittingGuard = false;
          this.isSubmitting = false;
          this.submitErrorMessage = 'ไม่สามารถสร้างหอพักได้ กรุณาลองอีกครั้ง';
          this.showErrorModal = true;
          this.cdr.markForCheck();
          return;
        }

        console.log(
          '[DormEdit] Sending room types for dorm ID (create mode):',
          dormId,
          roomPayloads
        );

        // ใช้ individual calls แทน bulk
        const calls = roomPayloads.map((p) =>
          this.dormitoryService.addRoomType(dormId, p)
        );
        
        forkJoin(calls.length ? calls : [of(null)]).subscribe({
          next: (individualResp) => {
            console.log('[DormEdit] Individual room types added successfully (create mode):', individualResp);
            // อัปโหลดรูปภาพ (ถ้ามี)
            this.uploadImagesIfAny(dormId);
          },
          error: (err2) => {
            console.error('[DormEdit] Save room types error (create mode):', err2);
            this.isSubmittingGuard = false;
            this.isSubmitting = false;
            this.submitErrorMessage =
              'บันทึกประเภทห้องไม่สำเร็จ: ' +
              (err2?.message || 'ไม่ทราบสาเหตุ');
            this.showErrorModal = true;
            this.cdr.markForCheck();
          },
        });
      },
      error: (err) => {
        console.error('[DormEdit] Add dormitory error (create mode):', err);
        this.isSubmittingGuard = false;
        this.isSubmitting = false;
        this.submitErrorMessage =
          'บันทึกไม่สำเร็จ: ' + (err?.message || 'ไม่ทราบสาเหตุ');
        this.showErrorModal = true;
        this.cdr.markForCheck();
      },
    });
  }

  closeErrorModal() {
    this.showErrorModal = false;
  }

  private initSliderImages() {
    if (this.imagePreviewUrls.length > 0) {
      this.sliderImages = this.imagePreviewUrls.map((url, index) => ({
        src: url,
        alt: `รูปภาพหอพัก ${index + 1}`,
      }));
    } else {
      // default images
      this.sliderImages = [
        {
          src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องนั่งเล่นทันสมัย',
        },
        {
          src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องพักสะอาดตา',
        },
        {
          src: 'https://images.unsplash.com/photo-1560448075-bb485b067938?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องนอนอบอุ่น',
        },
        {
          src: 'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องครัวโมเดิร์น',
        },
        {
          src: 'https://images.unsplash.com/photo-1505692794403-34d4982f88aa?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องรับแขกโปร่งสบาย',
        },
        {
          src: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80',
          alt: 'มุมทำงาน',
        },
        {
          src: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1600&q=80',
          alt: 'ตกแต่งด้วยต้นไม้',
        },
        {
          src: 'https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องน้ำสะอาด',
        },
        {
          src: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องนั่งเล่นอบอุ่น',
        },
        {
          src: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80',
          alt: 'ห้องนอนมินิมอล',
        },
      ];
    }
    this.cdr.markForCheck();
  }

  updateSliderImages(): void {
    this.initSliderImages();
    this.cdr.markForCheck();
  }

  private buildRoomTypePayloads(): Array<Partial<RoomType>> {
    const payloads: Array<Partial<RoomType>> = [];
    const list = this.roomTypes.controls as FormGroup[];
    for (const g of list) {
      const type = g.get('type')?.value;
      const customType = g.get('customType')?.value;
      const bedType = g.get('bed_type')?.value; // เพิ่มประเภทเตียง
      const monthly = this.toNumber(g.get('pricePerMonth')?.value);
      const daily = this.toNumber(g.get('pricePerDay')?.value);
      const term = this.toNumber(g.get('pricePerTerm')?.value);
      const summer = this.toNumber(g.get('pricePerSummer')?.value);
      const hasAny = [monthly, daily, term, summer].some((v) => v !== null);
      if (!hasAny) continue;
              // ยกเลิกการกำหนด price_type; ให้หลังบ้านคำนวณเอง
      let priceType = 'รายเดือน'; // default
      if (daily !== null && monthly === null) {
        priceType = 'รายวัน';
      } else if (daily !== null && monthly !== null) {
        priceType = 'รายวันและรายเดือน';
      }

      const payload: Partial<RoomType> = {
          name: type === 'other' ? (customType || '').trim() : type,
          bed_type: bedType, // เพิ่มประเภทเตียงใน payload
          // price_type ตัดออก ให้หลังบ้านคำนวณเอง
        };
      if (monthly !== null) payload.monthly_price = monthly;
      if (daily !== null) payload.daily_price = daily;
      if (term !== null) payload.term_price = term;
      if (summer !== null) payload.summer_price = summer;
      payloads.push(payload);
    }
    return payloads;
  }

  goToOwnerPage() {
    this.router.navigate(['/owner']);
  }

  cancelForm() {
    // ยกเลิกการเพิ่มหอพักและกลับไปหน้าแรก
    this.router.navigate(['/main']);
  }

  private markFormGroupTouched(group: FormGroup | FormArray) {
    Object.keys(group.controls).forEach((key) => {
      const control = group.get(key);
      if (control instanceof FormGroup || control instanceof FormArray)
        this.markFormGroupTouched(control);
      else control?.markAsTouched();
    });
  }

// ฟังก์ชัน initLocationMap แบบเดียวกับหน้า DormAdd (เช็ค DOM และขนาดก่อน สร้างเฉพาะเมื่อพร้อม)
initLocationMap() {
  console.log('[DormEdit] initLocationMap called');

  setTimeout(() => {
    const mapElement = this.document.getElementById('location-map');
    if (!mapElement) {
      setTimeout(() => this.initLocationMap(), 1000);
      return;
    }

    if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
      console.error('[DormEdit] Map element has zero dimensions, waiting...');
      setTimeout(() => this.initLocationMap(), 500);
      return;
    }

    if (this.mapService.isMapInitialized('location-map')) {
      console.log('[DormEdit] Location map already initialized, skipping');
      return;
    }

    const loc = this.dormForm.get('location')!;
    const lat = loc.get('latitude')?.value || this.defaultLocation.lat;
    const lng = loc.get('longitude')?.value || this.defaultLocation.lng;

    console.log('[DormEdit] Map coordinates:', { lat, lng });

    try {
      console.log('[DormEdit] Calling mapService.initializeMap...');
      this.mapService.initializeMap('location-map', lat, lng);

      console.log('[DormEdit] Calling mapService.enablePickLocation...');
      this.mapService.enablePickLocation(({ lat, lng }) => {
        console.log('[DormEdit] Location picked:', { lat, lng });
        loc.get('latitude')?.setValue(lat);
        loc.get('longitude')?.setValue(lng);
        this.cdr.markForCheck();
      });

      console.log('[DormEdit] Map initialized successfully');
    } catch (error) {
      console.error('[DormEdit] Map initialization error:', error);
    }
  }, 200);
}

// ฟังก์ชัน initPreviewMap แบบเดียวกับหน้า DormAdd (เช็ค DOM และขนาดก่อน สร้างเฉพาะเมื่อพร้อม)
initPreviewMap() {
  // console.log('[DormEdit] initPreviewMap called');

  setTimeout(() => {
    const mapElement = this.document.getElementById('preview-map');
    if (!mapElement) {
      setTimeout(() => this.initPreviewMap(), 1000);
      return;
    }

    if (this.mapService.isMapInitialized('preview-map')) {
      console.log('[DormEdit] Preview map already initialized, skipping');
      return;
    }

    const loc = this.dormForm.get('location')!;
    const lat = loc.get('latitude')?.value;
    const lng = loc.get('longitude')?.value;

    if (!lat || !lng) {
      console.log('[DormEdit] No coordinates available for preview map');
      return;
    }

    console.log('[DormEdit] Preview map coordinates:', { lat, lng });

    try {
      this.mapService.initializeMap('preview-map', lat, lng, 'ตำแหน่งหอพัก');
      console.log('[DormEdit] Preview map initialized successfully');
    } catch (error) {
      console.error('[DormEdit] Preview map initialization error:', error);
    }
  }, 300);
}

  // ---------- Drag & Drop Methods ----------
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    fileInput?.click();
  }

  onImageReorder(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    // Reorder both arrays using CDK's moveItemInArray
    moveItemInArray(this.selectedImages, event.previousIndex, event.currentIndex);
    moveItemInArray(this.imagePreviewUrls, event.previousIndex, event.currentIndex);

    // Update form array
    this.updateFormArray();

    // Update slider images
    this.updateSliderImages();

    console.log('[DormEdit] Image reordered:', {
      from: event.previousIndex,
      to: event.currentIndex,
      mainImage: this.imagePreviewUrls[0]
    });
  }

  private updateFormArray(): void {
    // Clear existing form array
    while (this.imagesArray.length) {
      this.imagesArray.removeAt(0);
    }

    // Add images in new order
    this.selectedImages.forEach((file, index) => {
      this.imagesArray.push(
        this.fb.group({
          file: [file],
          preview: [this.imagePreviewUrls[index]],
          image_type: [''],
        })
      );
    });
  }

  private handleFiles(files: File[]): void {
    // ตรวจสอบจำนวนไฟล์
    if (this.selectedImages.length + files.length > 20) {
      this.showCustomPopup('ไม่สามารถอัปโหลดได้เกิน 20 ภาพ', 'error');
      return;
    }

    // ตรวจสอบไฟล์ทั้งหมดก่อน
    const validFiles: File[] = [];
    for (const file of files) {
      // ตรวจสอบขนาดไฟล์ (5MB = 5 * 1024 * 1024 bytes)
      if (file.size > 5 * 1024 * 1024) {
        this.showCustomPopup(`ไฟล์ ${file.name} มีขนาดเกิน 5MB`, 'error');
        continue;
      }

      // ตรวจสอบประเภทไฟล์
      if (!file.type.startsWith('image/')) {
        this.showCustomPopup(`ไฟล์ ${file.name} ไม่ใช่รูปภาพ`, 'error');
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // เพิ่มไฟล์ทั้งหมดในครั้งเดียว
    this.selectedImages.push(...validFiles);

    // สร้าง preview URLs แบบ async เพื่อไม่ให้ UI block
    this.createImagePreviews(validFiles);
  }

  private createImagePreviews(files: File[]): void {
    let processedCount = 0;
    const totalFiles = files.length;

    files.forEach((file, index) => {
      // ใช้ createObjectURL แทน readAsDataURL เพื่อความเร็ว
      const url = URL.createObjectURL(file);
        this.imagePreviewUrls.push(url);
        this.imageError = false;

      // เก็บไฟล์ในฟอร์ม
        this.imagesArray.push(
          this.fb.group({
            file: [file],
            preview: [url],
            image_type: [''],
          })
        );

      processedCount++;

      // อัปเดต UI เมื่อประมวลผลเสร็จครบทุกไฟล์
      if (processedCount === totalFiles) {
        this.cdr.markForCheck();
        this.updateSliderImages();
      }
    });
  }

  // ---------- Images ----------
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    this.handleFiles(files);
  }

  removeImage(index: number): void {
    if (index < 0 || index >= this.imagePreviewUrls.length) return;

    // Cleanup object URL ก่อนลบ
    const urlToRemove = this.imagePreviewUrls[index];
    if (urlToRemove && urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove);
    }

    this.imagePreviewUrls.splice(index, 1);
    this.selectedImages.splice(index, 1);

    // Update form array
    this.updateFormArray();

    this.updateSliderImages();
  }



  private uploadImagesIfAny(dormId: number): void {
    if (this.selectedImages.length === 0) {
      // ไม่มีรูป ไปขั้นตอนสุดท้าย
      this.finishSubmission();
      return;
    }

    console.log('[DormEdit] Uploading images:', this.selectedImages.length);

    // สร้าง FormData สำหรับส่งรูปภาพ
    const formData = new FormData();

    // เพิ่มรูปภาพตามลำดับ (รูปแรก = ภาพหลัก)
    this.selectedImages.forEach((file, index) => {
      formData.append('images', file);
    });

    // ส่งไป backend
    this.ownerDormitoryService
      .uploadDormImagesForEdit(dormId, formData)
      .subscribe({
        next: (response) => {
          console.log('[DormEdit] Images uploaded successfully:', response);
          console.log('[DormEdit] Calling finishSubmission...');
          this.finishSubmission();
        },
        error: (error) => {
          console.error('[DormEdit] Image upload error:', error);
          // ถึงแม้อัปโหลดรูปไม่สำเร็จ ก็ให้ไปขั้นตอนสุดท้าย
          this.finishSubmission();
        },
      });
  }

  private finishSubmission(): void {
    console.log('[DormAdd] finishSubmission called');
    console.log('[DormAdd] Current step before:', this.currentStep);
    this.currentStep = 3;
    this.maxReachedStep = 3;
    this.isSubmittingGuard = false;
    this.isSubmitting = false;
    console.log('[DormAdd] Current step after:', this.currentStep);
    console.log('[DormAdd] Calling cdr.markForCheck()');
    this.cdr.markForCheck();
    console.log('[DormAdd] finishSubmission completed');
    
    // Force change detection
    setTimeout(() => {
      console.log('[DormAdd] Force change detection after timeout');
      this.cdr.detectChanges();
    }, 100);
  }

  private buildAmenitiesPayload(): Array<{
    amenity_id?: number;
    amenity_name: string;
    location_type: string;
    is_available: boolean;
  }> {
    const amenities: Array<{
      amenity_id?: number;
      amenity_name: string;
      location_type: string;
      is_available: boolean;
    }> = [];

    // Standard amenities - ส่งเฉพาะที่ผู้ใช้เลือก (isChecked = true)
    this.AMENITIES.forEach((amenity, index) => {
      const isChecked = this.dormForm.get('amenities')?.value[index];
      if (isChecked) {
        amenities.push({
          amenity_id: index + 1, // สมมติว่า amenity_id ใน DB เริ่มจาก 1
          amenity_name: amenity.name, // ส่งชื่อที่ผู้ใช้เห็น (แอร์, WIFI, ลิฟต์, etc.)
          location_type: amenity.location_type,
          is_available: true,
        });
      }
    });

    // Custom amenities (อื่นๆ) - ส่งเฉพาะที่ผู้ใช้กรอก
    this.amenitiesOther.controls.forEach((ctrl) => {
      const group = ctrl as FormGroup;
      const name = group.get('name')?.value?.trim();
      const locationType = group.get('location_type')?.value;

      if (name && locationType) {
        amenities.push({
          amenity_name: name, // ส่งชื่อที่ผู้ใช้กรอกเอง
          location_type: locationType,
          is_available: true,
        });
      }
    });

    return amenities;
  }

  ngOnDestroy(): void {
    // ทำลาย map instance เมื่อออกจาก component
    try {
      this.mapService.destroyMapByContainer('location-map');
      this.mapService.destroyMapByContainer('preview-map');
    } catch (error) {
      console.log('[DormAdd] Map cleanup error (ignored):', error);
    }

    // disconnect observers
    try { this.locationResizeObserver?.disconnect(); } catch {}
    try { this.previewResizeObserver?.disconnect(); } catch {}

    // Cleanup object URLs เพื่อป้องกัน memory leaks
    this.imagePreviewUrls.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

  // Custom popup methods
  showCustomPopup(
    message: string,
    type: 'error' | 'warning' | 'success' = 'error',
    scrollTargetSelector?: string
  ) {
    this.popupMessage = message;
    this.popupType = type;
    this.popupTargetSelector = scrollTargetSelector || null;
    this.showPopup = true;
  }

  closePopup(shouldMove: boolean = false) {
    this.showPopup = false;
    if (shouldMove && this.popupTargetSelector) {
      // รอให้ modal ปิดสมบูรณ์ก่อน scroll
      setTimeout(() => {
        this.scrollToRoomTypeWithHighlight(this.popupTargetSelector!);
        this.popupTargetSelector = null;
      }, 200);
    }
  }

  // แยก concerns: จัดการ scroll
  private scrollToRoomTypeWithHighlight(selector: string) {
    console.log('[DormAdd] Looking for element with selector:', selector);
    const targetElement = this.findTargetElement(selector);
    
    if (targetElement) {
      console.log('[DormAdd] Element found, scrolling to:', targetElement);
      // ปรับให้ scroll สมูทขึ้น
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
      
      // รอให้ scroll เสร็จแล้วค่อย focus
      setTimeout(() => {
        this.focusIfInput(targetElement);
      }, 300);
    } else {
      console.error('[DormAdd] Element not found with selector:', selector);
    }
  }

  // แยก concerns: หา element ด้วย multiple selectors
  private findTargetElement(selector: string): HTMLElement | null {
    // Primary selector
    let element = this.document.querySelector<HTMLElement>(selector);
    
    if (element) return element;

    // Fallback: หาจาก room type index
    const roomTypeMatch = selector.match(/room-type-(\d+)/);
    if (roomTypeMatch) {
      const index = parseInt(roomTypeMatch[1]);
      
      // Try multiple selectors
      const selectors = [
        `#room-type-${index}`,
        `#room-type-header-${index}`,
        `.room-type-container:nth-child(${index + 1})`,
        `div[formGroupName="${index}"] span.font-medium`
      ];

      for (const sel of selectors) {
        element = this.document.querySelector<HTMLElement>(sel);
        if (element) return element;
      }
    }

    return null;
  }


  // แยก concerns: focus input elements
  private focusIfInput(element: HTMLElement) {
    if (element instanceof HTMLInputElement || 
        element instanceof HTMLSelectElement || 
        element instanceof HTMLTextAreaElement) {
      element.focus();
    }
  }
}
