import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

interface Word {
  id: number;
  word: string;
  translation: string;
}

@Component({
  selector: 'app-lernmodus',
  imports: [CommonModule, RouterLink],
  templateUrl: './lernmodus.html',
  styleUrl: './lernmodus.css'
})
export class Lernmodus {

  topicId = 0;
  topicName = '';

  words: Word[] = [];

  currentIndex = 0;
  showAnswer = false;
  isFinished = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.topicId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTopic();
    this.loadWords();
  }

  private loadTopic() {
    const savedTopics = localStorage.getItem('topics');

    if (!savedTopics) return;

    const topics = JSON.parse(savedTopics);

    const topic = topics.find((topic: any) => topic.id === this.topicId);

    if (topic) {
      this.topicName = topic.name;
    }
  }

  private loadWords() {
    const savedWords = localStorage.getItem(`words_${this.topicId}`);

    if (!savedWords) return;

    this.words = JSON.parse(savedWords);
  }

  get currentWord(): Word | undefined {
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