import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DataService, Card } from '../../services/data.service';

@Component({
  selector: 'app-cards',
  imports: [CommonModule, RouterLink],
  templateUrl: './cards.html',
  styleUrl: './cards.css'
})
export class Cards implements OnInit, OnDestroy {
  topicId = '';
  topicName = '';

  cards: Card[] = [];
  allCards: Card[] = [];

  currentIndex = 0;
  isFlipped = false;
  isFinished = false;
  isReversed = false;
  loading = true;

  private busy = false;
  private destroyed = false;

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService,
    private changeDetectorRef: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>
  ) {}

  async ngOnInit(): Promise<void> {
    this.topicId = this.route.snapshot.paramMap.get('id') || '';

    if (this.topicId && (await this.loadTopic())) {
      await this.loadCards();
    }

    this.loading = false;
    this.update();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  private update(): void {
    if (!this.destroyed) {
      this.changeDetectorRef.detectChanges();
    }
  }

  private changeCard(change: () => void): void {
    const flashcard =
      this.host.nativeElement.querySelector<HTMLElement>('.flashcard');

    if (flashcard) {
      flashcard.style.transition = 'none';
    }

    this.isFlipped = false;

    change();
    this.update();

    if (flashcard) {
      void flashcard.offsetWidth;
      flashcard.style.transition = '';
    }
  }

  private async loadTopic(): Promise<boolean> {
    try {
      const topics = await this.dataService.getTopics();
      const topic = topics.find(item => item.id === this.topicId);

      if (!topic) {
        return false;
      }

      this.topicName = topic.name;
    } catch (error) {
      console.error('LOAD TOPIC ERROR:', error);
    }

    return true;
  }

  private async loadCards(): Promise<void> {
    try {
      const cards = await this.dataService.getCards(this.topicId);

      this.allCards = cards.map(card => ({ ...card }));
      this.cards = [...this.allCards];
    } catch (error) {
      console.error('LOAD CARDS ERROR:', error);
    }
  }

  get currentCard(): Card | undefined {
    return this.cards[this.currentIndex];
  }

  get nextCardPreview(): Card | undefined {
    return this.cards[this.currentIndex + 1];
  }

  get learnedCount(): number {
    return this.allCards.filter(card => card.learned).length;
  }

  get progress(): number {
    if (this.allCards.length === 0) {
      return 0;
    }

    return Math.round((this.learnedCount / this.allCards.length) * 100);
  }

  toggleLanguage(): void {
    this.changeCard(() => {
      this.isReversed = !this.isReversed;
    });
  }

  flipCard(): void {
    if (!this.isFinished && !this.busy && this.currentCard) {
      this.isFlipped = !this.isFlipped;
    }
  }

  markNotLearned(): Promise<void> {
    return this.mark(false);
  }

  markLearned(): Promise<void> {
    return this.mark(true);
  }

  private async mark(learned: boolean): Promise<void> {
    const card = this.currentCard;

    if (!card || this.busy || this.isFinished) {
      return;
    }

    this.busy = true;

    const previous = card.learned;

    card.learned = learned;

    try {
      await this.dataService.setCardLearned(this.topicId, card.id, learned);

      this.changeCard(() => {
        if (this.currentIndex < this.cards.length - 1) {
          this.currentIndex++;
        } else {
          this.isFinished = true;
        }
      });
    } catch (error) {
      card.learned = previous;

      console.error('MARK CARD ERROR:', error);
    } finally {
      this.busy = false;
      this.update();
    }
  }

  previousCard(): void {
    if (this.currentIndex <= 0 || this.isFinished || this.busy) {
      return;
    }

    this.changeCard(() => {
      this.currentIndex--;
    });
  }

  shuffleCards(): void {
    if (this.cards.length <= 1 || this.busy) {
      return;
    }

    const shuffled = [...this.cards];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    this.changeCard(() => {
      this.cards = shuffled;
      this.currentIndex = 0;
      this.isFinished = false;
    });
  }

  async restart(): Promise<void> {
    if (this.busy) {
      return;
    }

    this.busy = true;

    try {
      const learnedIds = this.allCards
        .filter(card => card.learned)
        .map(card => card.id);

      await this.dataService.setCardsLearned(this.topicId, learnedIds, false);

      this.allCards.forEach(card => {
        card.learned = false;
      });

      this.changeCard(() => {
        this.cards = [...this.allCards];
        this.currentIndex = 0;
        this.isFinished = false;
      });
    } catch (error) {
      console.error('RESTART ERROR:', error);
    } finally {
      this.busy = false;
      this.update();
    }
  }

  continueUnknown(): void {
    const unknownCards = this.allCards.filter(card => !card.learned);

    if (unknownCards.length === 0) {
      return;
    }

    this.changeCard(() => {
      this.cards = unknownCards;
      this.currentIndex = 0;
      this.isFinished = false;
    });
  }
}