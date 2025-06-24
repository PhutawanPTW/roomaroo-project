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
import { OwnerGuard } from './guards/owner.guard';
import { TenantListComponent } from './main/tenant-list/tenant-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'main', pathMatch: 'full' },

  // Route ที่ไม่ต้องการ layout main
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dorm-list', component: DormListComponent },
  { path: 'dorm-detail', component: DormDetailComponent },
  { path: 'dorm-map', component: DormMapComponent },
  
  { 
    path: 'owner', 
    component: OwnerComponent,
    // canActivate: [OwnerGuard]
  },

  // Route ที่ใช้ layout main
  {
    path: 'main',
    component: MainComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      
      { path: 'profile', component: ProfileComponent },
      { path: 'dorm-add', component: DormAddComponent },
      { path: 'dorm-compare', component: DormCompareComponent },
      { path: 'admin', component: AdminComponent },
    ]
  },
  {
    path: 'main/tenant-list',
    component: TenantListComponent
  }
];