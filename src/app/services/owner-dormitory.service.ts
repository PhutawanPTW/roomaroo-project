import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OwnerDormitoryService {
  private apiUrl = environment.backendApiUrl; // Use environment configuration

  constructor(private http: HttpClient) { }

  // สำหรับ production หรือหลัง login จริง
  getMyDormitorySubmissions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dormitories/my/submissions`)
      .pipe(
        tap((resp) => {
          try {
            const arr = Array.isArray(resp) ? resp : [resp];
            console.log('[OwnerDormitoryService] GET /api/dormitories/my/submissions -> items:', arr.length,
              'first keys:', Object.keys(arr[0] || {}));
            if (arr.length > 0) {
              console.log('[OwnerDormitoryService] sample item:', arr[0]);
            }
          } catch { }
        }),
        catchError(this.handleError)
      );
  }

  // เพิ่มหอพัก: ส่งได้ทั้งเฉพาะข้อมูลพื้นฐาน หรือแนบ room_types มาด้วย
  addDormitoryBasic(payload: {
    dorm_name: string;
    address: string;
    dorm_description?: string;
    zone_id: number | string;
    room_types?: Array<{
      name: string;
      // price_type removed: backend derives from provided prices
      monthly_price?: number;
      daily_price?: number;
      term_price?: number;
      summer_price?: number;
      description?: string;
    }>;  // แนบได้เลยถ้าต้องการบันทึกพร้อมกัน
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-dormitory/`, payload)
      .pipe(
        tap((resp) => {
          try {
            console.log('[OwnerDormitoryService] POST /api/add-dormitory/ -> ok', resp);
          } catch { }
        }),
        catchError(this.handleError)
      );
  }

  // ดึงข้อมูลหอพักสำหรับแก้ไข (Edit) - ตามสเปคใหม่
  getDormitoryForEdit(dormId: number): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (!currentUser) {
            subscriber.error(new Error('กรุณาเข้าสู่ระบบ'));
            return;
          }
          const token = await currentUser.getIdToken();
          const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
          this.http.get(`${this.apiUrl}/edit-dormitory/${dormId}`, { headers })
            .pipe(
              tap((resp) => {
                try {
                  console.log('[OwnerDormitoryService] GET /api/edit-dormitory/:id -> ok', resp);
                } catch {}
              }),
              catchError(this.handleError)
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();

      // teardown
      return () => {};
    });
  }

  // แก้ไขข้อมูลพื้นฐานหอพัก (Edit) - ตามสเปคใหม่
  updateDormitoryBasic(dormId: number, payload: {
    dormName: string;
    zoneId: number | string;
    address: string;
    description: string;
    latitude: number;
    longitude: number;
    electricityType: string;
    electricityRate?: number | string | null;
    waterType: string;
    waterRate?: number | string | null;
  }): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (!currentUser) {
            subscriber.error(new Error('กรุณาเข้าสู่ระบบ'));
            return;
          }
          const token = await currentUser.getIdToken();
          const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
          this.http.patch(`${this.apiUrl}/edit-dormitory/${dormId}`, payload, { headers })
            .pipe(
              tap((resp) => {
                try {
                  console.log('[OwnerDormitoryService] PATCH /api/edit-dormitory/:id -> ok', resp);
                } catch {}
              }),
              catchError(this.handleError)
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();

      // teardown
      return () => {};
    });
  }

  // ===== Amenities (Edit flow) =====
  // GET /api/edit-dormitory/:dormId/amenities - ตามสเปคใหม่
  getDormAmenitiesForEdit(dormId: number): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (!currentUser) {
            subscriber.error(new Error('กรุณาเข้าสู่ระบบ'));
            return;
          }
          const token = await currentUser.getIdToken();
          const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
          this.http.get(`${this.apiUrl}/edit-dormitory/${dormId}/amenities`, { headers })
            .pipe(
              tap((resp: any) => {
                try {
                  const items = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.amenities) ? resp.amenities : []);
                  console.log('[OwnerDormitoryService] GET /api/edit-dormitory/:id/amenities -> items:', items.length);
                } catch (e) {}
              }),
              catchError(this.handleError)
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();

      // teardown
      return () => {};
    });
  }

  // PATCH /api/edit-dormitory/:dormId/amenities - ตามสเปคใหม่
  saveDormAmenitiesForEdit(
    dormId: number,
    amenities: Array<{ 
      amenity_id?: number; 
      is_available: boolean; 
      location_type: string; 
      amenity_name: string 
    }>
  ): Observable<any> {
    const payload = { amenities };
    return new Observable((subscriber) => {
      (async () => {
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (!currentUser) {
            subscriber.error(new Error('กรุณาเข้าสู่ระบบ'));
            return;
          }
          const token = await currentUser.getIdToken();
          const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
          this.http.patch(`${this.apiUrl}/edit-dormitory/${dormId}/amenities`, payload, { headers })
            .pipe(
              tap((resp) => {
                try {
                  console.log('[OwnerDormitoryService] PATCH /api/edit-dormitory/:id/amenities -> ok', resp);
                } catch {}
              }),
              catchError(this.handleError)
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();

      // teardown
      return () => {};
    });
  }

  // อัปโหลดรูปหอพัก (Add flow)
  uploadDormImagesForAdd(dormId: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-dormitory/${dormId}/images`, formData)
      .pipe(
        tap((resp) => {
          try {
            console.log('[OwnerDormitoryService] POST /api/add-dormitory/:id/images -> ok', resp);
          } catch {}
        }),
        catchError(this.handleError)
      );
  }

  // อัปโหลดรูปหอพัก (Edit flow) - ตามสเปคใหม่
  uploadDormImagesForEdit(dormId: number, formData: FormData): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (!currentUser) {
            subscriber.error(new Error('กรุณาเข้าสู่ระบบ'));
            return;
          }
          const token = await currentUser.getIdToken();
          const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
          this.http.post(`${this.apiUrl}/edit-dormitory/${dormId}/images`, formData, { headers })
            .pipe(
              tap((resp) => {
                try {
                  console.log('[OwnerDormitoryService] POST /api/edit-dormitory/:id/images -> ok', resp);
                } catch {}
              }),
              catchError(this.handleError)
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();

      // teardown
      return () => {};
    });
  }

  // ===== Images (Edit flow) =====
  // DELETE /api/edit-dormitory/:dormId/images/:imageId - ตามสเปคใหม่
  deleteDormImageForEdit(dormId: number, imageId: number): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (!currentUser) {
            subscriber.error(new Error('กรุณาเข้าสู่ระบบ'));
            return;
          }
          const token = await currentUser.getIdToken();
          const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
          this.http.delete(`${this.apiUrl}/edit-dormitory/${dormId}/images/${imageId}`, { headers })
            .pipe(
              tap((resp) => {
                try {
                  console.log('[OwnerDormitoryService] DELETE /api/edit-dormitory/:id/images/:imageId -> ok');
                } catch {}
              }),
              catchError(this.handleError)
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();

      // teardown
      return () => {};
    });
  }

  // PUT /api/edit-dormitory/:dormId/images/:imageId/primary - ตามสเปคใหม่
  setPrimaryDormImageForEdit(dormId: number, imageId: number): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (!currentUser) {
            subscriber.error(new Error('กรุณาเข้าสู่ระบบ'));
            return;
          }
          const token = await currentUser.getIdToken();
          const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
          this.http.put(`${this.apiUrl}/edit-dormitory/${dormId}/images/${imageId}/primary`, {}, { headers })
            .pipe(
              tap((resp) => {
                try {
                  console.log('[OwnerDormitoryService] PUT /api/edit-dormitory/:id/images/:imageId/primary -> ok');
                } catch {}
              }),
              catchError(this.handleError)
            )
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();

      // teardown
      return () => {};
    });
  }

  // ดึงหอพักที่ userId เป็นเจ้าของ (API ใหม่)
  getDormsByUserId(userId: string | number): Observable<any> {
    return this.http.get(`${this.apiUrl}/add-dormitory/owner/dormitories`)
      .pipe(
        tap((resp) => {
          try {
            const arr = Array.isArray(resp) ? resp : [resp];
            console.log('[OwnerDormitoryService] GET /api/add-dormitory/owner/dormitories',
              '-> items:', arr.length, 'first keys:', Object.keys(arr[0] || {}));
            if (arr.length > 0) {
              console.log('[OwnerDormitoryService] sample item:', arr[0]);
            }
          } catch { }
        }),
        catchError(this.handleError)
      );
  }

  // ใช้ API ใหม่ตามสเปค: GET /api/dormitories/owner (ต้องส่ง Firebase ID Token)
  getOwnerDormsWithPrice(): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (!currentUser) {
            subscriber.error(new Error('กรุณาเข้าสู่ระบบ'));
            return;
          }
          const token = await currentUser.getIdToken();
          const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
          this.http.get(`${this.apiUrl}/dormitories/owner`, { headers })
            .pipe(catchError(this.handleError))
            .subscribe({
              next: (data) => subscriber.next(data),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete()
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();

      // teardown
      return () => {};
    });
  }

  // ดึงรายการผู้เช่าทั้งหมดในหอของ owner
  getOwnerTenants(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dormitories/owner/tenants`)
      .pipe(
        tap((resp) => {
          try {
            const arr = Array.isArray(resp) ? resp : [resp];
          } catch { }
        }),
        catchError(this.handleError)
      );
  }

  // ยืนยันการสมัครของผู้เช่า
  approveTenant(dormId: number, userId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/dormitories/${dormId}/tenants/${userId}/approve`, {})
      .pipe(
        tap((resp) => {
          console.log('[OwnerDormitoryService] PUT /api/dormitories/${dormId}/tenants/${userId}/approve -> success', resp);
        }),
        catchError(this.handleError)
      );
  }

  // ปฏิเสธการสมัครของผู้เช่า
  rejectTenant(dormId: number, userId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/dormitories/${dormId}/tenants/${userId}/reject`, {})
      .pipe(
        tap((resp) => {
          console.log('[OwnerDormitoryService] PUT /api/dormitories/${dormId}/tenants/${userId}/reject -> success', resp);
        }),
        catchError(this.handleError)
      );
  }

  // ปฏิเสธการสมัครของผู้เช่าพร้อมเหตุผล
  rejectTenantWithReason(dormId: number, userId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/dormitories/${dormId}/tenants/${userId}/reject`, {
      response_note: reason
    })
      .pipe(
        tap((resp) => {
          console.log('[OwnerDormitoryService] PUT /api/dormitories/${dormId}/tenants/${userId}/reject with reason -> success', resp);
        }),
        catchError(this.handleError)
      );
  }

  // ยกเลิกการยืนยันผู้เช่า
  cancelTenantApproval(dormId: number, userId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/dormitories/${dormId}/tenants/${userId}/cancel`, {})
      .pipe(
        tap((resp) => {
          console.log('[OwnerDormitoryService] PUT /api/dormitories/${dormId}/tenants/${userId}/cancel -> success', resp);
        }),
        catchError(this.handleError)
      );
  }

  // ยกเลิกการยืนยันผู้เช่าพร้อมเหตุผล
  cancelTenantApprovalWithReason(dormId: number, userId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/dormitories/${dormId}/tenants/${userId}/cancel`, {
      response_note: reason
    })
      .pipe(
        tap((resp) => {
          console.log('[OwnerDormitoryService] PUT /api/dormitories/${dormId}/tenants/${userId}/cancel with reason -> success', resp);
        }),
        catchError(this.handleError)
      );
  }



  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);

    // กรณี backend ส่ง HTML (เช่น endpoint ไม่ถูกต้อง)
    if (typeof error.error === 'string' && (error.error.includes('<!doctype') || error.error.includes('<html'))) {
      console.error('Server returned HTML response');
      return throwError(() => new Error('API endpoint not found - received HTML instead of JSON'));
    }

    let serverMessage: string | undefined;
    let serverErrors: unknown;

    // ดึงข้อมูล message/errors จาก backend ให้ครบที่สุด
    if (error.error) {
      if (typeof error.error === 'object') {
        serverMessage = (error.error.message ?? error.error.msg ?? error.error.error ?? undefined);
        serverErrors = (error.error.errors ?? error.error.details ?? undefined);
      } else if (typeof error.error === 'string') {
        const trimmed = error.error.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            serverMessage = (parsed.message ?? parsed.msg ?? parsed.error ?? serverMessage);
            serverErrors = (parsed.errors ?? parsed.details ?? serverErrors);
          } catch {
            // ไม่สามารถ parse ได้ ปล่อยผ่าน
          }
        }
      }
    }

    if (serverMessage) console.error('Server message:', serverMessage);
    if (serverErrors !== undefined) console.error('Server errors:', serverErrors);
    

    if (error.status === 0) {
      return throwError(() => new Error('Unable to connect to server'));
    }

    // ส่งข้อความที่อ่านง่ายกลับไปให้ component
    const message = serverMessage || error.message || 'An error occurred';
    return throwError(() => new Error(message));

    if (error.error) {
      console.error('Server message:', error.error.message);
      console.error('Server errors:', error.error.errors);
      console.error('Server normalized:', error.error.normalized); // เพิ่มบรรทัดนี้
    }
  }
}