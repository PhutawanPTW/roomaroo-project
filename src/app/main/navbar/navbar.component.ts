// src/app/main/navbar/navbar.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';

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
  private authSubscription: Subscription | undefined;
  isPhotoLoading = true;
  userType: 'owner' | 'member' | null = null;
  currentPath: string = '';
  isOwner: boolean = false;
  private userSub: Subscription | undefined;
  private routerSub: Subscription | undefined;
  isLoading = true; // Add loading state

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$
      .pipe(
        filter(user => user !== undefined) // Wait for a defined value (not undefined)
      )
      .subscribe(
        (user: UserProfile | null) => {
          this.currentUser = user;
          this.userType = user?.memberType ?? null;
          this.isOwner = user?.memberType === 'owner';
          this.isLoading = false; // Set loading to false once we have a definitive answer
        }
      );
      
    this.router.events.subscribe(() => {
      this.currentPath = this.router.url;
    });
    this.currentPath = this.router.url;

    // Listen to route changes to update menu if needed
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Optionally, you can add logic here if you want to check path for more control
        // For now, we rely on userType only
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
    this.router.navigate(['/main/profile']);
    this.closeProfileDropdown();
  }

  onPhotoLoad() { this.isPhotoLoading = false; }
  onPhotoError() { this.isPhotoLoading = false; }

  shouldShowDormAndMapMenu(): boolean {
    if (this.userType === 'owner' && !this.currentPath.startsWith('/main')) {
      return false;
    }
    return true;
  }
}