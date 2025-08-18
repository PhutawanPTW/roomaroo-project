import { Routes } from '@angular/router';
import { MainComponent } from './main/main.component';
import { OwnerComponent } from './main/owner/owner.component';
import { LoginComponent } from './main/login/login.component';
import { RegisterComponent } from './main/register/register.component';
import { ProfileComponent } from './main/profile/profile.component';
import { DormListComponent } from './main/dorm-list/dorm-list.component';
import { DormDetailComponent } from './main/dorm-detail/dorm-detail.component';
import { DormMapComponent } from './main/dorm-map/dorm-map.component';
import { DormAddComponent } from './main/dorm-add/dorm-add.component';
import { DormCompareComponent } from './main/dorm-compare/dorm-compare.component';
import { AdminComponent } from './main/admin/admin.component';
import { TenantListComponent } from './main/tenant-list/tenant-list.component';
import { AuthRedirectGuard } from './guards/auth-redirect.guard';
import { OwnerGuard } from './guards/owner.guard';

export const routes: Routes = [
  // Redirect root path to main
  { path: '', redirectTo: '/main', pathMatch: 'full' },

  // Add dorm-list as a top-level route
  { path: 'dorm-list', component: DormListComponent },

  // Login routes
  {
    path: 'login/:type',
    component: LoginComponent,
    canActivate: [AuthRedirectGuard]
  },

  // Register routes
  {
    path: 'register/:type',
    component: RegisterComponent,
    canActivate: [AuthRedirectGuard]
  },

  // Redirect legacy paths without type param
  { path: 'login', redirectTo: 'login/member', pathMatch: 'full' },
  { path: 'register', redirectTo: 'register/member', pathMatch: 'full' },

  // Owner routes
  {
    path: 'owner',
    component: OwnerComponent,
    canActivate: [OwnerGuard],
    children: [
      { path: 'dorm-add', component: DormAddComponent },
      { path: 'tenant-list', component: TenantListComponent },
      { path: 'profile', component: ProfileComponent },
    ]
  },

  // Main routes
  {
    path: 'main',
    component: MainComponent,
    canActivate: [AuthRedirectGuard],
    children: [
      { path: '', component: DormListComponent },

      { path: 'dorm-map', component: DormMapComponent },
      { path: 'dorm-compare', component: DormCompareComponent },
      { path: 'tenant-list', component: TenantListComponent, canActivate: [AuthRedirectGuard] },
      { path: 'profile', component: ProfileComponent },
    ]
  },

  // Admin routes
  {
    path: 'admin',
    component: AdminComponent
  },


  // Dorm detail route - standalone (ไม่ใช่ child ของ main)
  {
    path: 'dorm-detail/:id',
    component: DormDetailComponent
  },

  // Wildcard route - redirect to main (but owner will be redirected to /owner by guard)
  { path: '**', redirectTo: '/main' }
];
