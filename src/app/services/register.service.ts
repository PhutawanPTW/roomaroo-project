import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { 
  Auth, 
  createUserWithEmailAndPassword, 
  updateProfile,
  deleteUser,
  signOut,
  User
} from '@angular/fire/auth';
import { environment } from '../../environments/environment';

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

export interface DormitoryOption {
  dorm_id: number;
  dorm_name: string;
  address: string;
  monthly_price: number;
  zone_name: string;
  zone_id: number;
}

export interface ZoneOption {
  zone_id: number;
  zone_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegisterService {
  private backendUrl = environment.backendApiUrl;

  // Registration state management
  private registrationState = {
    isRegistrationInProgress: false
  };

  constructor(
    private http: HttpClient,
    private auth: Auth,
    private router: Router
  ) {}

  /**
   * สมัครสมาชิกด้วยข้อมูลจาก FormData (รองรับการอัปโหลดไฟล์)
   */
  async signUpWithFormData(formData: FormData): Promise<UserProfile> {
    this.registrationState.isRegistrationInProgress = true;

    try {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const userType = formData.get('memberType') as 'member' | 'owner';
      const fullName = formData.get('fullName') as string;
      const phoneNumber = formData.get('phoneNumber') as string;
      const dormitoryId = formData.get('dormitoryId') as string;
      const profileImage = formData.get('profileImage') as File;

      // *** เพิ่มการอ่านข้อมูล owner ***
      const managerName = formData.get('managerName') as string;
      const secondaryPhone = formData.get('secondaryPhone') as string;
      const lineId = formData.get('lineId') as string;

      // ปรับปรุงการตรวจสอบข้อมูล: owner ต้องมี managerName
      const requiredFields = userType === 'owner'
        ? [email, password, userType, fullName, managerName] // เพิ่ม managerName เป็น required
        : [email, password, userType, fullName, phoneNumber];

      if (requiredFields.some(field => !field)) {
        throw new Error(
          userType === 'owner'
            ? 'Missing required registration data: email, password, fullName, and managerName are required for owners'
            : 'Missing required registration data: email, password, fullName, and phoneNumber are required for members'
        );
      }

      // สร้างบัญชี Firebase
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName: fullName });
      const idToken = await firebaseUser.getIdToken();

      // เตรียมข้อมูลสำหรับส่งไป backend
      const submitFormData = new FormData();
      submitFormData.append('email', firebaseUser.email || '');
      submitFormData.append('fullName', fullName);
      submitFormData.append('memberType', userType);

      // เพิ่มเบอร์โทรเฉพาะเมื่อมีค่า
      if (phoneNumber) {
        submitFormData.append('phoneNumber', phoneNumber);
      }

      // *** เพิ่มข้อมูล owner ***
      if (userType === 'owner') {
        submitFormData.append('managerName', managerName);
        if (secondaryPhone) {
          submitFormData.append('secondaryPhone', secondaryPhone);
        }
        if (lineId) {
          submitFormData.append('lineId', lineId);
        }
      }

      // แก้ไข: ใช้ dormitoryId แทน dormitory
      if (userType === 'member' && dormitoryId) {
        submitFormData.append('dormitoryId', dormitoryId);
      }

      if (profileImage) {
        submitFormData.append('profileImage', profileImage);
      }

      const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

      const rawResponse = await this.http
        .post<any>(`${this.backendUrl}/auth/register`, submitFormData, { headers })
        .toPromise();

      console.log('[RegisterService] Backend registration response:', rawResponse);

      if (!rawResponse || !rawResponse.user) {
        throw new Error('Backend registration response is incomplete or invalid.');
      }

      const userProfile: UserProfile = this.mapBackendResponseToUserProfile(
        rawResponse.user, 
        firebaseUser, 
        userType
      );

      console.log('[RegisterService] Created user profile:', {
        memberType: userProfile.memberType,
        needsProfileSetup: userProfile.needsProfileSetup,
        managerName: userProfile.managerName,
        provider: userProfile.provider,
      });

      // รอสักครู่เพื่อให้ currentUser$ ได้รับการอัปเดต
      await new Promise(resolve => {
        const timeoutId = window.setTimeout(resolve, 100);
      });

      // Add safeguard: if backend returned success but memberType ≠ requested type → block login
      if (!userProfile.needsProfileSetup && userProfile.memberType !== userType) {
        await this.auth.signOut();
        const thaiRole = userProfile.memberType === 'owner' ? 'เจ้าของหอพัก' : 'สมาชิก';
        throw new Error(`บัญชีนี้ถูกลงทะเบียนเป็น${thaiRole}แล้ว`);
      }

      return userProfile;
    } catch (error: any) {
      throw error;
    } finally {
      this.registrationState.isRegistrationInProgress = false;
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
    this.registrationState.isRegistrationInProgress = true;

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.router.navigate(['/main']);
      throw new Error('ไม่พบผู้ใช้ที่ล็อกอินในระบบ กรุณาทำรายการใหม่อีกครั้ง');
    }

