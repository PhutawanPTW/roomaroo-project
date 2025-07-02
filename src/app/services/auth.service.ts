import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of, Subject } from 'rxjs';
import { switchMap, tap, catchError, map, filter } from 'rxjs/operators';
import { Auth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, updateProfile, user, User, createUserWithEmailAndPassword, onAuthStateChanged } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';

export interface UserProfile {
    uid: string;
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
    public currentUser$ = new BehaviorSubject<UserProfile | null>(null);
    
    // Define user types to avoid TypeScript errors
    private readonly USER_TYPE_OWNER: 'owner' = 'owner';
    private readonly USER_TYPE_MEMBER: 'member' = 'member';

    // Add flag to track if we're in the middle of Google OAuth registration flow
    private isGoogleRegistrationFlow = false;

    // *** เพิ่ม flag สำหรับป้องกัน race condition ระหว่าง registration ***
    private isRegistrationInProgress = false;

    // เพิ่ม flag เพื่อป้องกันการ redirect เมื่อมี error
    private skipAuthStateChange = false;

    constructor(
        private http: HttpClient,
        private auth: Auth,
        private router: Router
    ) {
        console.log('[AuthService] Constructor: Initializing auth state listener.');

        onAuthStateChanged(this.auth, async (user) => {
            if (this.isGoogleRegistrationFlow) {
                console.log('[AuthService] Skipping profile fetch - in Google registration flow');
                return;
            }

            // *** เพิ่มการ skip เมื่อกำลัง registration ***
            if (this.isRegistrationInProgress) {
                console.log('[AuthService] Skipping profile fetch - registration in progress');
                return;
            }

            if (this.skipAuthStateChange) {
                console.log('[AuthService] Skipping auth state change due to skipAuthStateChange flag');
                this.skipAuthStateChange = false;
                return;
            }

            if (user) {
                console.log('[AuthService] Firebase user detected, fetching profile...');
                try {
                    const profile = await this.fetchUserProfile(user);
                    this.currentUser$.next(profile);
                    console.log('[AuthService] User profile loaded:', profile);
                } catch (error) {
                    console.error('[AuthService] Error fetching user profile:', error);
                    this.currentUser$.next(null);
                }
            } else {
                this.currentUser$.next(null);
            }
        });
    }

