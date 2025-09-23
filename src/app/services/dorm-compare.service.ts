import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CompareDormItem {
  id: number;
  name: string;
  image: string;
  price: string;
  location: string;
  zone: string;
}

@Injectable({
  providedIn: 'root'
})
export class DormCompareService {
  private readonly STORAGE_KEY = 'dorm_compare_items';
  private readonly MAX_COMPARE_ITEMS = 5;
  
  // Observable สำหรับ tracking หอพักที่เลือกเปรียบเทียบ
  public compareItems$ = new BehaviorSubject<CompareDormItem[]>([]);
  public showComparePopup$ = new BehaviorSubject<boolean>(false);

  constructor() {
    // โหลดข้อมูลจาก localStorage เมื่อ service เริ่มทำงาน
    this.loadFromStorage();
  }

  /**
   * เพิ่มหอพักเข้าสู่รายการเปรียบเทียบ
   */
  addToCompare(dormItem: CompareDormItem): boolean {
    const currentItems = this.compareItems$.value;
    
    // ตรวจสอบว่ามีอยู่แล้วหรือไม่
    if (currentItems.find(item => item.id === dormItem.id)) {
      console.log('[DormCompareService] หอพักนี้อยู่ในรายการเปรียบเทียบแล้ว');
      return false;
    }
    
    // ตรวจสอบจำนวนสูงสุด
    if (currentItems.length >= this.MAX_COMPARE_ITEMS) {
      console.log('[DormCompareService] ไม่สามารถเพิ่มได้เกิน 5 หอพัก');
      return false;
    }
    
    // เพิ่มหอพักใหม่
    const newItems = [...currentItems, dormItem];
    this.compareItems$.next(newItems);
    this.saveToStorage(newItems);
    
    // แสดง popup
    this.showComparePopup$.next(true);
    
    console.log('[DormCompareService] เพิ่มหอพักเข้าสู่รายการเปรียบเทียบ:', dormItem.name);
    return true;
  }

  /**
   * ลบหอพักออกจากรายการเปรียบเทียบ
   */
  removeFromCompare(dormId: number): void {
    const currentItems = this.compareItems$.value;
    const newItems = currentItems.filter(item => item.id !== dormId);
    
    this.compareItems$.next(newItems);
    this.saveToStorage(newItems);
    
    // ถ้าไม่มีหอพักเหลือแล้ว ให้ซ่อน popup
    if (newItems.length === 0) {
      this.showComparePopup$.next(false);
    }
    
    console.log('[DormCompareService] ลบหอพักออกจากรายการเปรียบเทียบ:', dormId);
  }

  /**
   * ลบหอพักทั้งหมดออกจากการเปรียบเทียบ
   */
  clearAllCompare(): void {
    this.compareItems$.next([]);
    this.saveToStorage([]);
    this.showComparePopup$.next(false);
    
    console.log('[DormCompareService] ล้างรายการเปรียบเทียบทั้งหมด');
  }

  /**
   * ตรวจสอบว่าหอพักอยู่ในรายการเปรียบเทียบหรือไม่
   */
  isInCompare(dormId: number): boolean {
    return this.compareItems$.value.some(item => item.id === dormId);
  }

  /**
   * ตรวจสอบว่าสามารถเพิ่มหอพักได้อีกหรือไม่
   */
  canAddMore(): boolean {
    return this.compareItems$.value.length < this.MAX_COMPARE_ITEMS;
  }

  /**
   * ตรวจสอบว่ามีหอพักเพียงพอสำหรับเปรียบเทียบหรือไม่ (ขั้นต่ำ 2 หอพัก)
   */
  canCompare(): boolean {
    return this.compareItems$.value.length >= 2;
  }

  /**
   * ซ่อน popup
   */
  hideComparePopup(): void {
    this.showComparePopup$.next(false);
  }

  /**
   * แสดง popup
   */
  showComparePopup(): void {
    if (this.compareItems$.value.length > 0) {
      this.showComparePopup$.next(true);
    }
  }

  /**
   * บันทึกข้อมูลลง localStorage
   */
  private saveToStorage(items: CompareDormItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('[DormCompareService] Error saving to localStorage:', error);
    }
  }

  /**
   * โหลดข้อมูลจาก localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        this.compareItems$.next(items);
        
        // ถ้ามีข้อมูล ให้แสดง popup
        if (items.length > 0) {
          this.showComparePopup$.next(true);
        }
      }
    } catch (error) {
      console.error('[DormCompareService] Error loading from localStorage:', error);
    }
  }
}
