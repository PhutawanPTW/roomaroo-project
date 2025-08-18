import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of, Subject } from 'rxjs';
import { switchMap, tap, catchError, map, filter } from 'rxjs/operators';
import { Auth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, updateProfile, user, User, createUserWithEmailAndPassword, onAuthStateChanged } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';

export interface UserProfile {
    uid: string;
    id: number;
    email: string;
    username: string;
    displayName: string | null;
    photoURL?: string | null;
    memberType: 'member' | 'owner';  // แก้ไขให้ไม่มี null ป้องกัน TypeScript error
    needsProfileSetup: boolean;
    phoneNumber?: string | null;
    businessName?: string | null;
    businessAddress?: string | null;
    businessRegistration?: string | null;
    residenceDormId?: string | null;
    provider?: 'google' | 'password';
    // เพิ่ม property ที่อาจมาจาก backend ด้วย snake_case ถ้า backend ยังไม่ถูกแก้
    display_name?: string | null;
    member_type?: 'member' | 'owner';  // แก้ไขให้ไม่มี null ป้องกัน TypeScript error
    // Add new owner fields
    secondaryPhone?: string | null;
    lineId?: string | null;
    managerName?: string | null;
    // Add snake_case variants
    secondary_phone?: string | null;
    line_id?: string | null;
    manager_name?: string | null;
}

// เพิ่ม interface สำหรับ dormitory
export interface DormitoryOption {
    dorm_id: number;
    dorm_name: string;
    address: string;
    monthly_price: number;
    zone_name: string;
    zone_id: number;  // Add zone_id property
}

// Interface สำหรับ zone
export interface ZoneOption {
    zone_id: number;
    zone_name: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private backendUrl = 'http://localhost:3000/api';
    public currentUser$ = new BehaviorSubject<UserProfile | null | undefined>(undefined);
    
    // เพิ่ม flag เพื่อติดตามสถานะการโหลด auth state
    private authStateInitialized = false;
    private authStatePromise: Promise<void> | null = null;
    
    // Define user types to avoid TypeScript errors
    private readonly USER_TYPE_OWNER: 'owner' = 'owner';
    private readonly USER_TYPE_MEMBER: 'member' = 'member';

    // Add flag to track if we're in the middle of Google OAuth registration flow
    private isGoogleRegistrationFlow = false;

    // *** เพิ่ม flag สำหรับป้องกัน race condition ระหว่าง registration ***
    private isRegistrationInProgress = false;

    // เพิ่ม flag เพื่อป้องกันการ redirect เมื่อมี error
    private skipAuthStateChange = false;

    // เพิ่ม flag เพื่อติดตามสถานะการ refresh token
    private isRefreshingToken = false;
    private tokenRefreshPromise: Promise<string> | null = null;

    // เพิ่ม flag เพื่อติดตามสถานะผู้ใช้ชั่วคราวจาก Google
    private isTemporaryGoogleUser = false;

    constructor(
        private http: HttpClient,
        private auth: Auth,
        private router: Router
    ) {
        this.initializeAuthState();
    }