    async signUpWithFormData(formData: FormData): Promise<UserProfile> {
        // *** เซ็ต flag ป้องกัน race condition ***
        this.isRegistrationInProgress = true;

        try {
            console.log(`[AuthService] Starting FormData sign-up process`);

            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            // อ่านค่า memberType จากฟอร์ม (path param ถูกส่งมาเป็น memberType)
            const userType = formData.get('memberType') as 'member' | 'owner';
            const fullName = formData.get('fullName') as string;
            const phoneNumber = formData.get('phoneNumber') as string;
            // แก้ไข: ใช้ dormitoryId แทน dormitory
            const dormitoryId = formData.get('dormitoryId') as string;
            const profileImage = formData.get('profileImage') as File;

            console.log(`[AuthService] Form data userType: '${userType}', type: ${typeof userType}`);
            // ปรับปรุงการตรวจสอบข้อมูล: owner ไม่จำเป็นต้องมี phoneNumber
            const requiredFields = userType === 'owner' 
                ? [email, password, userType, fullName]
                : [email, password, userType, fullName, phoneNumber];
                
            if (requiredFields.some(field => !field)) {
                console.error('[AuthService] Missing required registration data');
                throw new Error('Missing required registration data');
            }

            console.log(`[AuthService] Starting registration for ${userType} user: ${email}`);

            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const firebaseUser = userCredential.user;
            console.log(`[AuthService] Firebase user created: ${firebaseUser.uid}`);

            await updateProfile(firebaseUser, { displayName: fullName });

            const idToken = await firebaseUser.getIdToken();
            console.log(`[AuthService] Got ID token for user: ${firebaseUser.uid}`);

            const submitFormData = new FormData();
            submitFormData.append('email', firebaseUser.email || '');
            submitFormData.append('fullName', fullName);
            // ส่ง memberType ให้ backend
            submitFormData.append('memberType', userType);
            
            // เพิ่มเบอร์โทรเฉพาะเมื่อมีค่า
            if (phoneNumber) {
            submitFormData.append('phoneNumber', phoneNumber);
            }

            // แก้ไข: ใช้ dormitoryId แทน dormitory
            if (userType === 'member' && dormitoryId) {
                submitFormData.append('dormitoryId', dormitoryId);
                console.log(`[AuthService] Adding dormitory ID for member: ${dormitoryId}`);
            }

            if (profileImage) {
                submitFormData.append('profileImage', profileImage);
                console.log('[AuthService] Profile image included in registration request:', {
                    name: profileImage.name,
                    size: profileImage.size,
                    type: profileImage.type
                });
            }

            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

            console.log(`[AuthService] Sending registration data to backend`);
            const rawResponse = await this.http.post<any>(`${this.backendUrl}/auth/register`, submitFormData, { headers }).toPromise();

            if (!rawResponse || !rawResponse.user) {
                console.error('[AuthService] Backend registration response is invalid');
                throw new Error('Backend registration response is incomplete or invalid.');
            }

            console.log(`[AuthService] Backend registration successful:`, JSON.stringify(rawResponse));

            const userProfile: UserProfile = {
                uid: rawResponse.user.uid,
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
            };

            // อัปเดต currentUser$
            this.currentUser$.next(userProfile);
            console.log('[AuthService] Updated currentUser$ with:', userProfile);

            // รอสักครู่เพื่อให้ currentUser$ ได้รับการอัปเดต
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log('[AuthService] Registration completed - returning userProfile to component');

            // Add safeguard: if backend returned success but memberType ≠ requested type → block login
            if (!userProfile.needsProfileSetup && userProfile.memberType !== userType) {
                console.warn(`[AuthService] User type mismatch Google login. Expected ${userType} got ${userProfile.memberType}`);

                // ensure clean state
                await this.signOut(null);

                // Throw standardized message; backend 409 should normally handle this,
                // but this code is a second line of defence.
                const thaiRole = userProfile.memberType === 'owner' ? 'เจ้าของหอพัก' : 'สมาชิก';
                throw new Error(`บัญชีนี้ถูกลงทะเบียนเป็น${thaiRole}แล้ว`);
            }

            return userProfile;
        } catch (error: any) {
            console.error('[AuthService] Registration error:', error);
            throw error;
        } finally {
            // *** รีเซ็ต flag เมื่อเสร็จสิ้น ***
            this.isRegistrationInProgress = false;
        }
    }

    // แก้ไข method completeUserProfile ให้รองรับกรณี phoneNumber เป็น undefined สำหรับ owner
    async completeUserProfile(phoneNumber: string | undefined, userType: 'member' | 'owner', dormitoryId?: number): Promise<UserProfile> {
        // *** เซ็ต flag ป้องกัน race condition ***
        this.isRegistrationInProgress = true;

        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            console.error('[AuthService] No Firebase user found for profile completion');
            this.router.navigate(['/main']);
            throw new Error('ไม่พบผู้ใช้ที่ล็อกอินในระบบ กรุณาทำรายการใหม่อีกครั้ง');
        }

        console.log('[AuthService] Completing profile for user:', currentUser.uid);

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
            console.log('[AuthService] Payload for completeUserProfile:', payload);

            const rawResponse = await this.http.put<any>(`${this.backendUrl}/auth/me`, payload, { headers }).toPromise();

            const userProfile: UserProfile = {
                uid: rawResponse.uid,
                email: rawResponse.email,
                username: rawResponse.username || '',
                displayName: rawResponse.display_name || rawResponse.displayName || null,
                photoURL: rawResponse.photoURL || rawResponse.photo_url || null,
                memberType: userType,
                needsProfileSetup: false,
                phoneNumber: rawResponse.phone_number || null,
                residenceDormId: rawResponse.residence_dorm_id || null,
                provider: 'google', // *** แก้ไข: เปลี่ยนจาก 'password' เป็น 'google' ***
                member_type: rawResponse.member_type || null,
            };

            this.currentUser$.next(userProfile);

            console.log(`[AuthService] completeUserProfile finished - userProfile returned`);

