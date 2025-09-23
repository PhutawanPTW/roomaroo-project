import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Zone {
  zone_id: number;
  zone_name: string;
  description?: string;
}

export interface Dorm {
  dorm_id: number;
  dorm_name: string;
  address: string;
  dorm_description?: string;  // Made optional to match DormDetail
  latitude: number | null;
  longitude: number | null;
  
  // เพิ่ม zone_name ที่ backend ส่งมา
  zone_name?: string;
  
  thumbnail_url?: string;
  price_display?: string;
  location_display?: string;
  updated_date?: string;
  rating?: number;
  
  // เพิ่มช่วงราคาใหม่สำหรับการแสดงราคาเป็นช่วง
  min_price?: number;
  max_price?: number;
  
  // UI alias fields (optional for template)
  image?: string;
  price?: string;
  name?: string;
  location?: string;
  date?: string;
  monthly_price?: string;
  daily_price?: string;
  main_image_url?: string;
  
  // เพิ่ม fields อื่นๆ ที่ backend ส่งมา (ตาม dormitoryController.js)
  bed_type?: string;
  rental_type?: string;
  electricity_type?: string;
  electricity_rate?: string;
  water_type?: string;
  water_rate?: string;
  approval_status?: string;
  
  // Contact info
  manager_name?: string;
  primary_phone?: string;
  secondary_phone?: string;
  line_id?: string;
  contact_email?: string;
}

export interface DormImage {
  image_id: number;
  image_url: string;
}

export interface RoomType {
  room_type_id: number;
  dorm_id: number;
  name: string;
  bed_type: string;
  size_sqm?: number;
  monthly_price?: number;
  daily_price?: number;
  term_price?: number;
  summer_price?: number;
  price_type: 'fixed' | 'contact';  // fixed = ราคาชัดเจน, contact = ติดต่อสอบถาม
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DormDetail extends Dorm {
  manager_name: string;
  manager_phone?: string;
  primary_phone?: string; // Added field from API
  manager_line?: string;
  line_id?: string; // Added field from API
  water_bill?: string;
  water_rate?: string; // Added field from API
  water_type?: string; // Added field from API
  electric_bill?: string;
  electricity_rate?: string; // Added field from API
  electricity_type?: string; // Added field from API
  description?: string;
  dorm_description?: string; // Added field from API
  
  // Owner contact information
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  owner_secondary_phone?: string;
  owner_line_id?: string;
  owner_manager_name?: string;
  owner_photo_url?: string;
  
  images: { image_id?: number; dorm_id?: number; image_url: string; image_type?: string; is_primary?: boolean; upload_date?: string }[];
  amenities: { 
    dorm_amenity_id?: number; 
    dorm_id?: number;
    amenity_id?: number;
    name: string; 
    is_available: boolean;
    amenity_name?: string; // Alternative field name
  }[];
}

export interface Amenity {
  amenity_id: number;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
}

@Injectable({ providedIn: 'root' })
export class DormitoryService {
  private backendUrl = environment.backendApiUrl;
  // Short-lived cache for eligibility checks (key: `${dormId}:${userId}`)
  private eligibilityCache = new Map<string, { value: {canReview: boolean, message?: string}, expiresAt: number }>();
  private readonly eligibilityTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  /** Get random recommended dormitories */
  getRecommended(limit?: number): Observable<Dorm[]> {
    let params = new HttpParams();
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<any>(`${this.backendUrl}/dormitories/recommended`, { params }).pipe(
      map(resp => Array.isArray(resp) ? resp : (resp.dormitories ?? []))
    );
  }

  /** Get latest updated dormitories (sorted by updated_date DESC) */
  getLatest(limit?: number): Observable<Dorm[]> {
    let params = new HttpParams();
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<any>(`${this.backendUrl}/dormitories/latest`, { params }).pipe(
      map(resp => Array.isArray(resp) ? resp : (resp.dormitories ?? []))
    );
  }

