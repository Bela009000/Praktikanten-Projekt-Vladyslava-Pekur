import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import {
  createIcons,
  PlayingCards,
  PlayingCardsFan,
  GraduationCap,
  Brain,
  User,
  Library,
  History,
  LogOut
} from 'lucide';

import '@fontsource/open-sans';

interface Topic {
  id: number;
  name: string;
}

@Component({
  imports: [RouterLink, CommonModule],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  username = localStorage.getItem('currentUser') || '';
  topics: Topic[] = [];
  recentTopics: Topic[] = [];
  accountOpen = false;

  constructor(private router: Router) {}

  ngOnInit() {
    const saved = localStorage.getItem('topics');

    if (saved) {
      this.topics = JSON.parse(saved);
      this.recentTopics = this.topics.slice(-3).reverse();
    }
  }

  ngAfterViewInit() {
    createIcons({
      icons: {
        PlayingCards,
        PlayingCardsFan,
        GraduationCap,
        Brain,
        User,
        Library,
        History,
        LogOut
      }
    });
  }

  toggleAccount() {
    this.accountOpen = !this.accountOpen;
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}