            return userProfile;
        } catch (error: any) {
            try {
                await signOut(this.auth);
            } catch (signOutError) {
                console.error('[AuthService] Error signing out after profile completion error:', signOutError);
            }
            throw error;
        } finally {
            // *** รีเซ็ต flag เมื่อเสร็จสิ้น ***
            this.isRegistrationInProgress = false;
        }
    }

    async signInWithGoogle(userType: 'member' | 'owner'): Promise<UserProfile> {
        console.log(`[AuthService] Starting Google OAuth for ${userType}`);
        this.isGoogleRegistrationFlow = true;
    
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
    
            provider.setCustomParameters({ prompt: 'select_account' });
    
            const result = await signInWithPopup(this.auth, provider);
            const user = result.user;
    
            if (!user) {
                throw new Error('Google authentication failed');
            }
    
            console.log(`[AuthService] Google sign-in successful for user: ${user.email}`);
    
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
                email: rawUser.email || user.email || '',
                username: rawUser.username || '',
                displayName: rawUser.displayName || rawUser.display_name || user.displayName || null,
                photoURL: rawUser.photoURL || rawUser.photo_url || user.photoURL || null,
                memberType: rawUser.memberType || rawUser.member_type || userType,
                needsProfileSetup: needsProfileSetupCalc,
                phoneNumber: rawUser.phoneNumber || rawUser.phone_number || null,
                residenceDormId: rawUser.residenceDormId || rawUser.residence_dorm_id || null,
                        provider: 'google'
                    };
    
            this.currentUser$.next(userProfile);
    
            if (userProfile.needsProfileSetup) {
                console.log('[AuthService] Profile setup required, redirecting to register');
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
            } else {
                if (userProfile.memberType === 'owner') {
                    await this.router.navigate(['/owner']);
                } else {
                    await this.router.navigate(['/main']);
                }
            }
    
            // Add safeguard: if backend returned success but memberType ≠ requested type → block login
            if (!userProfile.needsProfileSetup && userProfile.memberType !== userType) {
                console.warn(`[AuthService] User type mismatch Google login. Expected ${userType} got ${userProfile.memberType}`);

                // ensure clean state
                await this.signOut(null);

                // Throw standardized message; backend 409 should normally handle this,
                // but this code is a second line of defence.
                const thaiRole = userProfile.memberType === 'owner' ? 'เจ้าของหอพัก' : 'สมาชิก';
                throw new Error(`บัญชีนี้ถูกลงทะเบียนเป็น${thaiRole}แล้ว`);
            }
    
            return userProfile;
    
        } catch (error: any) {
            console.error('[AuthService] Google sign-in error:', error);
            this.isGoogleRegistrationFlow = false;
    
            try {
                await signOut(this.auth);
            } catch (signOutError) {
                console.error('[AuthService] Error signing out after Google auth error:', signOutError);
            }
    
            throw error;
        }
    } 

    // แก้ไข signUpWithEmail method ให้รองรับ dormitoryId และไม่บังคับ phoneNumber สำหรับ owner
    async signUpWithEmail(email: string, password: string, memberType: 'member' | 'owner', fullName: string, phoneNumber: string | undefined, dormitoryId?: number): Promise<void> {
        try {
            console.log(`[AuthService] Starting email sign-up process for ${memberType} with email: ${email}`);

            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const firebaseUser = userCredential.user;
            console.log(`[AuthService] Firebase user created successfully with UID: ${firebaseUser.uid}`);

            await updateProfile(firebaseUser, { displayName: fullName });
            console.log(`[AuthService] Firebase profile updated with displayName: ${fullName}`);

            const idToken = await firebaseUser.getIdToken();
            console.log(`[AuthService] Got ID token for user: ${firebaseUser.uid}`);

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
                console.log(`[AuthService] Adding dormitory ID for member: ${dormitoryId}`);
            }

            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

            console.log(`[AuthService] Sending registration data to backend:`, payload);
            const rawResponse = await this.http.post<any>(`${this.backendUrl}/auth/register`, payload, { headers }).toPromise();

            if (!rawResponse || !rawResponse.user) {
                console.error('[AuthService] Backend response missing user data:', rawResponse);
                throw new Error('Backend registration response is incomplete or invalid.');
            }

            console.log(`[AuthService] Raw Backend /auth/register response:`, rawResponse);
            console.log('[AuthService] Email Sign-Up successful. Redirecting to appropriate dashboard.');

            const isOwner = (rawResponse.user.memberType as string) === 'owner' || 
                           (rawResponse.user.member_type as string) === 'owner';
            
            if (isOwner) {
                this.router.navigate(['/owner']);
            } else {
                this.router.navigate(['/main']);
            }
        } catch (error: any) {
            console.error('[AuthService] Email Sign-Up error in service:', error);
            throw error;
        }
    }

    async signOut(redirectTo: string | null = null): Promise<void> {
        console.log('[AuthService] signOut called.');
        try {
            this.isGoogleRegistrationFlow = false;
            this.skipAuthStateChange = false;

            await signOut(this.auth);

            console.log('[AuthService] Firebase signOut successful.');

            // Clear cached user state
            this.currentUser$.next(null);

            if (redirectTo) {
                // Use Angular router navigation rather than forcing a full reload
                this.router.navigate([redirectTo]);
            }
        } catch (error) {
            console.error('[AuthService] Sign out error:', error);
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
            console.error('[AuthService] Error uploading owner image:', error);
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
            console.error('[AuthService] Error fetching dormitory options:', error);
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
            console.error('[AuthService] Error selecting dormitory:', error);
            throw error;
        }
    }

    // แก้ไขใน auth.service.ts ใน method fetchUserProfile
    async fetchUserProfile(firebaseUser: User): Promise<UserProfile> {
        try {
            const idToken = await firebaseUser.getIdToken();
            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

            console.log(`[AuthService] Fetching user profile with UID: ${firebaseUser.uid}`);
            const rawResponse = await this.http.get<any>(`${this.backendUrl}/auth/me`, { headers }).toPromise();

            if (!rawResponse) {
                console.error('[AuthService] Backend /auth/me response is empty');
                throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
            }

            console.log('[AuthService] Raw backend /auth/me response:', rawResponse);

            // *** แก้ไข: ให้ priority กับ snake_case จาก backend ***
            const memberType = rawResponse.member_type || rawResponse.memberType || null;
            const needsProfileSetup = rawResponse.needs_profile_setup !== undefined
                ? rawResponse.needs_profile_setup
                : (rawResponse.needsProfileSetup || false);

            console.log('[AuthService] Parsed memberType:', memberType, 'needsProfileSetup:', needsProfileSetup);

            const userProfile: UserProfile = {
                uid: firebaseUser.uid,
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
            };

            console.log('[AuthService] Final userProfile:', userProfile);
            return userProfile;
        } catch (error: any) {
            console.error('[AuthService] Error in fetchUserProfile:', error);
            throw error;
        }
    }

    // Add signInWithEmail method
    async signInWithEmail(email: string, password: string, expectedUserType: 'member' | 'owner'): Promise<UserProfile> {
        try {
            console.log(`[AuthService] Attempting to sign in with email: ${email}`);

            // ป้องกัน onAuthStateChanged ดึง profileก่อนจะตรวจสอบประเภทผู้ใช้
            this.skipAuthStateChange = true;

            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            console.log(`[AuthService] Firebase authentication successful for UID: ${user.uid}`);

            const userProfile = await this.fetchUserProfile(user);
            console.log('[AuthService] User profile fetched:', userProfile);

            // Safeguard against account-type mismatch (backend /auth/me cannot know expected type)
            if (userProfile.memberType !== expectedUserType) {
                console.warn(`[AuthService] MemberType mismatch. Expected ${expectedUserType} got ${userProfile.memberType}`);
                await this.signOut(null);
                const thaiRole = userProfile.memberType === 'owner' ? 'เจ้าของหอพัก' : 'สมาชิก';
                throw new Error(`บัญชีนี้ถูกลงทะเบียนเป็น${thaiRole}แล้ว`);
            }

            // อัปเดต currentUser$ ด้วยข้อมูลที่ถูกต้อง
            this.currentUser$.next(userProfile);

            return userProfile;
        } catch (error: any) {
            console.error('[AuthService] Email sign-in error:', error);
            throw error;
        } finally {
            // ปลดล็อกให้ onAuthStateChanged กลับมาทำงานตามปกติ
            this.skipAuthStateChange = false;
        }
    }

    // Add errorMessageHandler method
    errorMessageHandler(error: any): string {
        console.error('[AuthService] Error being handled:', error);

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
            console.error('[AuthService] Error fetching zone options:', error);
            throw error;
        }
    }
}