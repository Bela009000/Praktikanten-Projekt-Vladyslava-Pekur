import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import {
  createIcons,
  PlayingCards,
  User,
  Library,
  History,
  PlayingCardsFan,
  LogOut
} from 'lucide';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  imports: [RouterOutlet, RouterLink, CommonModule]
})
export class App {

  username = '';
  accountOpen = false;

  constructor(private router: Router) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('currentUser');

    if (savedUser) {
      this.username = savedUser;
    }

    setTimeout(() => {
      createIcons({
        icons: {
          PlayingCards,
          User,
          Library,
          History,
          PlayingCardsFan,
          LogOut
        }
      });
    });
  }

  toggleAccount() {
    this.accountOpen = !this.accountOpen;

    setTimeout(() => {
      createIcons({
        icons: {
          PlayingCards,
          User,
          Library,
          History,
          PlayingCardsFan,
          LogOut
        }
      });
    });
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}