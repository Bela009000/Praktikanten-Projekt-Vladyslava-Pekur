import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService, Topic, Card } from '../../services/data.service';

@Component({
  selector: 'app-quiz',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './quiz.html',
  styleUrl: './quiz.css'
})
export class Quiz {

  topics: Topic[] = [];
  words: Card[] = [];

  selectedTopicId: string | null = null;
  selectedTopicName = '';

  currentIndex = 0;
  correctAnswers = 0;

  userAnswer = '';

  showAnswer = false;
  answerIsCorrect = false;

  isStarted = false;
  isFinished = false;

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

      const topicResults = await Promise.all(
        allTopics.map(async topic => {
          const cards = await this.dataService.getCards(topic.id);

          return cards.length > 0 ? topic : null;
        })
      );

      this.topics = topicResults.filter(
        (topic): topic is Topic =>
          topic !== null
      );

      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error('QUIZ LOAD TOPICS ERROR:', error);
    }
  }

  async startQuiz() {
    if (this.selectedTopicId === null) {
      return;
    }

    try {
      const cards = await this.dataService.getCards(
        this.selectedTopicId
      );

      if (cards.length === 0) {
        return;
      }

      this.words = this.shuffle([...cards]);

      const selectedTopic = this.topics.find(
        topic => topic.id === this.selectedTopicId
      );

      this.selectedTopicName = selectedTopic?.name || '';

      this.currentIndex = 0;
      this.correctAnswers = 0;

      this.userAnswer = '';

      this.showAnswer = false;
      this.answerIsCorrect = false;

      this.isStarted = true;
      this.isFinished = false;

      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error('QUIZ START ERROR:', error);
    }
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
      this.currentWord.answer
    );

    this.answerIsCorrect = userAnswer === correctAnswer;

    this.showAnswer = true;
  }

  async nextQuestion() {
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

    try {
      await this.dataService.addQuizAttempt(
        this.selectedTopicId!,
        this.correctAnswers,
        this.words.length
      );
    } catch (error) {
      console.error('QUIZ SAVE ERROR:', error);
    }
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

  get currentWord(): Card | undefined {
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

  private shuffle(words: Card[]): Card[] {
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