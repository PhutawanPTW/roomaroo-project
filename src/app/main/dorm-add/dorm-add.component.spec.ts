import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DormAddComponent } from './dorm-add.component';

describe('DormAddComponent', () => {
  let component: DormAddComponent;
  let fixture: ComponentFixture<DormAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DormAddComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DormAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
