import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DataService, Card } from '../../services/data.service';

@Component({
  selector: 'app-cards',
  imports: [CommonModule, RouterLink],
  templateUrl: './cards.html',
  styleUrl: './cards.css'
})
export class Cards {

  topicId = '';
  topicName = '';

  cards: Card[] = [];
  allCards: Card[] = [];

  currentIndex = 0;
  isFlipped = false;
  isFinished = false;

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.topicId =
      this.route.snapshot.paramMap.get('id') || '';

    if (!this.topicId) {
      return;
    }

    await this.loadTopic();
    await this.loadCards();

    this.changeDetectorRef.detectChanges();
  }

  private async loadTopic() {
    try {
      const topics = await this.dataService.getTopics();

      const topic = topics.find(
        topic => topic.id === this.topicId
      );

      if (topic) {
        this.topicName = topic.name;
        this.changeDetectorRef.detectChanges();
      }

    } catch (error) {
      console.error('LOAD TOPIC ERROR:', error);
    }
  }

  private async loadCards() {
    try {
      const cards = await this.dataService.getCards(
        this.topicId
      );

      this.allCards = [...cards];
      this.cards = [...cards];

      this.changeDetectorRef.detectChanges();

      console.log('CARDS:', this.cards);
      console.log('CARDS COUNT:', this.cards.length);

    } catch (error) {
      console.error('LOAD CARDS ERROR:', error);
    }
  }

  get currentCard(): Card | undefined {
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

  async markNotLearned() {
    if (!this.currentCard) {
      return;
    }

    this.currentCard.learned = false;

    try {
      await this.dataService.setCardLearned(
        this.topicId,
        this.currentCard.id,
        false
      );

      this.nextCard();
      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error(error);
    }
  }

  async markLearned() {
    if (!this.currentCard) {
      return;
    }

    this.currentCard.learned = true;

    try {
      await this.dataService.setCardLearned(
        this.topicId,
        this.currentCard.id,
        true
      );

      this.nextCard();
      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error(error);
    }
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
    if (
      this.currentIndex <= 0 ||
      this.isFinished
    ) {
      return;
    }

    this.currentIndex--;
    this.isFlipped = false;

    this.changeDetectorRef.detectChanges();
  }

  shuffleCards() {
    if (this.cards.length <= 1) {
      return;
    }

    for (
      let i = this.cards.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(Math.random() * (i + 1));

      [this.cards[i], this.cards[j]] = [
        this.cards[j],
        this.cards[i]
      ];
    }

    this.currentIndex = 0;
    this.isFlipped = false;
    this.isFinished = false;

    this.changeDetectorRef.detectChanges();
  }

  async restart() {
    this.allCards.forEach(card => {
      card.learned = false;
    });

    try {
      for (const card of this.allCards) {
        await this.dataService.setCardLearned(
          this.topicId,
          card.id,
          false
        );
      }

      this.cards = [...this.allCards];
      this.currentIndex = 0;
      this.isFlipped = false;
      this.isFinished = false;

      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error(error);
    }
  }

  continueUnknown() {
    const unknownCards =
      this.allCards.filter(
        card => !card.learned
      );

    if (unknownCards.length === 0) {
      return;
    }

    this.cards = [...unknownCards];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.isFinished = false;

    this.changeDetectorRef.detectChanges();
  }
}