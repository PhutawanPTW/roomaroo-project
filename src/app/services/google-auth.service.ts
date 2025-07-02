import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth, signInWithPopup, GoogleAuthProvider, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class GoogleAuthService {
    private backendUrl = 'http://localhost:3000/api';

    // Add flag to track if we're in the middle of Google OAuth registration flow
    private isGoogleRegistrationFlow = false;

    // *** เพิ่ม flag สำหรับป้องกัน race condition ระหว่าง registration ***
    private isRegistrationInProgress = false;

    constructor(
        private http: HttpClient,
        private auth: Auth,
        private router: Router,
        private authService: AuthService
    ) {}

    async signInWithGoogle(userType: 'member' | 'owner'): Promise<UserProfile> {
        console.log(`[GoogleAuthService] Starting Google OAuth for ${userType}`);
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
    
            console.log(`[GoogleAuthService] Google sign-in successful for user: ${user.email}`);
    
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
    
            this.authService.currentUser$.next(userProfile);
    
            this.isGoogleRegistrationFlow = false;
    
            if (userProfile.needsProfileSetup) {
                console.log('[GoogleAuthService] Profile setup required, redirecting to register');
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
    
            return userProfile;
    
        } catch (error: any) {
            console.error('[GoogleAuthService] Google sign-in error:', error);
            this.isGoogleRegistrationFlow = false;
    
            try {
                await signOut(this.auth);
            } catch (signOutError) {
                console.error('[GoogleAuthService] Error signing out after Google auth error:', signOutError);
            }
    
            throw error;
        }
    }

    // แก้ไข method completeUserProfile สำหรับ Google OAuth flow
    async completeGoogleUserProfile(phoneNumber: string | undefined, userType: 'member' | 'owner', dormitoryId?: number): Promise<UserProfile> {
        // *** เซ็ต flag ป้องกัน race condition ***
        this.isRegistrationInProgress = true;

        if (this.isGoogleRegistrationFlow) {
            console.log('[GoogleAuthService] Completing Google OAuth profile - signing in again');

            try {
                const provider = new GoogleAuthProvider();
                provider.addScope('profile');
                provider.addScope('email');

                const result = await signInWithPopup(this.auth, provider);
                const user = result.user;
                console.log('[GoogleAuthService] Re-authenticated with Google for profile completion');

                const idToken = await user.getIdToken();
            } catch (error) {
                console.error('[GoogleAuthService] Failed to re-authenticate with Google:', error);
                throw error;
            }
        }

        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            console.error('[GoogleAuthService] No Firebase user found for profile completion');
            this.router.navigate(['/main']);
            throw new Error('ไม่พบผู้ใช้ที่ล็อกอินในระบบ กรุณาทำรายการใหม่อีกครั้ง');
        }

        console.log('[GoogleAuthService] Completing profile for user:', currentUser.uid);

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
            console.log('[GoogleAuthService] Payload for completeGoogleUserProfile:', payload);

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

            this.isGoogleRegistrationFlow = false;
            this.authService.currentUser$.next(userProfile);

            console.log(`[GoogleAuthService] completeGoogleUserProfile finished - userProfile returned`);

            return userProfile;
        } catch (error: any) {
            this.isGoogleRegistrationFlow = false;
            try {
                await signOut(this.auth);
            } catch (signOutError) {
                console.error('[GoogleAuthService] Error signing out after profile completion error:', signOutError);
            }
            throw error;
        } finally {
            // *** รีเซ็ต flag เมื่อเสร็จสิ้น ***
            this.isRegistrationInProgress = false;
        }
    }

    // Method to check if currently in Google registration flow
    isInGoogleRegistrationFlow(): boolean {
        return this.isGoogleRegistrationFlow;
    }

    // Method to set Google registration flow flag
    setGoogleRegistrationFlow(value: boolean): void {
        this.isGoogleRegistrationFlow = value;
    }

    // Method to get error message (reuse from AuthService)
    errorMessageHandler(error: any): string {
        return this.authService.errorMessageHandler(error);
    }
}