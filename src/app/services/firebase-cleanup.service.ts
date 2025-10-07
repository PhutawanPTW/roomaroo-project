import { Injectable } from '@angular/core';
import { Auth, deleteUser, signInWithEmailAndPassword } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class FirebaseCleanupService {

  constructor(private auth: Auth) {}

  /**
   * ลบ Firebase User ที่ค้างอยู่โดยใช้ email และ password
   * ใช้เมื่อต้องการลบ user ที่สมัครไม่สำเร็จ
   */
  async deleteOrphanedUser(email: string, password: string): Promise<boolean> {
    try {
      console.log('[FirebaseCleanup] Attempting to delete orphaned user:', email);
      
      // 1. Sign in ด้วย email/password ที่ค้างอยู่
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      console.log('[FirebaseCleanup] Successfully signed in, now deleting user:', user.uid);
      
      // 2. ลบ user ทันที
      await deleteUser(user);
      
      console.log('[FirebaseCleanup] User deleted successfully');
      return true;
      
    } catch (error: any) {
      console.error('[FirebaseCleanup] Failed to delete orphaned user:', error);
      
      // ถ้า sign in ไม่ได้ แสดงว่า user อาจถูกลบไปแล้ว หรือ password ผิด
      if (error.code === 'auth/user-not-found') {
        console.log('[FirebaseCleanup] User not found - already deleted or never existed');
        return true; // ถือว่าสำเร็จเพราะ user ไม่มีอยู่แล้ว
      }
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        console.log('[FirebaseCleanup] Invalid credentials - user might have different password');
        return false;
      }
      
      return false;
    }
  }

  /**
   * ตรวจสอบว่า user มีอยู่ใน Firebase หรือไม่
   */
  async checkUserExists(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Sign out ทันทีหลังจากตรวจสอบ
      await this.auth.signOut();
      
      return true;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return false;
      }
      throw error;
    }
  }

  /**
   * แสดงคำแนะนำสำหรับการลบ user ที่ค้างอยู่
   */
  getCleanupInstructions(email: string): string {
    return `
To clean up orphaned Firebase user:
1. Open browser console
2. Run: await window.firebaseCleanup.deleteOrphanedUser('${email}', 'password_used_during_registration')
3. Or manually delete from Firebase Console: https://console.firebase.google.com/project/projectroomaroo/authentication/users
    `;
  }
}

// เพิ่ม service ไปที่ window object เพื่อใช้ใน console (development only)
declare global {
  interface Window {
    firebaseCleanup: FirebaseCleanupService;
  }
}
