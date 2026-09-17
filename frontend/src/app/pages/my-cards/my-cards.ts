import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Topic {
  id: number;
  name: string;
}

interface LernkartenTopic {
  id: number;
  name: string;
  totalCards: number;
  learnedCards: number;
  progress: number;
}

@Component({
  selector: 'app-my-cards',
  imports: [CommonModule, RouterLink],
  templateUrl: './my-cards.html',
  styleUrl: './my-cards.css'
})
export class MyCards {

  topics: LernkartenTopic[] = [];

  ngOnInit() {
    this.loadTopics();
  }

  private loadTopics() {
    const savedTopics = localStorage.getItem('topics');

    if (!savedTopics) {
      return;
    }

    const allTopics: Topic[] = JSON.parse(savedTopics);

    this.topics = allTopics
      .map(topic => {

        const savedWords = localStorage.getItem(
          `words_${topic.id}`
        );

        if (!savedWords) {
          return null;
        }

        const words = JSON.parse(savedWords);

        if (words.length === 0) {
          return null;
        }

        const savedProgress = localStorage.getItem(
          `cards_progress_${topic.id}`
        );

        const learnedIds: number[] = savedProgress
          ? JSON.parse(savedProgress)
          : [];

        const learnedCards = words.filter((word: any) =>
          learnedIds.includes(word.id)
        ).length;

        const progress = Math.round(
          (learnedCards / words.length) * 100
        );

        return {
          id: topic.id,
          name: topic.name,
          totalCards: words.length,
          learnedCards: learnedCards,
          progress: progress
        };
      })
      .filter(
        (topic): topic is LernkartenTopic =>
          topic !== null
      );
  }
}