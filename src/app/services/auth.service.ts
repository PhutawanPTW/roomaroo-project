import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from '@angular/fire/auth';
import { Router } from '@angular/router';

export interface UserProfile {
  uid: string;
  id: number;
  email: string;
  username: string;
  displayName: string | null;
  photoURL?: string | null;
  memberType: 'member' | 'owner';
  needsProfileSetup: boolean;
  phoneNumber?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  businessRegistration?: string | null;
  residenceDormId?: string | null;
  provider?: 'google' | 'password';
  display_name?: string | null;
  member_type?: 'member' | 'owner';
  secondaryPhone?: string | null;
  lineId?: string | null;
  managerName?: string | null;
  secondary_phone?: string | null;
  line_id?: string | null;
  manager_name?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private backendUrl = environment.backendApiUrl;

  // *** Centralized User Session State ***
  public currentUser$ = new BehaviorSubject<UserProfile | null | undefined>(undefined);

  // *** ป้องกัน currentUser$ race condition ***
  private currentUserUpdateQueue: Promise<void> = Promise.resolve();

  // เพิ่ม flag เพื่อติดตามสถานะการโหลด auth state
  private authStateInitialized = false;
  private authStatePromise: Promise<void> | null = null;

  // *** Centralized Auth State Management ***
  private authState = {
    skipAuthStateChange: false,
    isRefreshingToken: false,
    isInitializing: false
  };

  // Promise-based token refresh to prevent multiple simultaneous calls
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor(
    private http: HttpClient,
    private auth: Auth,
    private router: Router
  ) {
    this.initializeAuthState();
  }

  // Public controls for temporarily pausing/resuming auth state broadcasting
  public pauseAuthStateChange(): void {
    this.authState.skipAuthStateChange = true;
  }

  public resumeAuthStateChange(): void {
    this.authState.skipAuthStateChange = false;
  }

  // *** Method สำหรับ update currentUser$ แบบ queue เพื่อป้องกัน race condition ***
  private async updateCurrentUserSafely(userProfile: UserProfile | null | undefined): Promise<void> {
    this.currentUserUpdateQueue = this.currentUserUpdateQueue.then(async () => {
      console.log('[AuthService] Updating currentUser$ safely:', userProfile?.email || 'null');
      this.currentUser$.next(userProfile);
      // เพิ่ม delay เล็กน้อยเพื่อให้ UI มีเวลา update
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    return this.currentUserUpdateQueue;
  }

  // เพิ่ม method สำหรับ initialize auth state
  private initializeAuthState(): void {
    if (this.authStatePromise) {
      return; // กำลัง initialize อยู่แล้ว
    }

    this.authStatePromise = new Promise<void>((resolve) => {
      onAuthStateChanged(this.auth, async (user) => {
        console.log('[AuthService] Auth state changed:', user ? 'User found' : 'No user');

        // *** Centralized Auth State Check ***
        if (this.authState.skipAuthStateChange) {
          console.log('[AuthService] Skipping auth state change - Skip flag set');
          this.authState.skipAuthStateChange = false;
          return;
        }

        if (this.authState.isInitializing) {
          console.log('[AuthService] Skipping auth state change - Already initializing');
          return;
        }

        try {
          if (user) {
            const profile = await this.fetchUserProfile(user);
            await this.updateCurrentUserSafely(profile);
          } else {
            console.log('[AuthService] No user, setting currentUser$ to null');
            await this.updateCurrentUserSafely(null);
          }
        } catch (error) {
          console.error('[AuthService] Error in auth state change:', error);
          // ไม่ set currentUser$ เป็น null เมื่อเกิด error เพื่อป้องกันการ redirect
          // ให้รอ auth state ถูกต้องก่อน
        } finally {
          if (!this.authStateInitialized) {
            this.authStateInitialized = true;
            resolve();
          }
        }
      });
    });
  }

  // เพิ่ม method สำหรับรอให้ auth state พร้อม
  async waitForAuthState(): Promise<void> {
    if (this.authStatePromise) {
      await this.authStatePromise;
    }
  }

  // เพิ่ม method สำหรับ refresh token
  async refreshToken(forceRefresh = false): Promise<string> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return Promise.reject('No authenticated user');
    }

    // *** ป้องกัน multiple simultaneous token refresh calls ***
    if (this.authState.isRefreshingToken && this.tokenRefreshPromise) {
      console.log('[AuthService] Token refresh already in progress, waiting...');
      return this.tokenRefreshPromise;
    }

    // สร้าง promise ใหม่สำหรับ refresh token
    this.authState.isRefreshingToken = true;
    this.tokenRefreshPromise = new Promise<string>((resolve, reject) => {
      try {
        currentUser
          .getIdToken(forceRefresh)
          .then((token) => {
            resolve(token);
          })
          .catch((error) => {
            reject(error);
          })
          .finally(() => {
            this.authState.isRefreshingToken = false;
            this.tokenRefreshPromise = null;
            console.log('[AuthService] Token refresh completed');
          });
      } catch (error) {
        this.authState.isRefreshingToken = false;
        this.tokenRefreshPromise = null;
        reject(error);
      }
    });

    return this.tokenRefreshPromise;
  }

