// src/app/main/navbar/navbar.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  menuOpen = false;
  loginDropdownOpen = false;
  profileDropdownOpen = false;
  currentUser: UserProfile | null = null;
  private authSubscription: Subscription | undefined; // <<< เปลี่ยนตรงนี้

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$.subscribe(
      (user: UserProfile | null) => { // <<< กำหนด Type ให้ชัดเจน
        this.currentUser = user;
        console.log('Current user updated in Navbar:', user);
        if (user) {
          console.log('🖼️ Navbar - User photoURL:', user.photoURL);
          console.log('🖼️ Navbar - getUserPhotoURL() result:', this.getUserPhotoURL());
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.authSubscription) { // <<< เช็คว่ามีค่าก่อน unsubscribe
      this.authSubscription.unsubscribe();
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleLoginDropdown() {
    this.loginDropdownOpen = !this.loginDropdownOpen;
    if (this.loginDropdownOpen) this.profileDropdownOpen = false;
  }

  toggleProfileDropdown() {
    this.profileDropdownOpen = !this.profileDropdownOpen;
    if (this.profileDropdownOpen) this.loginDropdownOpen = false;
  }

  closeLoginDropdown() {
    this.loginDropdownOpen = false;
  }

  closeProfileDropdown() {
    this.profileDropdownOpen = false;
  }

  onLoginTypeSelect(type: 'member' | 'owner') {
    console.log(`Selected login type: ${type} at ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
    this.loginDropdownOpen = false;
    this.router.navigate(['/login'], { queryParams: { type } });
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  getUserType(): 'member' | 'owner' | 'general' | null {
    return this.currentUser?.memberType || null;
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return '';
    return this.currentUser.displayName || this.currentUser.email || 'ผู้ใช้';
  }

  getUserUsername(): string {
    if (!this.currentUser) return '';
    return this.currentUser.username || '';
  }

  getUserPhotoURL(): string | null {
    const photoURL = this.currentUser?.photoURL || null;
    console.log('🖼️ Navbar - getUserPhotoURL() called, returning:', photoURL);
    return photoURL;
  }

  shouldShowPostDormButton(): boolean {
    const userType = this.getUserType();
    return !this.isLoggedIn() || userType === 'owner';
  }

  onPostDormClick() {
    if (this.isLoggedIn() && this.getUserType() === 'owner') {
      this.router.navigate(['/post-dorm']);
    } else {
      this.router.navigate(['/login'], { queryParams: { type: 'owner' } });
    }
  }

  async onLogout() {
    try {
      await this.authService.signOut();
      console.log('Logout successful from Navbar');
    } catch (error: any) {
      console.error('Logout error from Navbar:', error);
    } finally {
      this.closeProfileDropdown();
    }
  }

  goToProfile() {
    this.router.navigate(['/main/profile']);
    this.closeProfileDropdown();
  }
}