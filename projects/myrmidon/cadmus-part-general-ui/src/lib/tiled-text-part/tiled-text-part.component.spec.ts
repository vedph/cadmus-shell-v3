import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TextTileComponent } from '../text-tile/text-tile.component';
import { TiledDataComponent } from '../tiled-data/tiled-data.component';
import { TiledTextPartComponent } from './tiled-text-part.component';

describe('TiledTextPartComponent', () => {
  let component: TiledTextPartComponent;
  let fixture: ComponentFixture<TiledTextPartComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        TiledDataComponent,
        TextTileComponent,
        TiledTextPartComponent,
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TiledTextPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
