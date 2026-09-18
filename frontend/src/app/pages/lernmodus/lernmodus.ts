import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DataService, Card } from '../../services/data.service';

@Component({
  selector: 'app-lernmodus',
  imports: [CommonModule, RouterLink],
  templateUrl: './lernmodus.html',
  styleUrl: './lernmodus.css'
})
export class Lernmodus {

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

    if (!this.topicId) {
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
      }
    } catch (error) {
      console.error(error);
    }
  }

  private async loadWords() {
    try {
      this.words = await this.dataService.getCards(
        this.topicId
      );

      this.changeDetectorRef.detectChanges();
    } catch (error) {
      console.error(error);
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

    for (
      let i = this.words.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(Math.random() * (i + 1));

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