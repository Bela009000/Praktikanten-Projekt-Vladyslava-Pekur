import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Lernmodus } from './lernmodus';

describe('Lernmodus', () => {
  let component: Lernmodus;
  let fixture: ComponentFixture<Lernmodus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Lernmodus],
    }).compileComponents();

    fixture = TestBed.createComponent(Lernmodus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