    try {
      const idToken = await currentUser.getIdToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

      const payload: any = { userType };
      if (phoneNumber) payload.phoneNumber = phoneNumber;
      if (userType === 'member' && dormitoryId) payload.dormitoryId = dormitoryId;
      if (userType === 'owner' && ownerData) {
        payload.managerName = ownerData.managerName;
        if (ownerData.secondaryPhone) payload.secondaryPhone = ownerData.secondaryPhone;
        if (ownerData.lineId) payload.lineId = ownerData.lineId;
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
      // ✅ Cleanup: ลบ Firebase User ถ้า Backend profile completion ล้มเหลว
      if (currentUser) {
        try {
          console.log('[RegisterService] Backend profile completion failed, cleaning up Firebase user');
          await deleteUser(currentUser);
          console.log('[RegisterService] Firebase user deleted successfully');
        } catch (deleteError: any) {
          console.error('[RegisterService] Failed to cleanup Firebase user:', deleteError);
          // ไม่ throw deleteError เพื่อให้ original error ถูกส่งต่อไป
        }
      }
      throw error;
    } finally {
      this.registrationState.isRegistrationInProgress = false;
    }
  }

  /**
   * สมัครสมาชิกด้วย Email/Password (ไม่มีการอัปโหลดไฟล์)
   */
  async signUpWithEmail(
    email: string,
    password: string,
    memberType: 'member' | 'owner',
    fullName: string,
    phoneNumber: string | undefined,
    dormitoryId?: number
  ): Promise<void> {
    this.registrationState.isRegistrationInProgress = true;
    let firebaseUser: User | null = null;

    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName: fullName });
      const idToken = await firebaseUser.getIdToken();

      // ✅ ตัดข้อมูลให้ไม่เกิน 255 ตัวอักษร เพื่อป้องกัน Backend error
      const truncateString = (str: string, maxLength: number = 255): string => {
        return str && str.length > maxLength ? str.substring(0, maxLength) : str;
      };

      const payload: any = {
        email: firebaseUser.email,
        fullName: truncateString(fullName, 255),
        memberType: memberType,
      };

      // เพิ่ม phoneNumber เฉพาะเมื่อมีค่า
      if (phoneNumber) {
        payload.phoneNumber = truncateString(phoneNumber, 20); // เบอร์โทรไม่ควรยาวมาก
      }

      // ส่ง dormitoryId เฉพาะเมื่อเป็น member และมีค่า
      if (memberType === 'member' && dormitoryId) {
        payload.dormitoryId = dormitoryId;
      }

      const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

      const rawResponse = await this.http
        .post<any>(`${this.backendUrl}/auth/register`, payload, { headers })
        .toPromise();

      if (!rawResponse || !rawResponse.user) {
        throw new Error('Backend registration response is incomplete or invalid.');
      }

      const isOwner = (rawResponse.user.memberType as string) === 'owner' || 
                      (rawResponse.user.member_type as string) === 'owner';

      // Navigate to appropriate dashboard
      if (isOwner) {
        this.router.navigate(['/owner']);
      } else {
        this.router.navigate(['/main']);
      }
    } catch (error: any) {
      console.error('[RegisterService] Backend registration failed:', error);
      
      // ✅ Cleanup: ลบ Firebase User ถ้า Backend registration ล้มเหลว
      if (firebaseUser) {
        try {
          console.log('[RegisterService] Backend registration failed, cleaning up Firebase user:', firebaseUser.uid);
          
          // ตรวจสอบว่า user ยังอยู่ใน Firebase หรือไม่
          await firebaseUser.reload();
          console.log('[RegisterService] Firebase user still exists, proceeding with deletion');
          
          await deleteUser(firebaseUser);
          console.log('[RegisterService] Firebase user deleted successfully');
        } catch (deleteError: any) {
          console.error('[RegisterService] Failed to cleanup Firebase user:', deleteError);
          
          // ถ้า delete ไม่ได้ ให้ลอง sign out แทน
          try {
            console.log('[RegisterService] Attempting to sign out instead');
            await signOut(this.auth);
            console.log('[RegisterService] Signed out successfully');
          } catch (signOutError) {
            console.error('[RegisterService] Sign out also failed:', signOutError);
          }
        }
      } else {
        console.log('[RegisterService] No Firebase user to cleanup');
      }
      
      throw error;
    } finally {
      this.registrationState.isRegistrationInProgress = false;
    }
  }

  /**
   * อัปโหลดรูปโปรไฟล์ของเจ้าของหอพัก
   */
  async uploadOwnerImage(file: File, firebaseUid: string): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('firebase_uid', firebaseUid);

    try {
      const response: any = await this.http
        .post(`${this.backendUrl}/owner/upload-image`, formData)
        .toPromise();

      if (response && response.imageUrl) {
        return response.imageUrl;
      } else {
        throw new Error('No imageUrl returned from backend');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * ตรวจสอบข้อมูลผู้ใช้ที่มีอยู่แล้วจากอีเมล
   */
  async checkExistingUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const response = await this.http
        .get<any>(`${this.backendUrl}/auth/check-user/${encodeURIComponent(email)}`)
        .toPromise();

      if (response && response.user) {
        const user = response.user;
        return {
          uid: user.uid,
          id: user.id,
          email: user.email,
          username: user.username || '',
          displayName: user.display_name || user.displayName || null,
          photoURL: user.photo_url || user.photoURL || null,
          memberType: user.member_type || user.memberType || 'member',
          needsProfileSetup: user.needs_profile_setup || user.needsProfileSetup || false,
          phoneNumber: user.phone_number || user.phoneNumber || null,
          residenceDormId: user.residence_dorm_id || user.residenceDormId || null,
          provider: user.provider || 'google',
          secondaryPhone: user.secondary_phone || user.secondaryPhone || null,
          lineId: user.line_id || user.lineId || null,
          managerName: user.manager_name || user.managerName || null,
          secondary_phone: user.secondary_phone || null,
          line_id: user.line_id || null,
          manager_name: user.manager_name || null,
        };
      }
      return null;
    } catch (error) {
      console.error('[RegisterService] Error checking existing user:', error);
      return null;
    }
  }

  /**
   * ดึงรายการหอพักตาม zoneId (ถ้ามี)
   */
  async getDormitoryOptions(zoneId?: number): Promise<DormitoryOption[]> {
    try {
      let url = `${this.backendUrl}/dormitories`;
      if (zoneId !== undefined) {
        url += `?zoneId=${zoneId}`;
      }
      const response = await this.http.get<DormitoryOption[]>(url).toPromise();
      return response || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * ดึงรายการโซน
   */
  async getZoneOptions(): Promise<ZoneOption[]> {
    try {
      const response = await this.http.get<ZoneOption[]>(`${this.backendUrl}/zones`).toPromise();
      return response || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * เลือกหอพัก (ใช้ทีหลัง)
   */
  async selectDormitory(dormitoryId: number): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('ไม่พบผู้ใช้ที่ล็อกอินในระบบ');
      }

      const idToken = await currentUser.getIdToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

      await this.http
        .put(`${this.backendUrl}/dormitories/select`, { dormId: dormitoryId }, { headers })
        .toPromise();

    } catch (error) {
      throw error;
    }
  }

  /**
   * ตรวจสอบว่ากำลังอยู่ในสถานะลงทะเบียนหรือไม่
   */
  isRegistrationInProgress(): boolean {
    return this.registrationState.isRegistrationInProgress;
  }

  /**
   * Mapper helper: แปลง backend response เป็น UserProfile
   */
  private mapBackendResponseToUserProfile(
    backendUser: any, 
    firebaseUser: any, 
    userType: 'member' | 'owner'
  ): UserProfile {
    return {
      uid: backendUser.uid,
      id: backendUser.id,
      email: backendUser.email,
      username: backendUser.username || '',
      displayName: backendUser.displayName || backendUser.display_name || null,
      photoURL: backendUser.photoURL || backendUser.photo_url || null,
      memberType: backendUser.memberType || backendUser.member_type || userType,
      needsProfileSetup: false, // หลังสมัครเสร็จแล้ว ให้เป็น false เสมอ
      phoneNumber: backendUser.phoneNumber || backendUser.phone_number || null,
      businessName: backendUser.businessName || backendUser.business_name || null,
      businessAddress: backendUser.businessAddress || backendUser.business_address || null,
      businessRegistration: backendUser.businessRegistration || backendUser.business_registration || null,
      residenceDormId: backendUser.residenceDormId || backendUser.residence_dorm_id || null,
      provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
      member_type: backendUser.member_type || null,
      // *** เพิ่ม fields ใหม่สำหรับ owner ***
      lineId: backendUser.lineId || backendUser.line_id || null,
      secondaryPhone: backendUser.secondaryPhone || backendUser.secondary_phone || null,
      managerName: backendUser.managerName || backendUser.manager_name || null,
    };
  }

  /**
   * Error message handler สำหรับ Registration
   */
  errorMessageHandler(error: any): string {
    // Firebase authentication errors
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'อีเมลนี้ถูกใช้งานแล้ว';
        case 'auth/invalid-email':
          return 'รูปแบบอีเมลไม่ถูกต้อง';
        case 'auth/weak-password':
          return 'รหัสผ่านไม่ปลอดภัย กรุณาใช้รหัสผ่านที่มีความยาวอย่างน้อย 6 ตัวอักษร';
        case 'auth/network-request-failed':
          return 'เกิดปัญหาการเชื่อมต่อเครือข่าย กรุณาตรวจสอบอินเทอร์เน็ตและลองอีกครั้ง';
        default:
          return `เกิดข้อผิดพลาดในการสมัครสมาชิก: ${error.message}`;
      }
    }

    // Backend API errors
    if (error.status) {
      switch (error.status) {
        case 400:
          return error.error?.message || 'ข้อมูลไม่ถูกต้อง';
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

    // Custom error messages from our backend or registration flow
    if (error.message) {
      if (error.message.includes('อีเมล') && error.message.includes('ใช้งานแล้ว')) {
        return 'อีเมลนี้ถูกใช้งานแล้ว';
      }
      return error.message;
    }

    // Generic error
    return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองอีกครั้ง';
  }
}