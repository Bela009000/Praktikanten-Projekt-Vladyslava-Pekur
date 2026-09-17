import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

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

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.username = localStorage.getItem('currentUser') || '';

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.renderIcons();
      });
  }

  ngAfterViewInit(): void {
    this.renderIcons();
  }

  toggleAccount(): void {
    this.accountOpen = !this.accountOpen;
  }

  logout(): void {
    localStorage.removeItem('currentUser');
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