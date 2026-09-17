import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
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

  ngOnInit() {
    const savedUser = localStorage.getItem('currentUser');

    if (savedUser) {
      this.username = savedUser;
    }

    setTimeout(() => {
      this.renderIcons();
    });
  }

  toggleAccount() {
    this.accountOpen = !this.accountOpen;

    if (this.accountOpen) {
      setTimeout(() => {
        this.renderIcons();
      });
    }
  }

  logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  }

  private renderIcons() {
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
  }
}