  // เพิ่ม method สำหรับตรวจสอบสถานะ token
  async verifyToken(): Promise<boolean> {
    try {
      const token = await this.refreshToken(false);
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

      const response = await this.http
        .get<{ valid: boolean }>(`${this.backendUrl}/auth/verify-token`, { headers })
        .toPromise();
      return response?.valid || false;
    } catch (error) {
      return false;
    }
  }

  // *** Core Authentication Methods ***

  /**
   * เข้าสู่ระบบด้วย Email/Password
   */
  async signInWithEmail(
    email: string,
    password: string,
    expectedUserType: 'member' | 'owner'
  ): Promise<UserProfile> {
    try {
      // ป้องกัน onAuthStateChanged ดึง profile ก่อนจะตรวจสอบประเภทผู้ใช้
      this.authState.skipAuthStateChange = true;

      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      const userProfile = await this.fetchUserProfile(user);

      // Safeguard against account-type mismatch (backend /auth/me cannot know expected type)
      if (userProfile.memberType !== expectedUserType) {
        await this.signOut(null);
        const thaiRole = userProfile.memberType === 'owner' ? 'เจ้าของหอพัก' : 'สมาชิก';
        throw new Error(`บัญชีนี้ถูกลงทะเบียนเป็น${thaiRole}แล้ว`);
      }

      // อัปเดต currentUser$ ด้วยข้อมูลที่ถูกต้อง
      this.currentUser$.next(userProfile);

      return userProfile;
    } catch (error: any) {
      throw error;
    } finally {
      // ปลดล็อคให้ onAuthStateChanged กลับมาทำงานตามปกติ
      this.authState.skipAuthStateChange = false;
    }
  }

  /**
   * ออกจากระบบ
   */
  async signOut(redirectTo: string | Router | null = null): Promise<void> {
    try {
      // Reset all flags before signing out
      this.authState.skipAuthStateChange = true;

      await this.auth.signOut();
      this.currentUser$.next(null);

      if (redirectTo) {
        if (redirectTo instanceof Router) {
          await redirectTo.navigate(['/login']);
        } else {
          await this.router.navigate([redirectTo]);
        }
      }
    } catch (error) {
      console.error('[AuthService] Error signing out:', error);
      throw error;
    }
  }

  // *** User Profile Management ***

