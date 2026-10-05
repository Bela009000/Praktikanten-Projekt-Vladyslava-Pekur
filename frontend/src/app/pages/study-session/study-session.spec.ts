import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudySession } from './study-session';

describe('StudySession', () => {
  let component: StudySession;
  let fixture: ComponentFixture<StudySession>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudySession],
    }).compileComponents();

    fixture = TestBed.createComponent(StudySession);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
