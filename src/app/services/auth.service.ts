import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of, Subject } from 'rxjs'; // เพิ่ม Subject
import { switchMap, tap, catchError, map, filter } from 'rxjs/operators';
import { Auth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, updateProfile, user, User, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Router } from '@angular/router';

export interface UserProfile {
    uid: string;
    email: string;
    username: string;
    displayName: string | null;
    photoURL?: string | null;
    memberType: 'member' | 'owner' | null;
    needsProfileSetup: boolean;
    phoneNumber?: string | null;
    businessName?: string | null;
    businessAddress?: string | null;
    businessRegistration?: string | null;
    residenceDormId?: string | null;
    // เพิ่ม property ที่อาจมาจาก backend ด้วย snake_case ถ้า backend ยังไม่ถูกแก้
    display_name?: string | null;
    member_type?: string | null;
    photo_url?: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private backendUrl = 'http://localhost:3000/api';
    private currentUserSubject: BehaviorSubject<UserProfile | null> = new BehaviorSubject<UserProfile | null>(null);
    public currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();

    // เพิ่ม Subject สำหรับเหตุการณ์ที่ผู้ใช้ต้องการการตั้งค่าโปรไฟล์
    private _needsProfileSetupSource = new Subject<{ firebaseUser: User, userType: 'member' | 'owner', existingProfile: UserProfile | null }>();
    public needsProfileSetup$ = this._needsProfileSetupSource.asObservable();