  getImages(dormId: number): Observable<DormImage[]> {
    return this.http.get<DormImage[]>(`${this.backendUrl}/dormitories/${dormId}/images`).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error fetching images for dorm ${dormId}:`, err);
        return of([]);
      })
    );
  }
  
  /** Get room types for a specific dormitory */
  getRoomTypes(dormId: number): Observable<RoomType[]> {
    return this.http.get<RoomType[]>(`${this.backendUrl}/dormitories/${dormId}/room-types`).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error fetching room types for dorm ${dormId}:`, err);
        return of([]);
      })
    );
  }
  
  /** Add a new room type */
  addRoomType(dormId: number, roomType: Partial<RoomType>): Observable<RoomType> {
    return this.http.post<RoomType>(`${this.backendUrl}/dormitories/${dormId}/room-types`, roomType);
  }
  
  /** Add multiple room types in one request (bulk) */
  addRoomTypesBulk(dormId: number, roomTypes: Array<Partial<RoomType>>): Observable<any> {
    return this.http.post(`${this.backendUrl}/dormitories/${dormId}/room-types/bulk`, { room_types: roomTypes });
  }
  
  /** Update a room type */
  updateRoomType(roomTypeId: number, roomType: Partial<RoomType>): Observable<RoomType> {
    return this.http.put<RoomType>(`${this.backendUrl}/dormitories/room-types/${roomTypeId}`, roomType);
  }
  
  /** Delete a room type */
  deleteRoomType(roomTypeId: number): Observable<any> {
    return this.http.delete(`${this.backendUrl}/dormitories/room-types/${roomTypeId}`);
  }

  /** Get all amenities from the database */
  getAllAmenities(): Observable<Amenity[]> {
    return this.http.get<Amenity[]>(`${this.backendUrl}/dormitories/amenities/all`).pipe(
      catchError(err => {
        console.error('[DormitoryService] Error fetching all amenities:', err);
        return of([]);
      })
    );
  }

  // ดึงรายการหอพักทั้งหมด
  getAllDormitories(params?: {
    zone_id?: number;
    min_price?: number;
    max_price?: number;
    limit?: number;
    offset?: number;
  }): Observable<Dorm[]> {
    let httpParams = new HttpParams();
    
    if (params?.zone_id) {
      httpParams = httpParams.set('zone_id', params.zone_id.toString());
    }
    if (params?.min_price) {
      httpParams = httpParams.set('min_price', params.min_price.toString());
    }
    if (params?.max_price) {
      httpParams = httpParams.set('max_price', params.max_price.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.offset) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }
    
    return this.http.get<Dorm[]>(`${this.backendUrl}/dormitories`, { params: httpParams });
  }

  // ดึงรายละเอียดหอพักตาม ID
  getDormitoryById(dormId: number): Observable<DormDetail> {
    return this.http.get<DormDetail>(`${this.backendUrl}/dormitories/${dormId}`).pipe(
      map(dorm => {
        // Convert coordinates to numbers
        if (dorm.latitude) {
          dorm.latitude = typeof dorm.latitude === 'string' ? parseFloat(dorm.latitude) : dorm.latitude;
        }
        if (dorm.longitude) {
          dorm.longitude = typeof dorm.longitude === 'string' ? parseFloat(dorm.longitude) : dorm.longitude;
        }
        return dorm;
      })
    );
  }

  /** Get all zones */
  getAllZones(): Observable<Zone[]> {
    return this.http.get<Zone[]>(`${this.backendUrl}/zones`).pipe(
      catchError(err => {
        console.error('[DormitoryService] Error fetching zones:', err);
        return of([]);
      })
    );
  }

  // Map API endpoints
  /** Get all dormitories for map display with coordinates */
  getAllDormitoriesForMap(): Observable<{dormitories: Dorm[], total: number}> {
    return this.http.get<any>(`${this.backendUrl}/dormitories/map/all`).pipe(
      map(response => {
        // Handle new API response format
        const dorms = response.dormitories || [];
        const mappedDorms = dorms.map((dorm: any) => ({
          dorm_id: dorm.id,
          dorm_name: dorm.name,
          address: dorm.address,
          latitude: dorm.position?.lat || null,
          longitude: dorm.position?.lng || null,
          zone_name: dorm.zone,
          thumbnail_url: dorm.image_url,
          main_image_url: dorm.image_url,
          min_price: dorm.price_range?.min,
          max_price: dorm.price_range?.max,
          rating: dorm.rating?.average,
          price_display: dorm.price_range ? 
            `${dorm.price_range.min.toLocaleString()} - ${dorm.price_range.max.toLocaleString()} บาท/เดือน` : 
            'ติดต่อสอบถาม'
        }));
        
        return {
          dormitories: mappedDorms,
          total: response.pagination?.total || mappedDorms.length
        };
      }),
      catchError(err => {
        console.error('[DormitoryService] Error fetching dormitories for map:', err);
        return of({ dormitories: [], total: 0 });
      })
    );
  }

  /** Get dormitory popup data for map */
  getDormitoryPopup(dormId: number): Observable<DormDetail> {
    return this.http.get<any>(`${this.backendUrl}/dormitories/map/popup/${dormId}`).pipe(
      map(response => {
        // Handle new API response format
        const dorm = response;
        return {
          dorm_id: dorm.id,
          dorm_name: dorm.name,
          address: dorm.address,
          dorm_description: dorm.description,
          latitude: dorm.position?.lat || null,
          longitude: dorm.position?.lng || null,
          zone_name: dorm.zone,
          thumbnail_url: dorm.image_url,
          main_image_url: dorm.image_url,
          min_price: dorm.price_range?.min,
          max_price: dorm.price_range?.max,
          rating: dorm.rating?.average,
          price_display: dorm.price_range ? 
            `${dorm.price_range.min.toLocaleString()} - ${dorm.price_range.max.toLocaleString()} บาท/เดือน` : 
            'ติดต่อสอบถาม',
          // Add other required fields for DormDetail
          manager_name: 'เจ้าของหอพัก',
          images: dorm.image_url ? [{ image_url: dorm.image_url }] : [],
          amenities: []
        } as DormDetail;
      }),
      catchError(err => {
        console.error(`[DormitoryService] Error fetching dormitory popup for dorm ${dormId}:`, err);
        throw err;
      })
    );
  }

  /** Check if user can review this dormitory (with short-lived cache) */
  checkReviewEligibility(dormId: number, userId?: number | string): Observable<{canReview: boolean, message?: string}> {
    const cacheKey = `${dormId}:${userId ?? 'anon'}`;

    // Return cached value if valid
    const now = Date.now();
    const cached = this.eligibilityCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return of(cached.value);
    }

    return this.http.get<any>(`${this.backendUrl}/reviews/dormitory/${dormId}/eligibility`).pipe(
      map(response => ({
        canReview: response.can_review || response.canReview || false,
        message: response.reason || response.message
      })),
      tap(result => {
        this.eligibilityCache.set(cacheKey, { value: result, expiresAt: now + this.eligibilityTtlMs });
      }),
      catchError(err => {
        console.error(`[DormitoryService] Error checking review eligibility for dorm ${dormId}:`, err);
        return of({ canReview: false, message: 'ไม่สามารถตรวจสอบสิทธิ์การรีวิวได้' });
      })
    );
  }

  /** Get reviews for a dormitory */
  getDormitoryReviews(dormId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.backendUrl}/reviews/dormitory/${dormId}`).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error fetching reviews for dorm ${dormId}:`, err);
        return of([]);
      })
    );
  }

  /** Create a new review - ส่งเฉพาะ comment (AI จะทำการ auto-rating) */
  createReview(dormId: number, reviewData: {comment: string}): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/reviews/dormitory/${dormId}`, reviewData).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error creating review for dorm ${dormId}:`, err);
        throw err;
      })
    );
  }

  /** Update an existing review */
  updateReview(reviewId: number, reviewData: {comment: string}): Observable<any> {
    return this.http.put<any>(`${this.backendUrl}/reviews/${reviewId}`, reviewData).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error updating review ${reviewId}:`, err);
        throw err;
      })
    );
  }

  /** Delete a review */
  deleteReview(reviewId: number): Observable<any> {
    return this.http.delete<any>(`${this.backendUrl}/reviews/${reviewId}`).pipe(
      catchError(err => {
        console.error(`[DormitoryService] Error deleting review ${reviewId}:`, err);
        throw err;
      })
    );
  }
} 