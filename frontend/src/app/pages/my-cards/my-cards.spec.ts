import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyCards } from './my-cards';

describe('MyCards', () => {
  let component: MyCards;
  let fixture: ComponentFixture<MyCards>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyCards],
    }).compileComponents();

    fixture = TestBed.createComponent(MyCards);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
