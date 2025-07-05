import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

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
  latitude: string | null;
  longitude?: string | null;
  
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
  private backendUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /** Get random recommended dormitories */
  getRecommended(limit?: number): Observable<Dorm[]> {
    let params = new HttpParams();
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<any>(`${this.backendUrl}/dormitories/recommended`, { params }).pipe(
      tap(resp => console.log('[DormitoryService] recommended raw resp', resp)),
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
      tap(resp => console.log('[DormitoryService] latest raw resp', resp)),
      map(resp => Array.isArray(resp) ? resp : (resp.dormitories ?? []))
    );
  }

  getImages(dormId: number): Observable<DormImage[]> {
    console.log(`[DormitoryService] Fetching images for dorm ID: ${dormId}`);
    return this.http.get<DormImage[]>(`${this.backendUrl}/dormitories/${dormId}/images`).pipe(
      tap(imgs => console.log(`[DormitoryService] Images response for dorm ${dormId}:`, imgs)),
      catchError(err => {
        console.error(`[DormitoryService] Error fetching images for dorm ${dormId}:`, err);
        return of([]);
      })
    );
  }
  
  /** Get room types for a specific dormitory */
  getRoomTypes(dormId: number): Observable<RoomType[]> {
    return this.http.get<RoomType[]>(`${this.backendUrl}/dormitories/${dormId}/room-types`).pipe(
      tap(roomTypes => console.log(`[DormitoryService] Room types for dorm ${dormId}:`, roomTypes)),
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
      tap(amenities => console.log('[DormitoryService] All amenities:', amenities)),
      catchError(err => {
        console.error('[DormitoryService] Error fetching all amenities:', err);
        return of([]);
      })
    );
  }

  // ดึงรายการหอพักทั้งหมด
  getAllDormitories(): Observable<Dorm[]> {
    return this.http.get<Dorm[]>(`${this.backendUrl}/dormitories`);
  }

  // ดึงรายละเอียดหอพักตาม ID
  getDormitoryById(dormId: number): Observable<DormDetail> {
    return this.http.get<DormDetail>(`${this.backendUrl}/dormitories/${dormId}`);
  }

  /** Get all zones */
  getAllZones(): Observable<Zone[]> {
    return this.http.get<Zone[]>(`${this.backendUrl}/zones`).pipe(
      tap(zones => console.log('[DormitoryService] All zones:', zones)),
      catchError(err => {
        console.error('[DormitoryService] Error fetching zones:', err);
        return of([]);
      })
    );
  }
} 