  /**
   * ดึงข้อมูลโปรไฟล์ผู้ใช้จาก backend
   */
  async fetchUserProfile(firebaseUser: User): Promise<UserProfile> {
    try {
      const idToken = await firebaseUser.getIdToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

      const rawResponse = await this.http
        .get<any>(`${this.backendUrl}/auth/me`, { headers })
        .toPromise();

      if (!rawResponse) {
        throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
      }

      // *** แก้ไข: ให้ priority กับ snake_case จาก backend ***
      const memberType = rawResponse.member_type || rawResponse.memberType || null;
      const needsProfileSetup = rawResponse.needs_profile_setup !== undefined
          ? rawResponse.needs_profile_setup
          : rawResponse.needsProfileSetup || false;

      const userProfile: UserProfile = {
        uid: firebaseUser.uid,
        id: rawResponse.id,
        email: firebaseUser.email || '',
        username: rawResponse.username || '',
        displayName: rawResponse.display_name || rawResponse.displayName || firebaseUser.displayName || null,
        photoURL: rawResponse.photo_url || rawResponse.photoURL || firebaseUser.photoURL || null,
        memberType: memberType,
        needsProfileSetup: needsProfileSetup,
        phoneNumber: rawResponse.phone_number || rawResponse.phoneNumber || firebaseUser.phoneNumber || null,
        businessName: rawResponse.business_name || rawResponse.businessName || null,
        businessAddress: rawResponse.business_address || rawResponse.businessAddress || null,
        businessRegistration: rawResponse.business_registration || rawResponse.businessRegistration || null,
        residenceDormId: rawResponse.residence_dorm_id || rawResponse.residenceDormId || null,
        provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
        // Add owner fields
        secondaryPhone: rawResponse.secondary_phone || rawResponse.secondaryPhone || null,
        lineId: rawResponse.line_id || rawResponse.lineId || null,
        managerName: rawResponse.manager_name || rawResponse.managerName || null,
        // Add snake_case variants
        secondary_phone: rawResponse.secondary_phone || null,
        line_id: rawResponse.line_id || null,
        manager_name: rawResponse.manager_name || null,
      };

      return userProfile;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * ตรวจสอบสถานะการเข้าสู่ระบบเมื่อแอปเริ่มทำงาน
   */
  async checkAuthState(): Promise<UserProfile | null> {
    if (!environment.production) {
      console.log('[AuthService] Checking auth state...');
    }

    // รอให้ auth state initialize เสร็จก่อน
    await this.waitForAuthState();

    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      console.log('[AuthService] No current user found');
      this.currentUser$.next(null);
      return null;
    }

    try {
      console.log('[AuthService] Current user found:', currentUser.email);

      // ลอง refresh token ก่อน
      try {
        await this.refreshToken(true);
      } catch (tokenError) {
        console.warn('[AuthService] Token refresh failed, but continuing:', tokenError);
      }

      const userProfile = await this.fetchUserProfile(currentUser);
      console.log('[AuthService] User profile loaded:', userProfile);
      this.currentUser$.next(userProfile);
      return userProfile;
    } catch (error) {
      console.error('[AuthService] Error checking auth state:', error);

      // ไม่ set currentUser$ เป็น null ทันทีเมื่อเกิด error
      // ให้รอให้ auth state ถูกต้องก่อน
      return null;
    }
  }

  // *** Utility Methods ***

  /**
   * อัปเดตข้อมูลผู้ใช้ใน currentUser$ (สำหรับ external services)
   */
  updateCurrentUser(userProfile: UserProfile | null): void {
    this.updateCurrentUserSafely(userProfile);
  }

  // =============================
  // Profile APIs (Backend calls)
  // =============================

  /**
   * อัปเดตโปรไฟล์ผู้ใช้ในระบบ (DB เป็น source of truth)
   * PUT /api/profile/
   */
  async updateProfile(payload: {
    displayName?: string;
    username?: string;
    phone?: string;
    // owner-only optional fields
    managerName?: string;
    secondaryPhone?: string;
    lineId?: string;
  }): Promise<{ message: string } | any> {
    const token = await this.refreshToken(false);
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    // Map camelCase -> snake_case for backend
    const serverPayload: any = {};
    if (payload.displayName !== undefined) serverPayload.display_name = payload.displayName;
    if (payload.username !== undefined) serverPayload.username = payload.username;
    if (payload.phone !== undefined) serverPayload.phone_number = payload.phone;
    if (payload.managerName !== undefined) serverPayload.manager_name = payload.managerName;
    if (payload.secondaryPhone !== undefined) serverPayload.secondary_phone = payload.secondaryPhone;
    if (payload.lineId !== undefined) serverPayload.line_id = payload.lineId;
    return this.http
      .put(`${this.backendUrl}/profile/`, serverPayload, { headers })
      .toPromise();
  }

  /**
   * อัปโหลดรูปโปรไฟล์ -> ได้ URL ใหม่จาก backend
   * POST /api/profile/upload-image (multipart/form-data)
   */
  async uploadProfileImage(file: File): Promise<{ url?: string; photo_url?: string; message?: string } | any> {
    const token = await this.refreshToken(false);
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const formData = new FormData();
    // Backend expects single('image')
    formData.append('image', file);
    return this.http
      .post(`${this.backendUrl}/profile/upload-image`, formData, { headers })
      .toPromise();
  }

  /**
   * ยื่นคำขอย้ายหอ (สำหรับสมาชิก)
   * PUT /api/profile/change-dormitory
   */
  async requestChangeDormitory(newDormId: number): Promise<{ message: string } | any> {
    const token = await this.refreshToken(false);
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http
      .put(`${this.backendUrl}/profile/change-dormitory`, { new_dorm_id: newDormId }, { headers })
      .toPromise();
  }

  /**
   * ดึงข้อมูลผู้ใช้ปัจจุบันแบบ sync
   */
  getCurrentUser(): UserProfile | null | undefined {
    return this.currentUser$.value;
  }

  /**
   * ตรวจสอบว่ามีผู้ใช้ล็อกอินอยู่หรือไม่
   */
  isAuthenticated(): boolean {
    const user = this.currentUser$.value;
    return user !== null && user !== undefined;
  }

  /**
   * ตรวจสอบประเภทผู้ใช้ปัจจุบัน
   */
  isOwner(): boolean {
    const user = this.currentUser$.value;
    return user?.memberType === 'owner';
  }

  isMember(): boolean {
    const user = this.currentUser$.value;
    return user?.memberType === 'member';
  }

  // *** Error Handling ***

  /**
   * จัดการข้อความ error ให้เป็นภาษาไทย
   */
  errorMessageHandler(error: any): string {
    // Firebase authentication errors
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          return 'ไม่พบบัญชีผู้ใช้นี้ในระบบ';
        case 'auth/wrong-password':
          return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        case 'auth/invalid-email':
          return 'รูปแบบอีเมลไม่ถูกต้อง';
        case 'auth/email-already-in-use':
          return 'อีเมลนี้ถูกใช้งานแล้ว';
        case 'auth/weak-password':
          return 'รหัสผ่านไม่ปลอดภัย กรุณาใช้รหัสผ่านที่มีความยาวอย่างน้อย 6 ตัวอักษร';
        case 'auth/popup-closed-by-user':
          return 'การยืนยันถูกยกเลิก กรุณาลองอีกครั้ง';
        case 'auth/cancelled-popup-request':
          return 'มีการขอเปิดหน้าต่างซ้ำ กรุณาลองอีกครั้ง';
        case 'auth/popup-blocked':
          return 'หน้าต่างยืนยันตัวตนถูกบล็อค กรุณาอนุญาตป๊อปอัพจากเว็บไซต์นี้';
        case 'auth/requires-recent-login':
          return 'กรุณาเข้าสู่ระบบอีกครั้งเพื่อดำเนินการต่อ';
        case 'auth/too-many-requests':
          return 'มีการพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณาลองใหม่ในภายหลัง';
        default:
          return `เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ${error.message}`;
      }
    }

