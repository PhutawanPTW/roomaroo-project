import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent {
  // --- เพิ่มตัวนี้ ---
  isLoggedIn = false;            // ตั้งค่าเริ่มต้นตามจริงของคุณ (false/true)
  adminName = 'Admin1';
  adminUid  = '23545';
  // -------------------

  dorms = [
    { name: 'หอพักร่ำรวย',        userId: 'khaitiew002',  owner: 'ไม่ใช่ยง ชายดี' },
    { name: 'หอพักสบายใจ',        userId: 'khonsarn003',  owner: 'คนสาร เพชรสาร' },
    { name: 'หอพักใกล้มหาลัย',     userId: 'arunrak003',   owner: 'อรุณรักษ์ พัฒนาพันธ์' },
    { name: 'หอพักวิวสวน',        userId: 'jiraporn005',  owner: 'วิราภรณ์ รักสวน' },
    { name: 'หอพักใจกลางเมือง',    userId: 'narong006',    owner: 'ณรงค์ พักกึ่งสุข' },
    { name: 'หอพักราคาประหยัด',   userId: 'sudjai007',    owner: 'สุดใจ วรรณา' },
    { name: 'หอพักริมคลอง',       userId: 'mala008',      owner: 'มาลา ทองคำ' },
    { name: 'หอพักบ้านดอกไม้',    userId: 'kritsada009',  owner: 'กฤษดา สมบูรณ์ผล' },
    { name: 'หอพฤกษ์ใหญ่สุขสันต์', userId: 'yoongyai006', owner: 'สาครานต์ ส่งสุข' },
  ];

  currentPage = 1;
  totalPages = 5;

  selectedTab: 'all' | 'รออนุมัติ' = 'all';

  setTab(tab: 'all' | 'รออนุมัติ') {
    this.selectedTab = tab;
  }

  getHomeLink(): string | any[] {
    return ['/'];
  }

  // ปุ่มใน header (กรณียังไม่ล็อกอิน)
  goLogin() {
    // ใส่การนำทางไปหน้าเข้าสู่ระบบของคุณที่นี่
    // this.router.navigate(['/login']);
  }
}
