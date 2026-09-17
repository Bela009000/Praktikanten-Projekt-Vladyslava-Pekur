import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Topic {
  id: number;
  name: string;
}

interface Word {
  id: number;
  word: string;
  translation: string;
}

@Component({
  selector: 'app-quiz',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './quiz.html',
  styleUrl: './quiz.css'
})
export class Quiz {

  topics: Topic[] = [];
  words: Word[] = [];

  selectedTopicId: number | null = null;
  selectedTopicName = '';

  currentIndex = 0;
  correctAnswers = 0;

  userAnswer = '';

  showAnswer = false;
  answerIsCorrect = false;

  isStarted = false;
  isFinished = false;

  ngOnInit() {
    this.loadTopics();
  }

  private loadTopics() {
    const savedTopics = localStorage.getItem('topics');

    if (!savedTopics) {
      return;
    }

    const allTopics: Topic[] = JSON.parse(savedTopics);

    this.topics = allTopics.filter(topic => {
      const savedWords = localStorage.getItem(`words_${topic.id}`);

      if (!savedWords) {
        return false;
      }

      const words: Word[] = JSON.parse(savedWords);

      return words.length > 0;
    });
  }

  startQuiz() {
    if (this.selectedTopicId === null) {
      return;
    }

    const savedWords = localStorage.getItem(
      `words_${this.selectedTopicId}`
    );

    if (!savedWords) {
      return;
    }

    this.words = JSON.parse(savedWords);

    if (this.words.length === 0) {
      return;
    }

    const selectedTopic = this.topics.find(
      topic => topic.id === this.selectedTopicId
    );

    this.selectedTopicName = selectedTopic?.name || '';

    this.words = this.shuffle([...this.words]);

    this.currentIndex = 0;
    this.correctAnswers = 0;

    this.userAnswer = '';

    this.showAnswer = false;
    this.answerIsCorrect = false;

    this.isStarted = true;
    this.isFinished = false;
  }

  checkAnswer() {
    if (!this.currentWord) {
      return;
    }

    if (this.userAnswer.trim() === '') {
      return;
    }

    const userAnswer = this.normalizeAnswer(
      this.userAnswer
    );

    const correctAnswer = this.normalizeAnswer(
      this.currentWord.translation
    );

    this.answerIsCorrect = userAnswer === correctAnswer;

    this.showAnswer = true;
  }

  nextQuestion() {
    if (this.answerIsCorrect) {
      this.correctAnswers++;
    }

    this.userAnswer = '';
    this.showAnswer = false;
    this.answerIsCorrect = false;

    if (this.currentIndex < this.words.length - 1) {
      this.currentIndex++;
    } else {
      this.isFinished = true;
    }
  }

  restartQuiz() {
    this.words = this.shuffle([...this.words]);

    this.currentIndex = 0;
    this.correctAnswers = 0;

    this.userAnswer = '';

    this.showAnswer = false;
    this.answerIsCorrect = false;

    this.isStarted = true;
    this.isFinished = false;
  }

  backToSelection() {
    this.isStarted = false;
    this.isFinished = false;

    this.words = [];

    this.currentIndex = 0;
    this.correctAnswers = 0;

    this.userAnswer = '';

    this.showAnswer = false;
    this.answerIsCorrect = false;
  }

  get currentWord(): Word | undefined {
    return this.words[this.currentIndex];
  }

  get progress(): number {
    if (this.words.length === 0) {
      return 0;
    }

    return Math.round(
      ((this.currentIndex + 1) / this.words.length) * 100
    );
  }

  get resultPercent(): number {
    if (this.words.length === 0) {
      return 0;
    }

    return Math.round(
      (this.correctAnswers / this.words.length) * 100
    );
  }

  private normalizeAnswer(answer: string): string {
    return answer
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private shuffle(words: Word[]): Word[] {
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [words[i], words[j]] = [
        words[j],
        words[i]
      ];
    }

    return words;
  }
}