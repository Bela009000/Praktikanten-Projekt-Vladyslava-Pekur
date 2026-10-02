import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DataService, Card } from '../../services/data.service';

@Component({
  selector: 'app-trainingsmodus',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './trainingsmodus.html',
  styleUrl: './trainingsmodus.css'
})
export class Trainingsmodus {

  topicId = '';
  topicName = '';

  words: Card[] = [];

  currentIndex = 0;
  showAnswer = false;
  isFinished = false;

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.topicId =
      this.route.snapshot.paramMap.get('id') || '';

    console.log('Trainingsmodus topicId:', this.topicId);

    if (!this.topicId) {
      console.error('Keine topicId in der Route gefunden.');
      return;
    }

    await this.loadTopic();
    await this.loadWords();

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
      } else {
        console.error(
          'Thema nicht gefunden:',
          this.topicId
        );
      }

    } catch (error) {
      console.error(
        'Fehler beim Laden des Themas:',
        error
      );
    }
  }

  private async loadWords() {
    try {
      this.words = await this.dataService.getCards(
        this.topicId
      );

      console.log(
        'Trainingsmodus Karten:',
        this.words
      );

      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error(
        'Fehler beim Laden der Karten:',
        error
      );
    }
  }

  get currentWord(): Card | undefined {
    return this.words[this.currentIndex];
  }

  showAnswerNow() {
    this.showAnswer = true;
  }

  nextCard() {
    this.showAnswer = false;

    if (this.currentIndex < this.words.length - 1) {
      this.currentIndex++;
    } else {
      this.isFinished = true;
    }
  }

  previousCard() {
    if (this.currentIndex <= 0) {
      return;
    }

    this.currentIndex--;
    this.showAnswer = false;
  }

  shuffleCards() {
    if (this.words.length <= 1) {
      return;
    }

    for (let i = this.words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [this.words[i], this.words[j]] = [
        this.words[j],
        this.words[i]
      ];
    }

    this.currentIndex = 0;
    this.showAnswer = false;
    this.isFinished = false;
  }

  restart() {
    this.currentIndex = 0;
    this.showAnswer = false;
    this.isFinished = false;
  }
}