    constructor(
        private http: HttpClient,
        private auth: Auth,
        private router: Router
    ) {
        console.log('[AuthService] Constructor: Initializing auth state listener.');
        user(this.auth).pipe(
            tap(firebaseUser => {
                console.log(`[AuthService] Firebase User state changed: ${firebaseUser ? firebaseUser.uid : 'null'}`);
            }),
            switchMap(firebaseUser => {
                if (firebaseUser) {
                    console.log(`[AuthService] Firebase User exists. Getting ID Token for UID: ${firebaseUser.uid}`);
                    return from(firebaseUser.getIdToken()).pipe(
                        tap(idToken => console.log(`[AuthService] ID Token obtained. Fetching user profile from backend.`)),
                        switchMap(idToken => {
                            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);
                            return this.http.get<any>(`${this.backendUrl}/auth/me`, { headers }).pipe(
                                tap(rawBackendProfile => {
                                    console.log(`[AuthService] Raw Backend profile fetched:`, rawBackendProfile);
                                }),
                                map(rawBackendProfile => {
                                    console.log(`[AuthService] Raw Backend profile fetched:`, rawBackendProfile);
                                    console.log(`[AuthService] 🔍 Photo URL from Database:`, {
                                        photo_url: rawBackendProfile.photo_url,
                                        photoURL: rawBackendProfile.photoURL,
                                        finalPhotoURL: rawBackendProfile.photo_url || rawBackendProfile.photoURL || null
                                    });
                                    const userProfile: UserProfile = {
                                        uid: rawBackendProfile.uid,
                                        email: rawBackendProfile.email,
                                        username: rawBackendProfile.username || '',
                                        displayName: rawBackendProfile.display_name || rawBackendProfile.displayName || null,
                                        photoURL: rawBackendProfile.photo_url || rawBackendProfile.photoURL || null,
                                        memberType: (rawBackendProfile.member_type === 'owner' || rawBackendProfile.memberType === 'owner')
                                          ? 'owner'
                                          : (rawBackendProfile.member_type === 'member' || rawBackendProfile.memberType === 'member' ? 'member' : null),
                                        needsProfileSetup: rawBackendProfile.needsProfileSetup !== undefined ? rawBackendProfile.needsProfileSetup : false,
                                        phoneNumber: rawBackendProfile.phone_number || null,
                                        businessName: rawBackendProfile.business_name || null,
                                        businessAddress: rawBackendProfile.business_address || null,
                                        businessRegistration: rawBackendProfile.business_registration || null,
                                        residenceDormId: rawBackendProfile.residence_dorm_id || null
                                    };
                                    console.log(`[AuthService] 📸 Final UserProfile photoURL:`, userProfile.photoURL);
                                    console.log(`[AuthService] Mapped UserProfile with username:`, userProfile);
                                    return userProfile;
                                }),
                                catchError(error => {
                                    console.warn('[AuthService] Backend profile not found or error fetching (might be new user).', error);
                                    // หากเกิดข้อผิดพลาด หรือ User ยังไม่มีใน DB, ให้สร้าง UserProfile ชั่วคราวและตั้งค่า needsProfileSetup เป็น true
                                    return of({
                                        uid: firebaseUser.uid,
                                        email: firebaseUser.email || '',
                                        username: '', // ยังไม่มี username จาก backend
                                        displayName: firebaseUser.displayName || null,
                                        photoURL: firebaseUser.photoURL || null,
                                        memberType: null, // ยังไม่มี memberType
                                        needsProfileSetup: true // ต้องกรอกข้อมูลเพิ่มเติม
                                    } as UserProfile);
                                })
                            );
                        })
                    );
                } else {
                    console.log('[AuthService] Firebase User is null (signed out). Setting current user to null.');
                    return of(null);
                }
            }),
            tap(userProfile => {
                console.log('[AuthService] Updating currentUserSubject with:', userProfile);
                this.currentUserSubject.next(userProfile);

                // *** REMOVE REDIRECT LOGIC FROM HERE ***
                // Redirect logic will now be handled explicitly after signInWithGoogle/completeUserProfile
                // Or by guards if profile setup is required.
                // The current behavior is for general state management.
            }),
            catchError(error => {
                console.error('[AuthService] Error in authState processing (outer pipe):', error);
                this.currentUserSubject.next(null);
                return of(null);
            })
        ).subscribe();
    }

    // New error handler function
    errorMessageHandler(error: any): string {
        if (error && error.code) {
            switch (error.code) {
                case 'auth/invalid-email': return 'รูปแบบอีเมลไม่ถูกต้อง';
                case 'auth/user-disabled': return 'บัญชีผู้ใช้นี้ถูกปิดใช้งาน';
                case 'auth/user-not-found': return 'ไม่พบบัญชีผู้ใช้นี้';
                case 'auth/wrong-password': return 'รหัสผ่านไม่ถูกต้อง';
                case 'auth/email-already-in-use': return 'อีเมลนี้ถูกใช้งานแล้ว';
                case 'auth/weak-password': return 'รหัสผ่านอ่อนแอเกินไป (อย่างน้อย 6 ตัวอักษร)';
                case 'auth/popup-closed-by-user': return 'ยกเลิกการลงชื่อเข้าใช้';
                case 'auth/network-request-failed': return 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย';
                case 'auth/operation-not-allowed': return 'การลงชื่อเข้าใช้ด้วยอีเมล/รหัสผ่านถูกปิดใช้งาน';
                case 'auth/account-exists-with-different-credential': return 'มีบัญชีอยู่แล้วด้วยข้อมูลเข้าสู่ระบบที่แตกต่างกัน';
                default: return `เกิดข้อผิดพลาด: ${error.message}`;
            }
        } else if (error && error.message) {
            // Check for specific backend messages
            if (error.message.includes('email already exists')) {
                return 'อีเมลนี้ถูกใช้งานแล้ว';
            }
            return `เกิดข้อผิดพลาด: ${error.message}`;
        } else if (error && error.error && error.error.message) {
            // Check for error.error.message from backend
            if (error.error.message.includes('อีเมลนี้ถูกใช้งานแล้ว')) {
                return 'อีเมลนี้ถูกใช้งานแล้ว';
            }
            return `เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ${error.error.message}`;
        }
        return 'เกิดข้อผิดพลาดที่ไม่รู้จัก';
    }


    async signInWithGoogle(userType: 'member' | 'owner'): Promise<UserProfile> {
        console.log(`[AuthService] signInWithGoogle called with userType: ${userType}`);
        try {
            console.log('[AuthService] Starting Google sign in...');
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(this.auth, provider);
            const user = result.user;
            console.log('[AuthService] Google sign in successful, user:', user);

            // Get ID token for backend
            const idToken = await user.getIdToken();
            console.log('[AuthService] Got ID token, calling backend...');

            // Call backend
            const response = await this.http.post<any>(`${this.backendUrl}/auth/google-login`, { idToken, userType }).toPromise();
            console.log(`[AuthService] Raw Backend /auth/google-login response:`, response);
            console.log(`[AuthService] 🔍 Google Login - Photo URL from Database:`, {
                photo_url: response.photo_url,
                photoURL: response.photoURL,
                finalPhotoURL: response.photo_url || response.photoURL || null
            });

            const userProfile: UserProfile = {
                uid: response.uid,
                email: response.email,
                username: response.username || '',
                displayName: response.display_name || response.displayName || null,
                photoURL: response.photo_url || response.photoURL || null,
                memberType: (response.member_type === 'owner' || response.memberType === 'owner')
                  ? 'owner'
                  : (response.member_type === 'member' || response.memberType === 'member' ? 'member' : null),
                needsProfileSetup: response.needsProfileSetup !== undefined ? response.needsProfileSetup : false,
                phoneNumber: response.phone_number || null,
                businessName: response.business_name || null,
                businessAddress: response.business_address || null,
                businessRegistration: response.business_registration || null,
                residenceDormId: response.residence_dorm_id || null
            };
            console.log(`[AuthService] 📸 Google Login - Final UserProfile photoURL:`, userProfile.photoURL);
            console.log(`[AuthService] Mapped UserProfile from Google Login with username:`, userProfile);
            console.log(`[AuthService] Username from backend: "${response.username}"`);
            console.log(`[AuthService] Username in mapped profile: "${userProfile.username}"`);

            // อัพเดท currentUserSubject ก่อน
            this.currentUserSubject.next(userProfile);
            console.log('[AuthService] Updated currentUserSubject with user profile');

            // รอให้ state อัพเดทก่อน redirect
            setTimeout(() => {
                this.handleRedirectAfterLogin(userProfile);
            }, 100);

            return userProfile;
        } catch (error: any) {
            console.error('[AuthService] Google Sign-In error in service:', error);
            throw error;
        }
    }

    async signInWithEmail(email: string, password: string): Promise<UserProfile> {
        console.log(`[AuthService] signInWithEmail called for email: ${email}`);
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            console.log(`[AuthService] Email signInWithPassword successful for user: ${userCredential.user.uid}`);
            const idToken = await userCredential.user.getIdToken();

            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);
            const rawUserProfile = await this.http.get<any>(`${this.backendUrl}/auth/me`, { headers }).toPromise();

            if (!rawUserProfile) {
                throw new Error('Failed to fetch user profile after email login.');
            }
            console.log(`[AuthService] Raw Backend /auth/me response after email login:`, rawUserProfile);
            console.log(`[AuthService] 🔍 Email Login - Photo URL from Database:`, {
                photo_url: rawUserProfile.photo_url,
                photoURL: rawUserProfile.photoURL,
                finalPhotoURL: rawUserProfile.photo_url || rawUserProfile.photoURL || null
            });

            const userProfile: UserProfile = {
                uid: rawUserProfile.uid,
                email: rawUserProfile.email,
                username: rawUserProfile.username || '',
                displayName: rawUserProfile.display_name || rawUserProfile.displayName || null,
                photoURL: rawUserProfile.photo_url || rawUserProfile.photoURL || null,
                memberType: (rawUserProfile.member_type === 'owner' || rawUserProfile.memberType === 'owner')
                  ? 'owner'
                  : (rawUserProfile.member_type === 'member' || rawUserProfile.memberType === 'member' ? 'member' : null),
                needsProfileSetup: rawUserProfile.needsProfileSetup !== undefined ? rawUserProfile.needsProfileSetup : false,
                phoneNumber: rawUserProfile.phone_number || null,
                businessName: rawUserProfile.business_name || null,
                businessAddress: rawUserProfile.business_address || null,
                businessRegistration: rawUserProfile.business_registration || null,
                residenceDormId: rawUserProfile.residence_dorm_id || null
            };
            console.log(`[AuthService] 📸 Email Login - Final UserProfile photoURL:`, userProfile.photoURL);
            console.log(`[AuthService] Mapped UserProfile from email login with username:`, userProfile);

            // อัพเดท currentUserSubject ก่อน
            this.currentUserSubject.next(userProfile);

            // รอให้ state อัพเดทเสร็จก่อนทำ redirect
            setTimeout(() => {
                // *** LOGIC FOR EMAIL SIGN-IN REDIRECT ***
                // ถ้าเป็น Owner ให้ไปหน้า owner dashboard ทันที
                if (userProfile.memberType === 'owner') {
                    console.log('[AuthService] Email Sign-In: Owner detected. Redirecting to /owner.');
                    this.router.navigate(['/owner']);
                }
                // ถ้าเป็น Member และต้องการกรอกข้อมูลเพิ่ม
                else if (userProfile.memberType === 'member' && userProfile.needsProfileSetup) {
                    console.log('[AuthService] Email Sign-In: Member needs profile setup. Redirecting to /register.');
                    this.router.navigate(['/register'], {
                        state: {
                            fullName: userProfile.displayName,
                            email: userProfile.email,
                            photoURL: userProfile.photoURL,
                            userType: 'member',
                            isFromGoogle: false,
                        },
                        queryParams: { type: 'member' }
                    });
                }
                // ถ้าเป็น Member และข้อมูลครบแล้ว
                else if (userProfile.memberType === 'member' && !userProfile.needsProfileSetup) {
                    console.log('[AuthService] Email Sign-In: Member login successful. Redirecting to /main/member/dashboard.');
                    this.router.navigate(['/main/member/dashboard']);
                }
                // กรณีอื่นๆ
                else {
                    console.log('[AuthService] Email Sign-In: Unknown state, redirecting to home.');
                    this.router.navigate(['/']);
                }
            }, 100); // รอ 100ms เพื่อให้แน่ใจว่า state อัพเดทเสร็จแล้ว

            return userProfile;
        } catch (error: any) {
            console.error('[AuthService] Email Sign-In error in service:', error);
            throw error;
        }
    }

    async signUpWithEmail(email: string, password: string, memberType: 'member' | 'owner', fullName: string, phoneNumber: string, dormitory?: string): Promise<void> { // เปลี่ยน Promise<UserProfile> เป็น Promise<void> เพราะจะไปหน้า login แทน
        try {
            console.log(`[AuthService] Starting email sign-up process for ${memberType} with email: ${email}`);

            // สร้าง Firebase user ก่อน
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const firebaseUser = userCredential.user;
            console.log(`[AuthService] Firebase user created successfully with UID: ${firebaseUser.uid}`);

            // อัปเดต displayName ใน Firebase
            await updateProfile(firebaseUser, { displayName: fullName });
            console.log(`[AuthService] Firebase profile updated with displayName: ${fullName}`);

            // รับ ID Token จาก Firebase
            const idToken = await firebaseUser.getIdToken();
            console.log(`[AuthService] Got ID token for user: ${firebaseUser.uid}`);

            // สร้าง payload สำหรับ backend (JSON format) - ใช้ camelCase ตามที่ Backend ต้องการ
            const payload: any = {
                email: firebaseUser.email,
                fullName: fullName,
                memberType: memberType,
                phoneNumber: phoneNumber
            };

            // เพิ่ม dormitory สำหรับ member เท่านั้น
            if (memberType === 'member' && dormitory) {
                payload.dormitory = dormitory;
                console.log(`[AuthService] Adding dormitory for member: ${dormitory}`);
            }

            // สร้าง headers พร้อม Authorization
            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

            console.log(`[AuthService] Sending registration data to backend:`, payload);
            console.log(`[AuthService] Authorization header: Bearer ${idToken.substring(0, 20)}...`);
            const rawResponse = await this.http.post<any>(`${this.backendUrl}/auth/register`, payload, { headers }).toPromise();

            if (!rawResponse || !rawResponse.user) {
                console.error('[AuthService] Backend response missing user data:', rawResponse);
                throw new Error('Backend registration response is incomplete or invalid.');
            }

            console.log(`[AuthService] Raw Backend /auth/register response:`, rawResponse);
            
            // *** สำคัญ: เมื่อสมัครสมาชิกแบบปกติสำเร็จ ให้ไปหน้าแรกทันที
            console.log('[AuthService] Email Sign-Up successful. Redirecting to home page.');
            this.router.navigate(['/']);

        } catch (error: any) {
            console.error('[AuthService] Email Sign-Up error in service:', error);
            throw error;
        }
    }

    /**
     * Sign up with FormData including profile image
     * @param formData FormData object containing all registration data and optional profile image
     * @returns Promise<void>
     */
    async signUpWithFormData(formData: FormData): Promise<void> {
        try {
            console.log(`[AuthService] Starting FormData sign-up process`);
            
            // ดึงข้อมูลจาก FormData
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            const memberType = formData.get('memberType') as 'member' | 'owner';
            const fullName = formData.get('fullName') as string;
            const phoneNumber = formData.get('phoneNumber') as string;
            const dormitory = formData.get('dormitory') as string; // เพิ่ม dormitory field
            const profileImage = formData.get('profileImage') as File;
            
            // ตรวจสอบว่าข้อมูลจำเป็นครบหรือไม่
            if (!email || !password || !memberType || !fullName || !phoneNumber) {
                console.error('[AuthService] Missing required registration data');
                throw new Error('Missing required registration data');
            }
            
            console.log(`[AuthService] Starting registration for ${memberType} user: ${email}`);

            // สร้าง Firebase user ก่อน
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const firebaseUser = userCredential.user;
            console.log(`[AuthService] Firebase user created: ${firebaseUser.uid}`);

            // อัปเดต displayName ใน Firebase
            await updateProfile(firebaseUser, { displayName: fullName });

            // รับ ID Token จาก Firebase
            const idToken = await firebaseUser.getIdToken();
            console.log(`[AuthService] Got ID token for user: ${firebaseUser.uid}`);

            // สร้าง FormData ใหม่สำหรับส่งไป backend พร้อมไฟล์รูปภาพ
            const submitFormData = new FormData();
            
            // เพิ่มข้อมูลพื้นฐานตามที่ Backend คาดหวัง (camelCase)
            submitFormData.append('email', firebaseUser.email || '');
            submitFormData.append('fullName', fullName);
            submitFormData.append('memberType', memberType);
            submitFormData.append('phoneNumber', phoneNumber);
            
            // เพิ่ม dormitory สำหรับ member เท่านั้น
            if (memberType === 'member' && dormitory) {
                submitFormData.append('dormitory', dormitory);
                console.log(`[AuthService] Adding dormitory for member: ${dormitory}`);
            }
            
            // เพิ่มไฟล์รูปภาพถ้ามี
            if (profileImage) {
                submitFormData.append('profileImage', profileImage);
                console.log('[AuthService] Profile image included in registration request:', {
                    name: profileImage.name,
                    size: profileImage.size,
                    type: profileImage.type
                });
            } else {
                console.log('[AuthService] No profile image provided in registration request');
            }

            // สร้าง headers พร้อม Authorization
            const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

            console.log(`[AuthService] Sending registration data to backend`);
            console.log(`[AuthService] Authorization header: Bearer ${idToken.substring(0, 20)}...`);
            console.log(`[AuthService] FormData contents:`);
            for (let [key, value] of submitFormData.entries()) {
                if (key === 'profileImage') {
                    console.log(`  ${key}: [File] ${(value as File).name} (${(value as File).size} bytes)`);
                } else {
                    console.log(`  ${key}: ${value}`);
                }
            }
            
            const rawResponse = await this.http.post<any>(`${this.backendUrl}/auth/register`, submitFormData, { headers }).toPromise();

            if (!rawResponse || !rawResponse.user) {
                console.error('[AuthService] Backend registration response is invalid');
                throw new Error('Backend registration response is incomplete or invalid.');
            }

            console.log(`[AuthService] Backend registration successful`);
            
            // *** สำคัญ: เมื่อสมัครสมาชิกแบบปกติสำเร็จ ให้ไปหน้าแรกทันที
            console.log('[AuthService] Registration completed, redirecting to home page');
            this.router.navigate(['/']);

        } catch (error: any) {
            console.error('[AuthService] Registration error:', error);
            throw error;
        }
    }

    // This function is called when a Google user needs to complete their profile (e.g., set memberType)
    async completeUserProfile(phoneNumber: string, memberType: 'member' | 'owner', dormitory?: string): Promise<UserProfile> {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            throw new Error('No user logged in to complete profile.');
        }

        const idToken = await currentUser.getIdToken();
        const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);

        // สร้าง payload ตามที่ Backend คาดหวัง (camelCase)
        const payload: any = {
            phoneNumber: phoneNumber,
            memberType: memberType
        };

        // เพิ่ม dormitory สำหรับ member เท่านั้น
        if (memberType === 'member' && dormitory) {
            payload.dormitory = dormitory;
            console.log(`[AuthService] Adding dormitory for member profile completion: ${dormitory}`);
        }

        try {
            console.log('[AuthService] Completing user profile with payload:', payload);
            const rawResponse = await this.http.put<any>(`${this.backendUrl}/auth/complete-profile`, payload, { headers }).toPromise();

            const userProfile: UserProfile = {
                uid: rawResponse.uid,
                email: rawResponse.email,
                username: rawResponse.username || '',
                displayName: rawResponse.display_name || rawResponse.displayName || null,
                photoURL: rawResponse.photo_url || rawResponse.photoURL || null,
                memberType: (rawResponse.member_type === 'owner' || rawResponse.memberType === 'owner')
                  ? 'owner'
                  : (rawResponse.member_type === 'member' || rawResponse.memberType === 'member' ? 'member' : null),
                needsProfileSetup: rawResponse.needsProfileSetup !== undefined ? rawResponse.needsProfileSetup : false,
                phoneNumber: rawResponse.phone_number || null,
                businessName: rawResponse.business_name || null,
                businessAddress: rawResponse.business_address || null,
                businessRegistration: rawResponse.business_registration || null,
                residenceDormId: rawResponse.residence_dorm_id || null
            };
            console.log(`[AuthService] User profile completed successfully`);

            // *** LOGIC FOR REDIRECT AFTER PROFILE COMPLETION (FOR GOOGLE USERS) ***
            if (userProfile.memberType === 'owner') {
                console.log('[AuthService] Redirecting owner to dashboard');
                this.router.navigate(['/owner']);
            } else if (userProfile.memberType === 'member') {
                console.log('[AuthService] Redirecting member to dashboard');
                this.router.navigate(['/main/member/dashboard']);
            } else {
                console.log('[AuthService] Unknown member type, redirecting to home');
                this.router.navigate(['/']);
            }

            return userProfile;

        } catch (error: any) {
            console.error('[AuthService] Complete profile error:', error);
            throw error;
        }
    }

    async signOut(): Promise<void> {
        console.log('[AuthService] signOut called.');
        try {
            await signOut(this.auth);
            console.log('[AuthService] Firebase signOut successful.');
            this.currentUserSubject.next(null); // เคลียร์ user state
            this.router.navigate(['/']); // Redirect ไปหน้าแรก (home page)
        } catch (error) {
            console.error('[AuthService] Sign out error:', error);
            throw error;
        }
    }

    private handleRedirectAfterLogin(userProfile: UserProfile): void {
        console.log('[AuthService] Handling redirect after login for user:', userProfile);
        
        // ถ้าเป็น Owner ให้ไปหน้า owner dashboard ทันที
        if (userProfile.memberType === 'owner') {
            console.log('[AuthService] Owner detected. Redirecting to /owner.');
            this.router.navigate(['/owner']);
        }
        // ถ้าเป็น Member และต้องการกรอกข้อมูลเพิ่ม
        else if (userProfile.memberType === 'member' && userProfile.needsProfileSetup) {
            console.log('[AuthService] Member needs profile setup. Redirecting to /register.');
            this.router.navigate(['/register'], {
                state: {
                    fullName: userProfile.displayName,
                    email: userProfile.email,
                    photoURL: userProfile.photoURL,
                    userType: 'member',
                    isFromGoogle: true,
                },
                queryParams: { type: 'member' }
            });
        }
        // ถ้าเป็น Member และข้อมูลครบแล้ว
        else if (userProfile.memberType === 'member' && !userProfile.needsProfileSetup) {
            console.log('[AuthService] Member login successful. Redirecting to /main/member/dashboard.');
            this.router.navigate(['/main/member/dashboard']);
        }
        // กรณีอื่นๆ
        else {
            console.log('[AuthService] Unknown state, redirecting to home.');
            this.router.navigate(['/']);
        }
    }

    /**
     * Upload owner profile image to backend and update user state (for existing users)
     * @param file The image file to upload
     * @param firebaseUid The user's firebase UID
     * @returns Promise<string> The image URL returned from backend
     */
    async uploadOwnerImage(file: File, firebaseUid: string): Promise<string> {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('firebase_uid', firebaseUid);
        try {
            const response: any = await this.http.post(`${this.backendUrl}/owner/upload-image`, formData).toPromise();
            if (response && response.imageUrl) {
                // Update currentUserSubject with new photoURL
                const current = this.currentUserSubject.value;
                if (current) {
                    const updated = { ...current, photoURL: response.imageUrl };
                    this.currentUserSubject.next(updated);
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
}