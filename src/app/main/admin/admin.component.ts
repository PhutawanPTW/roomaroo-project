import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  dorms = [
    { name: 'หอพักจักรวย', userId: 'khatiiew002', owner: 'ไม่ใช่ยง เทสท์' },
    { name: 'หอพักลงนาใจ', userId: 'khonsarn003', owner: 'คนสวย เพชรสาร' },
    { name: 'หอพักใกล้มศวสัย', userId: 'arurnak003', owner: 'อรุณรักษ์ พัฒนาพันธ์' },
    { name: 'หอพักวิวสวน', userId: 'jiraporn005', owner: 'วิราภรณ์ รักสวน' },
    { name: 'หอพักกลางเมือง', userId: 'narong006', owner: 'ณรงค์ พักกึ่งสุข' },
    { name: 'หอพักราคาประหยัด', userId: 'sudjai007', owner: 'สุดใจ วรรณา' },
    { name: 'หอพักริมคลอง', userId: 'mala008', owner: 'มาลา ทองคำ' },
    { name: 'หอพักบ้านดอกไม้', userId: 'kritsada009', owner: 'กฤษดา สมบูรณ์ผล' },
    { name: 'หอพฤกษ์ใหญ่สุขสันต์', userId: 'yoongyai006', owner: 'สาครานต์ ส่งสุข' },
  ];
  currentPage = 1;
  totalPages = 5;

  selectedTab: 'all' | 'รออนุมัติ' = 'รออนุมัติ';

  setTab(tab: 'all' | 'รออนุมัติ') {
    this.selectedTab = tab;
  }
}
