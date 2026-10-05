import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';

import type {
  StudySessionResult,
  Topic
} from '../../services/data.service';

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

  // Последние 3 завершённые StudySession
  lastStudySessionResults: StudySessionResult[] = [];

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

    const user =
      await this.authService.waitForAuth();

    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.username =
      user.displayName || '';

    await Promise.all([
      this.loadTopics(),
      this.loadLastStudySessions()
    ]);

    this.changeDetectorRef.detectChanges();
  }

  private async loadTopics() {

    try {

      const allTopics =
        await this.dataService.getTopics();

      const topicResults =
        await Promise.all(
          allTopics.map(
            async topic => {

              const cards =
                await this.dataService.getCards(
                  topic.id
                );

              return {
                ...topic,
                cardCount: cards.length
              };
            }
          )
        );

      this.topics =
        topicResults;

      this.recentTopics =
        [...topicResults]
          .sort(
            (a, b) => {

              const timeA =
                a.createdAt?.toMillis() || 0;

              const timeB =
                b.createdAt?.toMillis() || 0;

              return timeB - timeA;
            }
          )
          .slice(0, 3);

      this.totalCards =
        topicResults.reduce(
          (total, topic) =>
            total + topic.cardCount,
          0
        );

      this.quizCount =
        await this.dataService.getQuizCount();

    } catch (error) {

      console.error(
        'HOME LOAD TOPICS ERROR:',
        error
      );
    }
  }

  private async loadLastStudySessions() {

    try {

      this.lastStudySessionResults =
        await this.dataService
          .getLastStudySessionResults(3);

    } catch (error) {

      console.error(
        'HOME LOAD STUDY SESSIONS ERROR:',
        error
      );

      this.lastStudySessionResults = [];
    }
  }

  getStudyModeLabel(
    mode: string
  ): string {

    const labels: Record<string, string> = {
      lernmodus: 'Lernmodus',
      quiz: 'Quiz',
      memory: 'Memory',
      mc: 'Multiple Choice'
    };

    return labels[mode] || mode;
  }

  getSessionDate(
    timestamp: any
  ): string {

    if (!timestamp) {
      return '';
    }

    const date =
      timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

    return new Intl.DateTimeFormat(
      'de-DE',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(date);
  }

  toggleAccount() {
    this.accountOpen =
      !this.accountOpen;
  }

  async logout() {

    await this.authService.logout();

    this.router.navigate([
      '/login'
    ]);
  }
}