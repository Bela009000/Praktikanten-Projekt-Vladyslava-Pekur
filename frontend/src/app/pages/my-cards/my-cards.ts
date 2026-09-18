import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';

interface LernkartenTopic {
  id: string;
  name: string;
  totalCards: number;
  learnedCards: number;
  progress: number;
  color: string;
}

@Component({
  selector: 'app-my-cards',
  imports: [CommonModule, RouterLink],
  templateUrl: './my-cards.html',
  styleUrl: './my-cards.css'
})
export class MyCards {

  topics: LernkartenTopic[] = [];

  private topicColors = [
    '#7c3aed',
    '#a855f7',
    '#c026d3',
    '#8b5cf6',
    '#6d28d9'
  ];

  constructor(
    private dataService: DataService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadTopics();
  }

  private async loadTopics() {
    try {
      const allTopics = await this.dataService.getTopics();

      console.log('MY CARDS TOPICS:', allTopics);

      const topicResults = await Promise.all(
        allTopics.map(async (topic, index) => {
          const cards = await this.dataService.getCards(topic.id);

          console.log(
            'MY CARDS:',
            topic.name,
            cards
          );

          if (cards.length === 0) {
            return null;
          }

          const learnedCards = cards.filter(
            card => card.learned
          ).length;

          const progress = Math.round(
            (learnedCards / cards.length) * 100
          );

          return {
            id: topic.id,
            name: topic.name,
            totalCards: cards.length,
            learnedCards,
            progress,
            color: this.topicColors[
              index % this.topicColors.length
            ]
          };
        })
      );

      this.topics = topicResults.filter(
        (topic): topic is LernkartenTopic =>
          topic !== null
      );

      console.log(
        'MY CARDS RESULT:',
        this.topics
      );

      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error('MY CARDS ERROR:', error);

      this.changeDetectorRef.detectChanges();
    }
  }
}