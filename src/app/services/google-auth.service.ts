import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth, signInWithPopup, GoogleAuthProvider, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

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
    providedIn: 'root'
})
export class GoogleAuthService {
  private backendUrl = environment.backendApiUrl;

  // Centralized Google Auth State Management
  private googleAuthState = {
    isGoogleRegistrationFlow: false,
    isRegistrationInProgress: false,
    isTemporaryGoogleUser: false
  };

  constructor(
        private http: HttpClient,
        private auth: Auth,
    private router: Router,
    private appAuthService: AuthService
  ) {}

  /**
   * Google OAuth Sign-in - รองรับทั้ง member และ owner
   */
  async signInWithGoogle(userType: 'member' | 'owner'): Promise<UserProfile> {
    console.log(`[GoogleAuthService] Starting Google OAuth for ${userType}`);
    this.googleAuthState.isGoogleRegistrationFlow = true;

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });

      // Pause auth state broadcasting to avoid UI flicker while determining final route
      // The AuthService onAuthStateChanged may set a temporary user, so we suppress it now
      try { this.appAuthService.pauseAuthStateChange(); } catch {}

      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      // บางช Google บางรายจะยังไม่เติม photoURL จนกว่าจะ reload โปรไฟล์
      await user.reload();

      if (!user) {
        throw new Error('การยืนยันตัวตนด้วย Google ล้มเหลว');
      }

      const idToken = await user.getIdToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

      // Call backend google-login endpoint
      const googleLoginResp = await this.http
        .post<any>(`${this.backendUrl}/auth/google-login`, { userType }, { headers })
        .toPromise();

      if (!googleLoginResp) {
        throw new Error('Invalid response from google-login');
      }

      // รองรับทั้งรูปแบบ { user: {...} } หรือ {...}
      const rawUser = googleLoginResp.user ? googleLoginResp.user : googleLoginResp;

      // needsProfileSetup อาจอยู่ที่ชั้นบนสุดหรือใน user
      const needsSetupResp = googleLoginResp.needsProfileSetup ?? googleLoginResp.needs_profile_setup;
      const needsProfileSetupCalc = needsSetupResp !== undefined
        ? needsSetupResp
        : rawUser.needsProfileSetup ?? rawUser.needs_profile_setup ?? false;

      const userProfile: UserProfile = {
        uid: rawUser.uid || user.uid,
        id: rawUser.id,
        email: rawUser.email || user.email || '',
        username: rawUser.username || '',
        displayName: rawUser.displayName || rawUser.display_name || user.displayName || null,
        photoURL: rawUser.photoURL || rawUser.photo_url || user.photoURL || null,
        memberType: rawUser.memberType || rawUser.member_type || userType,
        needsProfileSetup: needsProfileSetupCalc,
        phoneNumber: rawUser.phoneNumber || rawUser.phone_number || null,
        residenceDormId: rawUser.residenceDormId || rawUser.residence_dorm_id || null,
        provider: 'google',
        managerName: rawUser.managerName || rawUser.manager_name || null,
        secondaryPhone: rawUser.secondaryPhone || rawUser.secondary_phone || null,
        lineId: rawUser.lineId || rawUser.line_id || null,
      };

      console.log('[GoogleAuthService] Google sign-in result:', {
        needsProfileSetup: userProfile.needsProfileSetup,
        memberType: userProfile.memberType,
        requestedUserType: userType,
        hasManagerName: !!userProfile.managerName,
        hasPhoneNumber: !!userProfile.phoneNumber,
      });

      // Safeguard FIRST: if backend returned success but memberType ≠ requested type → block login
      if (!userProfile.needsProfileSetup && userProfile.memberType !== userType) {
        // Sign out and navigate to public main (not logged in)
        const thaiRole = userProfile.memberType === 'owner' ? 'เจ้าของหอพัก' : 'สมาชิก';
        try {
          await this.signOutGoogleUser();
        } finally {
          await this.router.navigate(['/main']);
        }
        throw new Error(`บัญชีนี้ถูกลงทะเบียนเป็น${thaiRole}แล้ว`);
      }

      // Handle routing based on profile completeness (only when type matches or setup required)
      if (!userProfile.needsProfileSetup) {
        console.log('[GoogleAuthService] User has complete profile, redirecting to dashboard');
        this.googleAuthState.isGoogleRegistrationFlow = false;

        if (userProfile.memberType === 'owner') {
          await this.router.navigate(['/owner']);
        } else {
          await this.router.navigate(['/main']);
        }
      } else {
        console.log('[GoogleAuthService] User needs profile setup, redirecting to registration');
        this.router.navigate(['/register', userType], {
          queryParams: { fromGoogle: 'true', userType },
          state: {
            fullName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            userType: userType,
            isFromGoogle: true,
          },
          replaceUrl: true,
        });
      }

      try { this.appAuthService.resumeAuthStateChange(); } catch {}

      return userProfile;
    } catch (error: any) {
      this.googleAuthState.isGoogleRegistrationFlow = false;
      
      try {
        await signOut(this.auth);
      } catch (signOutError) {
        console.warn('[GoogleAuthService] Error during cleanup signOut:', signOutError);
      }
      
      throw error;
    }
  }

  /**
   * ดึงข้อมูลพื้นฐานจาก Google สำหรับ registration form (ไม่ต้องสมัครจริง)
   */
  async getGoogleUserInfo(userType: 'member' | 'owner'): Promise<{
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null> {
    try {
      // เซ็ต flag เพื่อป้องกันการจัดการ auth state
      this.googleAuthState.isGoogleRegistrationFlow = true;
      this.googleAuthState.isTemporaryGoogleUser = true;

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      // ไม่ signOut เพื่อให้ session ค้างไว้สำหรับ registration flow
      // ข้อมูลจะถูกดึงจาก currentUser$ หรือ auth.currentUser หลังรีเฟรช

      return {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
    } catch (error: any) {
      console.error('[GoogleAuthService] Error getting Google user info:', error);
      // รีเซ็ต flags เมื่อเกิด error
      this.googleAuthState.isGoogleRegistrationFlow = false;
      this.googleAuthState.isTemporaryGoogleUser = false;
            throw error;
        }
    }

  /**
   * อัปเดตโปรไฟล์ผู้ใช้หลัง Google OAuth (สำหรับ needsProfileSetup = true)
   */
    async completeGoogleUserProfile(
        phoneNumber: string | undefined, 
        userType: 'member' | 'owner', 
        dormitoryId?: number,
        ownerData?: {
            managerName: string;
            secondaryPhone?: string;
            lineId?: string;
        }
    ): Promise<UserProfile> {
    this.googleAuthState.isRegistrationInProgress = true;
    this.googleAuthState.isGoogleRegistrationFlow = false;
    this.googleAuthState.isTemporaryGoogleUser = false;

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.router.navigate(['/main']);
      throw new Error('ไม่พบผู้ใช้ที่ล็อกอินในระบบ กรุณาทำรายการใหม่อีกครั้ง');
    }

    try {
      const idToken = await currentUser.getIdToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

      const payload: any = {
        userType: userType,
      };

      // เพิ่ม phoneNumber เฉพาะเมื่อมีค่า
      if (phoneNumber) {
        payload.phoneNumber = phoneNumber;
      }

      if (userType === 'member' && dormitoryId) {
        payload.dormitoryId = dormitoryId;
      }

      // Add owner data if present
      if (userType === 'owner' && ownerData) {
        payload.managerName = ownerData.managerName;
        if (ownerData.secondaryPhone) {
          payload.secondaryPhone = ownerData.secondaryPhone;
        }
        if (ownerData.lineId) {
          payload.lineId = ownerData.lineId;
        }
      }

      const rawResponse = await this.http
        .put<any>(`${this.backendUrl}/auth/me`, payload, { headers })
        .toPromise();

      const userProfile: UserProfile = {
        uid: rawResponse.uid,
        id: rawResponse.id,
        email: rawResponse.email,
        username: rawResponse.username || '',
        displayName: rawResponse.display_name || rawResponse.displayName || null,
        photoURL: rawResponse.photoURL || rawResponse.photo_url || null,
        memberType: userType,
        needsProfileSetup: false,
        phoneNumber: rawResponse.phone_number || null,
        residenceDormId: rawResponse.residence_dorm_id || null,
        provider: 'google',
        member_type: rawResponse.member_type || null,
        secondaryPhone: rawResponse.secondary_phone || rawResponse.secondaryPhone || null,
        lineId: rawResponse.line_id || rawResponse.lineId || null,
        managerName: rawResponse.manager_name || rawResponse.managerName || null,
        secondary_phone: rawResponse.secondary_phone || null,
        line_id: rawResponse.line_id || null,
        manager_name: rawResponse.manager_name || null,
      };

      return userProfile;
    } catch (error: any) {
      // ไม่ต้อง signOut เมื่อเกิด error ใน completeUserProfile
      // เพราะ user อาจจะยัง login อยู่
      console.error('[GoogleAuthService] Error in completeGoogleUserProfile:', error);
      throw error;
    } finally {
      this.googleAuthState.isRegistrationInProgress = false;
    }
  }

  /**
   * ตรวจสอบว่าอยู่ในสถานะ Google registration flow หรือไม่
   */
    isInGoogleRegistrationFlow(): boolean {
    return this.googleAuthState.isGoogleRegistrationFlow;
  }

  /**
   * ตั้งค่าสถานะ Google registration flow
   */
  setGoogleRegistrationFlow(value: boolean): void {
    this.googleAuthState.isGoogleRegistrationFlow = value;
  }

  /**
   * ตรวจสอบว่าเป็น temporary user หรือไม่
   */
  isTemporaryUser(): boolean {
    return this.googleAuthState.isTemporaryGoogleUser;
  }

  /**
   * รีเซ็ต Google auth state flags
   */
  resetGoogleAuthState(): void {
    this.googleAuthState.isGoogleRegistrationFlow = false;
    this.googleAuthState.isRegistrationInProgress = false;
    this.googleAuthState.isTemporaryGoogleUser = false;
  }

  /**
   * Sign out Google user with cleanup
   */
  async signOutGoogleUser(): Promise<void> {
    try {
      this.resetGoogleAuthState();
      await signOut(this.auth);
    } catch (error) {
      console.error('[GoogleAuthService] Error signing out Google user:', error);
      throw error;
    }
  }

  /**
   * Error message handler สำหรับ Google Auth
   */
  errorMessageHandler(error: any): string {
    // Firebase authentication errors
    if (error.code) {
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          return 'การยืนยันถูกยกเลิก กรุณาลองอีกครั้ง';
        case 'auth/cancelled-popup-request':
          return 'มีการขอเปิดหน้าต่างซ้ำ กรุณาลองอีกครั้ง';
        case 'auth/popup-blocked':
          return 'หน้าต่างยืนยันตัวตนถูกบล็อค กรุณาอนุญาตป๊อปอัพจากเว็บไซต์นี้';
        case 'auth/network-request-failed':
          return 'เกิดปัญหาการเชื่อมต่อเครือข่าย กรุณาตรวจสอบอินเทอร์เน็ตและลองอีกครั้ง';
        case 'auth/too-many-requests':
          return 'มีการพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณาลองใหม่ในภายหลัง';
        default:
          return `เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google: ${error.message}`;
      }
    }

    // Custom error messages from our backend
    if (error.message) {
      if (error.message.includes('owner')) {
        return 'บัญชีนี้ถูกลงทะเบียนเป็นเจ้าของหอพักแล้ว';
      }
      if (error.message.includes('member')) {
        return 'บัญชีนี้ถูกลงทะเบียนเป็นสมาชิกแล้ว';
      }
      return error.message;
    }

    // Generic error
    return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองอีกครั้ง';
    }
}