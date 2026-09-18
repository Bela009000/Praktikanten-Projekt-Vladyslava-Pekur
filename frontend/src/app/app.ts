import { Component, OnInit, AfterViewInit, ChangeDetectorRef  } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase.config';
import { AuthService } from './services/auth.service';


import {
  createIcons,
  PlayingCards,
  User,
  Library,
  History,
  PlayingCardsFan,
  LogOut,
  GraduationCap,
  Brain
} from 'lucide';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, AfterViewInit {

  username = '';
  accountOpen = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    onAuthStateChanged(auth, (user) => {
      this.username = user?.displayName || '';
    });

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd
        )
      )
      .subscribe(() => {
        this.renderIcons();
      });
  }

  ngAfterViewInit(): void {
    this.renderIcons();
  }
toggleAccount(): void {
  this.accountOpen = !this.accountOpen;

  if (this.accountOpen) {
    this.changeDetectorRef.detectChanges();

    requestAnimationFrame(() => {
      this.renderIcons();
    });
  }
}

  async logout(): Promise<void> {
    await this.authService.logout();
    this.accountOpen = false;
    this.router.navigate(['/login']);
  }

  get userInitial(): string {
    return this.username
      ? this.username.charAt(0).toUpperCase()
      : '?';
  }

  private renderIcons(): void {
    createIcons({
      icons: {
        PlayingCards,
        User,
        Library,
        History,
        PlayingCardsFan,
        LogOut,
        GraduationCap,
        Brain
      }
    });
  }
}