    // เพิ่ม method สำหรับ initialize auth state
    private initializeAuthState(): void {
        if (this.authStatePromise) {
            return; // กำลัง initialize อยู่แล้ว
        }

        this.authStatePromise = new Promise<void>((resolve) => {
            onAuthStateChanged(this.auth, async (user) => {
                console.log('[AuthService] Auth state changed:', user ? 'User found' : 'No user');
                
                if (this.isGoogleRegistrationFlow) {
                    console.log('[AuthService] Skipping auth state change - Google registration flow');
                    return;
                }

                // *** เพิ่มการ skip เมื่อกำลัง registration ***
                if (this.isRegistrationInProgress) {
                    console.log('[AuthService] Skipping auth state change - Registration in progress');
                    return;
                }

                if (this.skipAuthStateChange) {
                    console.log('[AuthService] Skipping auth state change - Skip flag set');
                    this.skipAuthStateChange = false;
                    return;
                }

                // ป้องกันการจัดการ temporary Google user
                if (this.isTemporaryGoogleUser) {
                    console.log('[AuthService] Skipping auth state change - Temporary Google user');
                    return;
                }

                try {
                    if (user) {
                        console.log('[AuthService] Fetching user profile for:', user.email);
                        const profile = await this.fetchUserProfile(user);
                        console.log('[AuthService] User profile fetched:', profile);
                        this.currentUser$.next(profile);
                    } else {
                        console.log('[AuthService] No user, setting currentUser$ to null');
                        this.currentUser$.next(null);
                    }
                } catch (error) {
                    console.error('[AuthService] Error in auth state change:', error);
                    // ไม่ set currentUser$ เป็น null เมื่อเกิด error เพื่อป้องกันการ redirect
                    // ให้รอให้ auth state ถูกต้องก่อน
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

        // ถ้ากำลัง refresh token อยู่แล้ว ให้รอ promise เดิม
        if (this.isRefreshingToken && this.tokenRefreshPromise) {
            return this.tokenRefreshPromise;
        }

        // สร้าง promise ใหม่สำหรับ refresh token
        this.isRefreshingToken = true;
        this.tokenRefreshPromise = new Promise<string>((resolve, reject) => {
            try {
                currentUser.getIdToken(forceRefresh)
                    .then(token => {
                        resolve(token);
                    })
                    .catch(error => {
                        reject(error);
                    })
                    .finally(() => {
                        this.isRefreshingToken = false;
                        this.tokenRefreshPromise = null;
                    });
            } catch (error) {
                this.isRefreshingToken = false;
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
            
            const response = await this.http.get<{valid: boolean}>(`${this.backendUrl}/auth/verify-token`, { headers }).toPromise();
            return response?.valid || false;
        } catch (error) {
            return false;
        }
    }

    async signUpWithFormData(formData: FormData): Promise<UserProfile> {
        // *** เซ็ต flag ป้องกัน race condition ***
        this.isRegistrationInProgress = true;
        this.isGoogleRegistrationFlow = false;
        this.isTemporaryGoogleUser = false; // reset flag เมื่อบันทึกข้อมูลจริง
    
        try {
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            // อ่านค่า memberType จากฟอร์ม (path param ถูกส่งมาเป็น memberType)
            const userType = formData.get('memberType') as 'member' | 'owner';
            const fullName = formData.get('fullName') as string;
            const phoneNumber = formData.get('phoneNumber') as string;
            // แก้ไข: ใช้ dormitoryId แทน dormitory
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
                throw new Error(userType === 'owner' 
                    ? 'Missing required registration data: email, password, fullName, and managerName are required for owners'
                    : 'Missing required registration data: email, password, fullName, and phoneNumber are required for members');
            }
    
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const firebaseUser = userCredential.user;
    
            await updateProfile(firebaseUser, { displayName: fullName });
    
            const idToken = await firebaseUser.getIdToken();
    
            const submitFormData = new FormData();
            submitFormData.append('email', firebaseUser.email || '');
            submitFormData.append('fullName', fullName);
            // ส่ง memberType ให้ backend
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
    
            const rawResponse = await this.http.post<any>(`${this.backendUrl}/auth/register`, submitFormData, { headers }).toPromise();

            console.log('[AuthService] Backend registration response:', rawResponse);
    
            if (!rawResponse || !rawResponse.user) {
                throw new Error('Backend registration response is incomplete or invalid.');
            }
    
            const userProfile: UserProfile = {
                uid: rawResponse.user.uid,
                id: rawResponse.user.id,
                email: rawResponse.user.email,
                username: rawResponse.user.username || '',
                displayName: rawResponse.user.displayName || rawResponse.user.display_name || null,
                photoURL: rawResponse.user.photoURL || rawResponse.user.photo_url || null,
                memberType: rawResponse.user.memberType || rawResponse.user.member_type || userType,
                needsProfileSetup: rawResponse.user.needsProfileSetup || false,
                phoneNumber: rawResponse.user.phoneNumber || rawResponse.user.phone_number || null,
                businessName: rawResponse.user.businessName || rawResponse.user.business_name || null,
                businessAddress: rawResponse.user.businessAddress || rawResponse.user.business_address || null,
                businessRegistration: rawResponse.user.businessRegistration || rawResponse.user.business_registration || null,
                residenceDormId: rawResponse.user.residenceDormId || rawResponse.user.residence_dorm_id || null,
                provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
                member_type: rawResponse.user.member_type || null,
                // *** เพิ่ม fields ใหม่สำหรับ owner ***
                lineId: rawResponse.user.lineId || rawResponse.user.line_id || null,
                secondaryPhone: rawResponse.user.secondaryPhone || rawResponse.user.secondary_phone || null,
                managerName: rawResponse.user.managerName || rawResponse.user.manager_name || null,
            };

            console.log('[AuthService] Created user profile:', {
                memberType: userProfile.memberType,
                needsProfileSetup: userProfile.needsProfileSetup,
                managerName: userProfile.managerName,
                provider: userProfile.provider
            });
    
            // อัปเดต currentUser$
            this.currentUser$.next(userProfile);
            
            // Force refresh navbar โดยการ emit user profile อีกครั้ง
            setTimeout(() => {
                this.currentUser$.next(userProfile);
            }, 100);
    
            // รอสักครู่เพื่อให้ currentUser$ ได้รับการอัปเดต
            await new Promise(resolve => setTimeout(resolve, 200));
    
            // Add safeguard: if backend returned success but memberType ≠ requested type → block login
            if (!userProfile.needsProfileSetup && userProfile.memberType !== userType) {
                await this.signOut(null);
    
                const thaiRole = userProfile.memberType === 'owner' ? 'เจ้าของหอพัก' : 'สมาชิก';
                throw new Error(`บัญชีนี้ถูกลงทะเบียนเป็น${thaiRole}แล้ว`);
            }
    
            return userProfile;
        } catch (error: any) {
            this.isTemporaryGoogleUser = false; // reset flag เมื่อเกิด error
            throw error;
        } finally {
            // *** รีเซ็ต flag เมื่อเสร็จสิ้น ***
            this.isRegistrationInProgress = false;
        }
    }

    // แก้ไข method completeUserProfile ให้รองรับกรณี phoneNumber เป็น undefined สำหรับ owner
    async completeUserProfile(
        phoneNumber: string | undefined, 
        userType: 'member' | 'owner', 
        dormitoryId?: number,
        ownerData?: {
            managerName: string;
            secondaryPhone?: string;
            lineId?: string;
        }
    ): Promise<UserProfile> {
        // *** เซ็ต flag ป้องกัน race condition ***
        this.isRegistrationInProgress = true;
        this.isGoogleRegistrationFlow = false;
        this.isTemporaryGoogleUser = false;

        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            this.router.navigate(['/main']);
            throw new Error('ไม่พบผู้ใช้ที่ล็อกอินในระบบ กรุณาทำรายการใหม่อีกครั้ง');
        }

        try {
            const idToken = await currentUser.getIdToken();
            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

            const payload: any = {
                userType: userType
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

            const rawResponse = await this.http.put<any>(`${this.backendUrl}/auth/me`, payload, { headers }).toPromise();

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
                // Add owner fields
                secondaryPhone: rawResponse.secondary_phone || rawResponse.secondaryPhone || null,
                lineId: rawResponse.line_id || rawResponse.lineId || null,
                managerName: rawResponse.manager_name || rawResponse.managerName || null,
                // Add snake_case variants
                secondary_phone: rawResponse.secondary_phone || null,
                line_id: rawResponse.line_id || null,
                manager_name: rawResponse.manager_name || null
            };

            this.currentUser$.next(userProfile);
            
            // Force refresh navbar โดยการ emit user profile อีกครั้ง
            setTimeout(() => {
                this.currentUser$.next(userProfile);
            }, 100);

            return userProfile;
        } catch (error: any) {
            try {
                await signOut(this.auth);
            } catch (signOutError) {
            }
            throw error;
        } finally {
            // *** รีเซ็ต flag เมื่อเสร็จสิ้น ***
            this.isRegistrationInProgress = false;
        }
    }

    async signInWithGoogle(userType: 'member' | 'owner'): Promise<UserProfile> {
        this.isGoogleRegistrationFlow = true;
    
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
    
            provider.setCustomParameters({ prompt: 'select_account' });
    
            const result = await signInWithPopup(this.auth, provider);
            const user = result.user;
    
            if (!user) {
                throw new Error('การยืนยันตัวตนด้วย Google ล้มเหลว');
            }
    
            const idToken = await user.getIdToken();
            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);
    
            // Call backend google-login endpoint
            const googleLoginResp = await this.http.post<any>(
                `${this.backendUrl}/auth/google-login`,
                { userType },
                        { headers }
                    ).toPromise();
                    
            if (!googleLoginResp) {
                throw new Error('Invalid response from google-login');
            }
    
            // รองรับทั้งรูปแบบ { user: {...} } หรือ {...}
            const rawUser = googleLoginResp.user ? googleLoginResp.user : googleLoginResp;
    
            // needsProfileSetup อาจอยู่ที่ชั้นบนสุดหรือใน user
            const needsSetupResp = googleLoginResp.needsProfileSetup ?? googleLoginResp.needs_profile_setup;
            const needsProfileSetupCalc = needsSetupResp !== undefined ? needsSetupResp : (rawUser.needsProfileSetup ?? rawUser.needs_profile_setup ?? false);
    
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
                // Add owner fields
                managerName: rawUser.managerName || rawUser.manager_name || null,
                secondaryPhone: rawUser.secondaryPhone || rawUser.secondary_phone || null,
                lineId: rawUser.lineId || rawUser.line_id || null
            };
    
            this.currentUser$.next(userProfile);
    
            console.log('[AuthService] Google sign-in result:', {
                needsProfileSetup: userProfile.needsProfileSetup,
                memberType: userProfile.memberType,
                requestedUserType: userType,
                hasManagerName: !!userProfile.managerName,
                hasPhoneNumber: !!userProfile.phoneNumber
            });
            
            // Force refresh navbar โดยการ emit user profile อีกครั้ง
            setTimeout(() => {
                this.currentUser$.next(userProfile);
            }, 100);
    
            // ถ้าผู้ใช้มีข้อมูลครบแล้ว ให้ไป dashboard เลย
            if (!userProfile.needsProfileSetup) {
                console.log('[AuthService] User has complete profile, redirecting to dashboard');
                if (userProfile.memberType === 'owner') {
                    await this.router.navigate(['/owner']);
                } else {
                    await this.router.navigate(['/main']);
                }
            } else {
                // ถ้าผู้ใช้ยังไม่มีข้อมูลครบ ให้ไปหน้า registration
                console.log('[AuthService] User needs profile setup, redirecting to registration');
                this.router.navigate(['/register', userType], {
                    queryParams: { fromGoogle: 'true' },
                    state: {
                        fullName: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        userType: userType,
                        isFromGoogle: true
                    }
                });
            }
    
            // Add safeguard: if backend returned success but memberType ≠ requested type → block login
            if (!userProfile.needsProfileSetup && userProfile.memberType !== userType) {
                await this.signOut(null);

                const thaiRole = userProfile.memberType === 'owner' ? 'เจ้าของหอพัก' : 'สมาชิก';
                throw new Error(`บัญชีนี้ถูกลงทะเบียนเป็น${thaiRole}แล้ว`);
            }
    
            return userProfile;
    
        } catch (error: any) {
            this.isGoogleRegistrationFlow = false;
    
            try {
                await signOut(this.auth);
            } catch (signOutError) {
            }
    
            throw error;
        }
    } 

    // แก้ไข signUpWithEmail method ให้รองรับ dormitoryId และไม่บังคับ phoneNumber สำหรับ owner
    async signUpWithEmail(email: string, password: string, memberType: 'member' | 'owner', fullName: string, phoneNumber: string | undefined, dormitoryId?: number): Promise<void> {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const firebaseUser = userCredential.user;

            await updateProfile(firebaseUser, { displayName: fullName });

            const idToken = await firebaseUser.getIdToken();

            const payload: any = {
                email: firebaseUser.email,
                fullName: fullName,
                memberType: memberType
            };

            // เพิ่ม phoneNumber เฉพาะเมื่อมีค่า
            if (phoneNumber) {
                payload.phoneNumber = phoneNumber;
            }

            // ส่ง dormitoryId เฉพาะเมื่อเป็น member และมีค่า
            if (memberType === 'member' && dormitoryId) {
                payload.dormitoryId = dormitoryId;
            }

            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

            const rawResponse = await this.http.post<any>(`${this.backendUrl}/auth/register`, payload, { headers }).toPromise();

            if (!rawResponse || !rawResponse.user) {
                throw new Error('Backend registration response is incomplete or invalid.');
            }

            const isOwner = (rawResponse.user.memberType as string) === 'owner' || 
                           (rawResponse.user.member_type as string) === 'owner';
            
            if (isOwner) {
                this.router.navigate(['/owner']);
            } else {
                this.router.navigate(['/main']);
            }
        } catch (error: any) {
            throw error;
        }
    }

    async signOut(redirectTo: string | Router | null = null): Promise<void> {
        try {
            // Reset all flags before signing out
        this.isGoogleRegistrationFlow = false;
            this.isRegistrationInProgress = false;
            this.isTemporaryGoogleUser = false;
            this.skipAuthStateChange = true;

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
            console.error('Error signing out:', error);
            throw error;
        }
    }

    async uploadOwnerImage(file: File, firebaseUid: string): Promise<string> {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('firebase_uid', firebaseUid);
        try {
            const response: any = await this.http.post(`${this.backendUrl}/owner/upload-image`, formData).toPromise();
            if (response && response.imageUrl) {
                const current = this.currentUser$.value;
                if (current) {
                    const updated = { ...current, photoURL: response.imageUrl };
                    this.currentUser$.next(updated);
                }
                return response.imageUrl;
            } else {
                throw new Error('No imageUrl returned from backend');
            }
        } catch (error) {
            throw error;
        }
    }

    // เพิ่ม method สำหรับดึงรายการหอพัก
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

    // เพิ่ม method สำหรับเลือกหอพัก (ใช้ทีหลัง)
    async selectDormitory(dormitoryId: number): Promise<void> {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                throw new Error('ไม่พบผู้ใช้ที่ล็อกอินในระบบ');
            }

            const idToken = await currentUser.getIdToken();
            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

            await this.http.put(`${this.backendUrl}/dormitories/select`,
                { dormId: dormitoryId },
                { headers }
            ).toPromise();

            // อัพเดทข้อมูลผู้ใช้ปัจจุบัน
            const profile = await this.fetchUserProfile(currentUser);
            this.currentUser$.next(profile);
        } catch (error) {
            throw error;
        }
    }

    // แก้ไขใน auth.service.ts ใน method fetchUserProfile
    async fetchUserProfile(firebaseUser: User): Promise<UserProfile> {
        try {
            const idToken = await firebaseUser.getIdToken();
            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

            const rawResponse = await this.http.get<any>(`${this.backendUrl}/auth/me`, { headers }).toPromise();

            if (!rawResponse) {
                throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
            }

            // *** แก้ไข: ให้ priority กับ snake_case จาก backend ***
            const memberType = rawResponse.member_type || rawResponse.memberType || null;
            const needsProfileSetup = rawResponse.needs_profile_setup !== undefined
                ? rawResponse.needs_profile_setup
                : (rawResponse.needsProfileSetup || false);

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
                manager_name: rawResponse.manager_name || null
            };

            return userProfile;
        } catch (error: any) {
            throw error;
        }
    }

    // Add signInWithEmail method
    async signInWithEmail(email: string, password: string, expectedUserType: 'member' | 'owner'): Promise<UserProfile> {
        try {
            // ป้องกัน onAuthStateChanged ดึง profileก่อนจะตรวจสอบประเภทผู้ใช้
            this.skipAuthStateChange = true;

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
            // ปลดล็อกให้ onAuthStateChanged กลับมาทำงานตามปกติ
            this.skipAuthStateChange = false;
        }
    }

    // Add errorMessageHandler method
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
                    return 'หน้าต่างยืนยันตัวตนถูกบล็อก กรุณาอนุญาตป๊อปอัพจากเว็บไซต์นี้';
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

    // เพิ่ม method สำหรับดึงรายการโซน
    async getZoneOptions(): Promise<ZoneOption[]> {
        try {
            const response = await this.http.get<ZoneOption[]>(`${this.backendUrl}/zones`).toPromise();
            return response || [];
        } catch (error) {
            throw error;
        }
    }

    // เพิ่มเมธอด checkAuthState เพื่อตรวจสอบสถานะการเข้าสู่ระบบเมื่อแอปเริ่มทำงาน
    async checkAuthState(): Promise<UserProfile | null> {
        console.log('[AuthService] Checking auth state...');
        
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
            // this.currentUser$.next(null);
            return null;
        }
    }

    async getGoogleUserInfo(userType: 'member' | 'owner'): Promise<{
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
    } | null> {
        try {
            // เซ็ต flag เพื่อป้องกันการจัดการ auth state
            this.isGoogleRegistrationFlow = true;
            this.isTemporaryGoogleUser = true;
            this.skipAuthStateChange = true;

            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(this.auth, provider);
            const user = result.user;

            // ถ้าได้ข้อมูลจาก Google สำเร็จ ให้ sign out ทันทีเพื่อไม่ให้เข้าสู่ระบบ
            await this.signOut(null);

            return {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            };
        } catch (error: any) {
            console.error('Error getting Google user info:', error);
            // รีเซ็ต flags เมื่อเกิด error
            this.isGoogleRegistrationFlow = false;
            this.isTemporaryGoogleUser = false;
            this.skipAuthStateChange = false;
            throw error;
        }
    }

    // เพิ่ม method สำหรับตรวจสอบข้อมูลผู้ใช้ที่มีอยู่แล้วจากอีเมล
    async checkExistingUserByEmail(email: string): Promise<UserProfile | null> {
        try {
            const response = await this.http.get<any>(`${this.backendUrl}/auth/check-user/${encodeURIComponent(email)}`).toPromise();
            
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
                    // Add owner fields
                    secondaryPhone: user.secondary_phone || user.secondaryPhone || null,
                    lineId: user.line_id || user.lineId || null,
                    managerName: user.manager_name || user.managerName || null,
                    // Add snake_case variants
                    secondary_phone: user.secondary_phone || null,
                    line_id: user.line_id || null,
                    manager_name: user.manager_name || null
                };
            }
            return null;
        } catch (error) {
            console.error('Error checking existing user:', error);
            return null;
        }
    }

    // เพิ่ม method สำหรับตรวจสอบว่าเป็น temporary user หรือไม่
    isTemporaryUser(): boolean {
        return this.isTemporaryGoogleUser;
    }
}