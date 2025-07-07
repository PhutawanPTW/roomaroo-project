import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class OwnerDormitoryService {
  private apiUrl = 'http://localhost:3000'; // Your backend URL

  constructor(private http: HttpClient) {}

  // สำหรับ production หรือหลัง login จริง
  getMyDormitorySubmissions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/dormitories/my/submissions`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // ดึงหอพักที่ userId เป็นเจ้าของ (API ใหม่)
  getDormsByUserId(userId: string | number): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/dormitories/user/${userId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    
    // Check if response is HTML (common when API endpoint doesn't exist)
    if (error.error && typeof error.error === 'string' && error.error.includes('<!doctype')) {
      return throwError(() => new Error('API endpoint not found - received HTML instead of JSON'));
    }
    
    // Handle other HTTP errors
    if (error.status === 0) {
      return throwError(() => new Error('Unable to connect to server'));
    }
    
    return throwError(() => new Error(error.message || 'An error occurred'));
  }
}