import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from "../navbar/navbar.component";

interface Amenity {
  name: string;
  available: boolean;
}

interface SimilarProperty {
  id: string;
  name: string;
  price: string;
  location: string;
  checkInDate: string;
  rating: number;
  image: string;
}

interface Review {
  username: string;
  avatar: string;
  comment: string;
  rating: number;
  isPositive: boolean;
}

@Component({
  selector: 'app-dorm-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './dorm-detail.component.html',
  styleUrls: ['./dorm-detail.component.css']
})
export class DormDetailComponent implements OnInit {
  dormName: string = 'The RIP Resident';
  dormPrice: string = '500 บาท/วัน';
  priceRange: string = '3500 - 4000 บาท';
  location: string = 'ถนนมหาวิทยาลัยมหาสารคาม หน้ามอ';
  owner: string = 'มายเรียง';
  roomSize: string = '25 ตารางเมตร';
  waterRate: string = '25 บาท/ยูนิต';
  electricRate: string = '8 บาท/ยูนิต';
  
  description: string = 'หอพัก [ชื่อหอพัก] ตั้งอยู่ในทำเลที่สะดวกสบาย ใกล้กับ [ระบุสถานที่สำคัญ เช่น มหาวิทยาลัย ร้านสะดวกซื้อ หรือระบบขนส่งสาธารณะ] บรรยากาศเงียบสงบและเป็นส่วนตัว ทำให้ผู้อาศัยเหมือนได้พักผ่อนอยู่บ้าน บริการและสิ่งอำนวยความสะดวกครบครัน ให้ทุกคนที่เข้าพักรู้สึกอบอุ่นและปลอดภัย';
  
  currentImageIndex: number = 0;
  images: string[] = [
    'https://r1imghtlak.mmtcdn.com/7bd76caa82b411ee9ce10a58a9feac02.jpg',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQneRBjn_zI9kMn3Z9aiWcu8L6DpP8X1oNbGuzHpzI1xCV6VoW631mUdqKvNJbK3BF3imo&usqp=CAU'
  ];
  
  amenities: Amenity[] = [
    { name: 'ลิฟท์', available: true },
    { name: 'ไวไฟในห้อง', available: true },
    { name: 'อินเตอร์เน็ต', available: true },
    { name: 'TV', available: false },
    { name: 'โต๊ะ', available: true },
    { name: 'Wi-Fi', available: true },
    { name: 'เครื่องทำน้ำอุ่น', available: true },
    { name: 'อนุญาตให้นำสัตว์เลี้ยง', available: true },
    { name: 'เคเบิล', available: true },
    { name: 'ตู้เย็น', available: true },
    { name: 'ตู้เสื้อผ้า', available: true },
    { name: 'ระเบียง', available: true },
    { name: 'ตู้น้ำดื่ม', available: true },
    { name: 'เครื่องซักผ้า', available: true },
    { name: 'สระว่ายน้ำ', available: true },
    { name: 'เตียงนอน', available: true },
    { name: 'ห้องน้ำรวม', available: true },
    { name: 'Lobby', available: true }
  ];
  
  similarProperties: SimilarProperty[] = [
    {
      id: '1',
      name: 'หอพักธราดา',
      price: '2,600 - 3,000 บาท/เดือน',
      location: 'หลังมอ',
      checkInDate: 'เข้าพัก 18-19 กันยายน 2023',
      rating: 5.0,
      image: '../../../assets/images/b6a87c62-6218-4f64-b0b8-d37a9fcc8d7e.png'
    },
    {
      id: '2',
      name: 'หอพักวิลล่า',
      price: '2,600 - 3,000 บาท/เดือน',
      location: 'หลังมอ',
      checkInDate: 'เข้าพัก 18-19 กันยายน 2023',
      rating: 5.0,
      image: '../../../assets/images/b6a87c62-6218-4f64-b0b8-d37a9fcc8d7e.png'
    }
  ];
  
  ownerProfile = {
    name: 'Michael James',
    image: '../../../assets/images/image-removebg-preview.png',
    lineId: 'Axi'
  };

  // Map properties
  mapZoom: number = 14;
  mapLatitude: number = 51.505;
  mapLongitude: number = -0.115;

  // Reviews data
  overallRating: number = 5.0;
  newComment: string = '';
  
  reviews: Review[] = [
    {
      username: 'สมหมาย',
      avatar: '../../../assets/images/image-removebg-preview.png',
      comment: 'หอดีมาก',
      rating: 3,
      isPositive: false
    },
    {
      username: 'สมหมาย',
      avatar: '../../../assets/images/image-removebg-preview.png',
      comment: 'หอดีมาก',
      rating: 5,
      isPositive: true
    },
    {
      username: 'สมหมาย',
      avatar: '../../../assets/images/image-removebg-preview.png',
      comment: 'หอดีมาก',
      rating: 5,
      isPositive: true
    },
    {
      username: 'สมหมาย',
      avatar: '../../../assets/images/image-removebg-preview.png',
      comment: 'หอดีมาก',
      rating: 5,
      isPositive: true
    }
  ];

  constructor() { }

  ngOnInit(): void {
  }

  // Image carousel methods
  nextImage(): void {
    if (this.currentImageIndex < this.images.length - 1) {
      this.currentImageIndex++;
    } else {
      this.currentImageIndex = 0;
    }
  }

  prevImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    } else {
      this.currentImageIndex = this.images.length - 1;
    }
  }

  setCurrentImage(index: number): void {
    this.currentImageIndex = index;
  }

  // Add to favorites method
  addToFavorites(): void {
    // Logic to add to favorites
    console.log('Added to favorites:', this.dormName);
    alert('Added to favorites!');
  }

  // Contact owner method
  contactOwner(): void {
    // Logic to contact owner
    console.log('Contacting owner:', this.ownerProfile.name);
    alert('Contacting owner!');
  }

  // Map control methods
  zoomIn(): void {
    if (this.mapZoom < 19) {
      this.mapZoom++;
      this.updateMapUrl();
    }
  }
  
  zoomOut(): void {
    if (this.mapZoom > 1) {
      this.mapZoom--;
      this.updateMapUrl();
    }
  }
  
  updateMapUrl(): void {
    // This would typically update the map URL or trigger a map API to update the zoom level
    console.log(`Map zoom level changed to: ${this.mapZoom}`);
  }

  // Reviews methods
  addComment(comment: string): void {
    if (comment.trim()) {
      // In a real app, this would send the comment to a backend service
      console.log('Adding comment:', comment);
      this.newComment = '';
    }
  }
  
  viewAllComments(): void {
    // This would navigate to a page with all comments or load more comments
    console.log('Viewing all comments');
  }
}
