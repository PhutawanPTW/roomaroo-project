import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminProfile {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  photoURL: string;
  memberType: string;
}

export interface Dormitory {
  dorm_id: string;
  dorm_name: string;
  owner_username: string;
  owner_name: string;
  address: string;
  approval_status: 'อนุมัติ' | 'รออนุมัติ' | 'ไม่อนุมัติ';
  submitted_date: string;
  zone_name: string;
  main_image_url: string;
  description?: string;
  room_types?: any[];
  utilities?: any;
  images?: string[];
  facilities?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private backendUrl = environment.backendApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * เข้าสู่ระบบแอดมิน
   */
  adminLogin(firebaseToken: string): Observable<AdminProfile> {
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${firebaseToken}`)
      .set('Content-Type', 'application/json');
    
    return this.http.post<AdminProfile>(`${this.backendUrl}/auth/admin-login`, {}, { headers });
  }

  /**
   * ดึงหอพักทั้งหมด (ทั้งอนุมัติและรออนุมัติ)
   */
  getAllDormitories(): Observable<Dormitory[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Dormitory[]>(`${this.backendUrl}/admin/dormitories/all`, { headers });
  }

  /**
   * ดึงเฉพาะหอพักที่รอการอนุมัติ
   */
  getPendingDormitories(): Observable<Dormitory[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Dormitory[]>(`${this.backendUrl}/admin/dormitories/pending`, { headers });
  }

  /**
   * สร้าง headers สำหรับการเรียก API
   */
  private getAuthHeaders(): HttpHeaders {
    const adminProfile = localStorage.getItem('adminProfile');
    if (!adminProfile) {
      throw new Error('Admin profile not found');
    }

    // ในกรณีนี้เราต้องการ Firebase token สำหรับการเรียก API
    // แต่เนื่องจากเราเก็บ adminProfile ไว้แล้ว เราอาจต้องเก็บ token แยก
    // หรือใช้วิธีอื่นในการดึง token
    const firebaseToken = localStorage.getItem('firebaseToken');
    if (!firebaseToken) {
      throw new Error('Firebase token not found');
    }

    return new HttpHeaders()
      .set('Authorization', `Bearer ${firebaseToken}`)
      .set('Content-Type', 'application/json');
  }
}