    // Backend API errors
    if (error.status) {
      switch (error.status) {
        case 400:
          return error.error?.message || 'ข้อมูลไม่ถูกต้อง';
        case 401:
          return 'ไม่ได้รับอนุญาตให้เข้าถึงข้อมูล';
        case 403:
          return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
        case 404:
          return 'ไม่พบข้อมูลที่ต้องการ';
        case 409:
          // แปลง owner/member จาก backend ให้เป็นไทย และตัดข้อความส่วนเกิน
          if (error.error?.message) {
            const rawMsg: string = error.error.message;
            if (rawMsg.includes('owner')) {
              return 'บัญชีนี้ถูกลงทะเบียนเป็นเจ้าของหอพักแล้ว';
            }
            if (rawMsg.includes('member')) {
              return 'บัญชีนี้ถูกลงทะเบียนเป็นสมาชิกแล้ว';
            }
            return rawMsg;
          }
          if (error.message) {
            if (error.message.includes('owner')) {
              return 'บัญชีนี้ถูกลงทะเบียนเป็นเจ้าของหอพักแล้ว';
            }
            if (error.message.includes('member')) {
              return 'บัญชีนี้ถูกลงทะเบียนเป็นสมาชิกแล้ว';
            }
          }
          return 'ข้อมูลมีความขัดแย้งกัน';
        case 429:
          return 'มีการส่งคำขอมากเกินไป กรุณาลองใหม่ในภายหลัง';
        case 500:
        case 501:
        case 502:
        case 503:
          return 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่ในภายหลัง';
        default:
          return error.error?.message || error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      }
    }
    

    // Custom error messages from our backend
    if (error.message) {
      if (error.message.includes('อีเมล') && error.message.includes('ใช้งานแล้ว')) {
        return 'อีเมลนี้ถูกใช้งานแล้ว';
      }
      return error.message;
    }

    // Generic error
    return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองอีกครั้ง';
  }

  // เพิ่มใหม่ใน AuthService
async signInAdmin(email: string, password: string) {
  try {
    // กัน onAuthStateChanged ยิงก่อนตรวจสอบโปรไฟล์
    this.authState.skipAuthStateChange = true;

    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    const profile = await this.fetchUserProfile(cred.user);

    // อัปเดตสถานะผู้ใช้ให้ UI รับทราบ
    await this.updateCurrentUserSafely(profile);
    return profile;
  } finally {
    this.authState.skipAuthStateChange = false;
  }
}

}