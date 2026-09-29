import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import type { Topic } from '../../services/data.service';

interface HomeTopic extends Topic {
  cardCount: number;
}

@Component({
  imports: [RouterLink, CommonModule],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {

  username = '';

  topics: HomeTopic[] = [];
  recentTopics: HomeTopic[] = [];

  totalCards = 0;
  quizCount = 0;

  accountOpen = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private dataService: DataService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    const user = await this.authService.waitForAuth();

    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.username = user.displayName || '';

    await this.loadTopics();

    this.changeDetectorRef.detectChanges();
  }

  private async loadTopics() {
    try {
      const allTopics = await this.dataService.getTopics();

      const topicResults = await Promise.all(
        allTopics.map(async topic => {

          const cards = await this.dataService.getCards(topic.id);

          return {
            ...topic,
            cardCount: cards.length
          };
        })
      );

      this.topics = topicResults;

      this.recentTopics = [
        ...topicResults
      ].slice(-3).reverse();

      this.totalCards = topicResults.reduce(
        (total, topic) => total + topic.cardCount,
        0
      );

      this.quizCount = await this.dataService.getQuizCount();

      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error('HOME LOAD ERROR:', error);
    }
  }

  toggleAccount() {
    this.accountOpen = !this.accountOpen;
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}