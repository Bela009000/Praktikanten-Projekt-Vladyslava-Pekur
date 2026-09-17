import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

interface Word {
  id: number;
  word: string;
  translation: string;
}

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  learned: boolean;
}

@Component({
  selector: 'app-cards',
  imports: [CommonModule, RouterLink],
  templateUrl: './cards.html',
  styleUrl: './cards.css'
})
export class Cards {

  topicId = 0;
  topicName = '';

  cards: Flashcard[] = [];
  allCards: Flashcard[] = [];

  currentIndex = 0;
  isFlipped = false;
  isFinished = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.topicId = Number(
      this.route.snapshot.paramMap.get('id')
    );

    this.loadTopic();
    this.loadCards();
  }

  private loadTopic() {
    const savedTopics = localStorage.getItem('topics');

    if (!savedTopics) {
      return;
    }

    const topics = JSON.parse(savedTopics);

    const topic = topics.find(
      (topic: any) => topic.id === this.topicId
    );

    if (topic) {
      this.topicName = topic.name;
    }
  }

  private loadCards() {
    const savedWords = localStorage.getItem(
      `words_${this.topicId}`
    );

    if (!savedWords) {
      return;
    }

    const words: Word[] = JSON.parse(savedWords);

    const savedProgress = localStorage.getItem(
      `cards_progress_${this.topicId}`
    );

    const learnedIds: number[] = savedProgress
      ? JSON.parse(savedProgress)
      : [];

    this.allCards = words.map(word => ({
      id: word.id,
      question: word.word,
      answer: word.translation,
      learned: learnedIds.includes(word.id)
    }));

    const savedOrder = localStorage.getItem(
      `cards_order_${this.topicId}`
    );

    if (savedOrder) {
      const order: number[] = JSON.parse(savedOrder);

      const orderedCards = order
        .map(id => this.allCards.find(card => card.id === id))
        .filter((card): card is Flashcard => card !== undefined);

      const missingCards = this.allCards.filter(
        card => !order.includes(card.id)
      );

      this.cards = [
        ...orderedCards,
        ...missingCards
      ];
    } else {
      this.cards = [...this.allCards];
    }
  }

  get currentCard(): Flashcard {
    return this.cards[this.currentIndex];
  }

  get learnedCount(): number {
    return this.allCards.filter(
      card => card.learned
    ).length;
  }

  get progress(): number {
    if (this.allCards.length === 0) {
      return 0;
    }

    return Math.round(
      (this.learnedCount / this.allCards.length) * 100
    );
  }

  flipCard() {
    if (!this.isFinished && this.currentCard) {
      this.isFlipped = !this.isFlipped;
    }
  }

  markNotLearned() {
    if (!this.currentCard) {
      return;
    }

    this.currentCard.learned = false;

    this.saveProgress();
    this.nextCard();
  }

  markLearned() {
    if (!this.currentCard) {
      return;
    }

    this.currentCard.learned = true;

    this.saveProgress();
    this.nextCard();
  }

  private nextCard() {
    this.isFlipped = false;

    if (this.currentIndex < this.cards.length - 1) {
      this.currentIndex++;
    } else {
      this.isFinished = true;
    }
  }

  previousCard() {
    if (this.currentIndex <= 0 || this.isFinished) {
      return;
    }

    this.currentIndex--;
    this.isFlipped = false;
  }

  shuffleCards() {
    if (this.cards.length <= 1) {
      return;
    }

    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [this.cards[i], this.cards[j]] = [
        this.cards[j],
        this.cards[i]
      ];
    }

    this.currentIndex = 0;
    this.isFlipped = false;
    this.isFinished = false;

    this.saveOrder();
  }

  restart() {
    this.allCards.forEach(card => {
      card.learned = false;
    });

    this.saveProgress();

    this.cards = [...this.cards];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.isFinished = false;
  }

  continueUnknown() {
    const unknownCards = this.allCards.filter(
      card => !card.learned
    );

    if (unknownCards.length === 0) {
      return;
    }

    this.cards = [...unknownCards];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.isFinished = false;
  }

  private saveProgress() {
    const learnedIds = this.allCards
      .filter(card => card.learned)
      .map(card => card.id);

    localStorage.setItem(
      `cards_progress_${this.topicId}`,
      JSON.stringify(learnedIds)
    );
  }

  private saveOrder() {
    const order = this.cards.map(card => card.id);

    localStorage.setItem(
      `cards_order_${this.topicId}`,
      JSON.stringify(order)
    );
  }
}