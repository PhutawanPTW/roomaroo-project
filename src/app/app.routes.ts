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
  // Redirect root path to main (let auth guards handle the rest)
  { path: '', redirectTo: '/main', pathMatch: 'full' },

  {
    path: 'login/:type',
    component: LoginComponent,
    canActivate: [AuthRedirectGuard]
  },

  {
    path: 'register/:type',
    component: RegisterComponent,
    canActivate: [AuthRedirectGuard]
  },

  // Redirect legacy paths without type param
  { path: 'login', redirectTo: 'login/member', pathMatch: 'full' },
  { path: 'register', redirectTo: 'register/member', pathMatch: 'full' },

  {
    path: 'owner',
    component: OwnerComponent,
    canActivate: [OwnerGuard]
  },

  {
    path: 'main',
    component: MainComponent,
    children: [
      { path: '', component: DormListComponent },
      { path: 'dorm-list', component: DormListComponent },
      { path: 'dorm-detail', component: DormDetailComponent },
      { path: 'dorm-map', component: DormMapComponent },
      { path: 'dorm-add', component: DormAddComponent },
      { path: 'dorm-compare', component: DormCompareComponent },
      { path: 'tenant-list', component: TenantListComponent },
      { path: 'profile', component: ProfileComponent },
    ]
  },

  {
    path: 'admin',
    component: AdminComponent
  },

  // Wildcard route - redirect to main instead of home to avoid loops
  { path: '**', redirectTo: '/main' }
];