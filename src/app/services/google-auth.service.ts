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
    ) {
    }

    async signInWithGoogle(userType: 'member' | 'owner'): Promise<UserProfile> {
        // console.log(`[GoogleAuthService] Starting Google OAuth for ${userType}`);
        this.isGoogleRegistrationFlow = true;
        
        try {
            // Delegate to AuthService's implementation
            return await this.authService.signInWithGoogle(userType);
        } catch (error) {
            console.error('[GoogleAuthService] Google sign-in error:', error);
            this.isGoogleRegistrationFlow = false;
            throw error;
        }
    }

    // *** ปรับปรุง method completeUserProfile ให้รองรับ owner fields ***
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
        // *** เซ็ต flag ป้องกัน race condition ***
        this.isRegistrationInProgress = true;

        try {
            // *** Delegate to AuthService's implementation with owner data ***
            return await this.authService.completeUserProfile(
                phoneNumber, 
                userType, 
                dormitoryId, 
                ownerData
            );
        } catch (error) {
            console.error('[GoogleAuthService] Error completing user profile:', error);
            this.isGoogleRegistrationFlow = false;
            throw error;
        } finally {
            this.isRegistrationInProgress = false;
        }
    }

    isInGoogleRegistrationFlow(): boolean {
        return this.isGoogleRegistrationFlow;
    }

    setGoogleRegistrationFlow(value: boolean): void {
        this.isGoogleRegistrationFlow = value;
    }

    errorMessageHandler(error: any): string {
        return this.authService.errorMessageHandler(error);
    }
}