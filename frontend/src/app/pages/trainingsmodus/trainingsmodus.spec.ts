import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Trainingsmodus } from './trainingsmodus';

describe('Trainingsmodus', () => {
  let component: Trainingsmodus;
  let fixture: ComponentFixture<Trainingsmodus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trainingsmodus],
    }).compileComponents();

    fixture = TestBed.createComponent(Trainingsmodus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
