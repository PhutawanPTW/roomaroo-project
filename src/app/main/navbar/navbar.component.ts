// src/app/main/navbar/navbar.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { GoogleAuthService } from '../../services/google-auth.service';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit, OnDestroy {
  menuOpen = false;
  loginDropdownOpen = false;
  profileDropdownOpen = false;
  currentUser: UserProfile | null = null;
  private authSubscription: Subscription | undefined;
  userType: 'owner' | 'member' | null = null;
  currentPath: string = '';
  isOwner: boolean = false;
  private userSub: Subscription | undefined;
  private routerSub: Subscription | undefined;
  isLoading = true; // Add loading state

  constructor(
    private router: Router,
    private authService: AuthService,
    private googleAuthService: GoogleAuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // ใช้ distinctUntilChanged เพื่อป้องกันการ trigger ซ้ำ แต่ไม่ใช้ take(1)
    this.authSubscription = this.authService.currentUser$
      .pipe(
        filter((user) => user !== undefined),
        distinctUntilChanged((prev, curr) => {
          // เปรียบเทียบเฉพาะข้อมูลที่จำเป็น
          return (
            prev?.uid === curr?.uid &&
            prev?.memberType === curr?.memberType &&
            prev?.photoURL === curr?.photoURL
          );
        })
      )
      .subscribe((user) => {
        // ไม่แสดงข้อมูล user ถ้าเป็น temporary user หรือยังไม่สมบูรณ์
        if (
          user &&
          !this.googleAuthService.isTemporaryUser() &&
          !user.needsProfileSetup
        ) {
          this.currentUser = user;
          this.userType = user?.memberType ?? null;
          this.isOwner = user?.memberType === 'owner';
        } else {
          this.currentUser = null;
          this.userType = null;
          this.isOwner = false;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      });

    // ตั้งค่า currentPath เริ่มต้น
    this.currentPath = this.router.url;

    // Listen to route changes to update menu if needed
    this.routerSub = this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        distinctUntilChanged((prev, curr) => {
          return (prev as NavigationEnd)?.url === (curr as NavigationEnd)?.url;
        })
      )
      .subscribe(() => {
        this.currentPath = this.router.url;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    this.userSub?.unsubscribe();
    this.routerSub?.unsubscribe();
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
    this.loginDropdownOpen = false;
    this.router.navigate(['/login', type]);
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
    return photoURL;
  }

  shouldShowPostDormButton(): boolean {
    const userType = this.getUserType();
    return !this.isLoggedIn() || userType === 'owner';
  }

  onPostDormClick() {
    if (this.isLoggedIn() && this.getUserType() === 'owner') {
      this.router.navigate(['/owner/dorm-add']);
    } else {
      this.router.navigate(['/login', 'owner']);
    }
  }

  async onLogout() {
    try {
      await this.authService.signOut('/main');
    } finally {
      this.closeProfileDropdown();
    }
  }

  goToProfile() {
    if (this.getUserType() === 'owner') {
      this.router.navigate(['/owner/profile']);
    } else {
      this.router.navigate(['/main/profile']);
    }
    this.closeProfileDropdown();
  }

  onPhotoLoad() {
    this.cdr.markForCheck();
  }

  onPhotoError() {
    this.cdr.markForCheck();
  }

  shouldShowDormAndMapMenu(): boolean {
    if (this.userType === 'owner' && !this.currentPath.startsWith('/main')) {
      return false;
    }
    return true;
  }

  getHomeLink(): string {
    if (this.isLoggedIn() && this.getUserType() === 'owner') {
      return '/owner';
    }
    return '/main';
  }

  mobileMenuOpen = false;

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }
}
