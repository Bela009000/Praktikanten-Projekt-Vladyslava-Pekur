import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectorRef

} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../../services/data.service';

interface MemoryTile {
  tileId: number;
  cardId: string;
  text: string;
  isFlipped: boolean;
  isMatched: boolean;
}


@Component({
  selector: 'app-memory-game',
  imports: [CommonModule],
  templateUrl: './memory-game.html',
  styleUrl: './memory-game.css'
})
export class MemoryGame implements OnInit, OnDestroy {

  @Input() cards: Card[] = [];
  @Input() topicName = '';
  @Output() back = new EventEmitter<void>();

  tiles: MemoryTile[] = [];
  flippedTiles: MemoryTile[] = [];
  matchedPairsCount = 0;
  totalPairs = 0;

  moves = 0;
  elapsedSeconds = 0;
  isFinished = false;
  isBusy = false;

  private timerHandle: any = null;
  private nextTileId = 0;


  ngOnInit() {
    this.setupGame();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  private getPairCount(): number {
    const width = window.innerWidth;
    const desired = width < 600 ? 6 : 8;
    return Math.min(desired, this.cards.length);
  }

  private setupGame() {
    const pairCount = this.getPairCount();
    const selectedCards = this.shuffleArray([...this.cards]).slice(0, pairCount);

    const rawTiles: MemoryTile[] = [];

    for (const card of selectedCards) {
      rawTiles.push({
        tileId: this.nextTileId++,
        cardId: card.id,
        text: card.question,
        isFlipped: false,
        isMatched: false
      });

      rawTiles.push({
        tileId: this.nextTileId++,
        cardId: card.id,
        text: card.answer,
        isFlipped: false,
        isMatched: false
      });
    }

    this.tiles = this.shuffleArray(rawTiles);
    this.totalPairs = selectedCards.length;
    this.matchedPairsCount = 0;
    this.moves = 0;
    this.elapsedSeconds = 0;
    this.isFinished = false;
    this.isBusy = false;
    this.flippedTiles = [];

    this.startTimer();
    this.changeDetectorRef.detectChanges();

  }

  private startTimer() {
     this.stopTimer();
    this.timerHandle = setInterval(() => {
      this.elapsedSeconds++;
      this.changeDetectorRef.detectChanges();
    }, 1000);
  }
  

  private stopTimer() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  selectTile(tile: MemoryTile) {
    if (this.isBusy || tile.isFlipped || tile.isMatched) {
      return;
    }

    tile.isFlipped = true;
    this.flippedTiles.push(tile);
    this.changeDetectorRef.detectChanges();

    if (this.flippedTiles.length === 2) {
      this.moves++;
      this.isBusy = true;

      const [first, second] = this.flippedTiles;

      if (first.cardId === second.cardId) {
        first.isMatched = true;
        second.isMatched = true;
        this.matchedPairsCount++;
        this.flippedTiles = [];
        this.isBusy = false;
        this.changeDetectorRef.detectChanges();

        if (this.matchedPairsCount === this.totalPairs) {
          this.finishGame();
        }
      } else {
        this.changeDetectorRef.detectChanges();

        setTimeout(() => {
          first.isFlipped = false;
          second.isFlipped = false;
          this.flippedTiles = [];
          this.isBusy = false;
          this.changeDetectorRef.detectChanges();
        }, 900);
      }
    }
  }

  private finishGame() {
    this.isFinished = true;
    this.stopTimer();
    this.changeDetectorRef.detectChanges();
  }

  playAgain() {
    this.setupGame();
  }

  goBack() {
    this.stopTimer();
    this.back.emit();
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.elapsedSeconds / 60);
    const seconds = this.elapsedSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  get gridColumns(): number {
    return this.tiles.length > 12 ? 4 : this.tiles.length > 8 ? 4 : 3;
  }

  private shuffleArray<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  @HostListener('window:resize')
  onResize() {
    // Größe bleibt während des laufenden Spiels stabil,
    // wird erst beim nächsten Start neu berechnet.
  }
    constructor(private changeDetectorRef: ChangeDetectorRef) {}
}