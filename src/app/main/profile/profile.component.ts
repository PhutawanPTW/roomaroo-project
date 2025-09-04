import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, UserProfile } from '../../services/auth.service';
import { filter } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FormsModule } from '@angular/forms';
import { DormitoryService, Dorm } from '../../services/dormitory.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  userType: 'member' | 'owner' = 'member';
  isEditMode = false;
  isSaving = false;

  // ฟอร์มแก้ไข
  editForm = {
    username: '',
    displayName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    dormId: ''
  };

  // ข้อมูลหอพักที่เลือกได้ (สำหรับ Member)
  availableDorms: Dorm[] = [];

  private subscription: any;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private dormitoryService: DormitoryService
  ) {}

  ngOnInit() {
    this.route.data.subscribe(data => {
      this.userType = data['userType'] || 'member';
    });

    this.subscription = this.authService.currentUser$
      .pipe(
        filter((user): user is UserProfile | null => user !== undefined)
      )
      .subscribe(user => {
        this.currentUser = user;
        if (user && this.isEditMode) {
          this.loadEditForm(); // Reload form if user data changes while in edit mode
        }
        // โหลดข้อมูลหอพักเมื่อมีข้อมูลผู้ใช้
        if (user && this.isMember) {
          this.loadAvailableDorms();
        }
      });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  get isOwner(): boolean {
    return this.userType === 'owner' || this.currentUser?.memberType === 'owner';
  }

  get isMember(): boolean {
    return this.userType === 'member' || this.currentUser?.memberType === 'member';
  }

  get isGoogleUser(): boolean {
    return this.currentUser?.provider === 'google';
  }

  toggleEditMode() {
    if (this.isEditMode) {
      this.isEditMode = false;
      this.resetEditForm();
    } else {
      this.isEditMode = true;
      this.loadEditForm();
    }
  }

  loadEditForm() {
    if (this.currentUser) {
      this.editForm = {
        username: this.currentUser.username || '',
        displayName: this.currentUser.displayName || '',
        email: this.currentUser.email || '',
        phoneNumber: this.currentUser.phoneNumber || '',
        password: '',
        confirmPassword: '',
        dormId: this.currentUser.residenceDormId || ''
      };
    }
  }

  resetEditForm() {
    this.editForm = {
      username: '',
      displayName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      dormId: ''
    };
  }

  // โหลดข้อมูลหอพักที่มีอยู่
  loadAvailableDorms() {
    this.dormitoryService.getAllDormitories().subscribe({
      next: (dorms) => {
        this.availableDorms = dorms;
        console.log('Loaded available dorms:', dorms);
      },
      error: (error) => {
        console.error('Error loading dorms:', error);
        this.availableDorms = [];
      }
    });
  }

  // ดึงชื่อหอพักจาก ID
  getDormName(dormId: string): string {
    const dorm = this.availableDorms.find(d => d.dorm_id.toString() === dormId);
    return dorm ? dorm.dorm_name : '';
  }

  // ตรวจสอบว่าหอพักนี้เป็นหอปัจจุบันหรือไม่
  isCurrentDorm(dormId: string): boolean {
    return this.currentUser?.residenceDormId === dormId;
  }

  saveProfile() {
    console.log('Saving profile:', this.editForm);
    this.isSaving = true;
    // Simulate API call
    setTimeout(() => {
      this.isSaving = false;
      this.isEditMode = false;
      console.log('Profile saved successfully');
      // TODO: Reload user data after save
    }, 2000);
  }

  uploadProfileImage() {
    console.log('Upload profile image');
    // TODO: เปิด file picker และอัพโหลดรูป
  }
}
