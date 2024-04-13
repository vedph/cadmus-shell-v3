import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NamesPartComponent } from './names-part.component';

describe('NamesPartComponent', () => {
  let component: NamesPartComponent;
  let fixture: ComponentFixture<NamesPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NamesPartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NamesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
