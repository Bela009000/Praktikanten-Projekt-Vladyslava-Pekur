import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService, Card } from '../../services/data.service';

interface Question {
  card: Card;
  options: string[];
}

@Component({
  selector: 'app-multiple-choice',
  imports: [CommonModule, RouterLink],
  templateUrl: './multiple-choice.html',
  styleUrl: './multiple-choice.css'
})
export class MultipleChoice {

  topicId = '';
  topicName = '';

  questions: Question[] = [];
  currentIndex = 0;

  selectedOption: string | null = null;
  isAnswered = false;

  correctAnswers = 0;
  isLoading = true;
  isFinished = false;

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.topicId = this.route.snapshot.paramMap.get('id') || '';
    await this.loadQuestions();
  }

  private async loadQuestions() {
    this.isLoading = true;

    try {
      const cards = await this.dataService.getCards(this.topicId);

      if (cards.length < 2) {
        this.isLoading = false;
        this.changeDetectorRef.detectChanges();
        return;
      }

      const shuffledCards = this.shuffle([...cards]);

      this.questions = shuffledCards.map(card => {
        const wrongAnswers = this.shuffle(
          cards.filter(other => other.id !== card.id)
        )
          .slice(0, 3)
          .map(other => other.answer);

        const options = this.shuffle([card.answer, ...wrongAnswers]);

        return { card, options };
      });

      this.currentIndex = 0;
      this.correctAnswers = 0;
      this.selectedOption = null;
      this.isAnswered = false;
      this.isFinished = false;

    } catch (error) {
      console.error('MULTIPLE CHOICE LOAD ERROR:', error);
    } finally {
      this.isLoading = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  selectOption(option: string) {
    if (this.isAnswered) {
      return;
    }

    this.selectedOption = option;
    this.isAnswered = true;

    if (option === this.currentQuestion?.card.answer) {
      this.correctAnswers++;
    }
  }

  async nextQuestion() {
    this.selectedOption = null;
    this.isAnswered = false;

    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
    } else {
      this.isFinished = true;

      try {
        await this.dataService.addQuizAttempt(
          this.topicId,
          this.correctAnswers,
          this.questions.length
        );
      } catch (error) {
        console.error('MULTIPLE CHOICE SAVE ERROR:', error);
      }
    }
  }

  restart() {
    this.loadQuestions();
  }

  isCorrectOption(option: string): boolean {
    return option === this.currentQuestion?.card.answer;
  }

  get currentQuestion(): Question | undefined {
    return this.questions[this.currentIndex];
  }

  get progress(): number {
    if (this.questions.length === 0) {
      return 0;
    }
    return Math.round(((this.currentIndex + 1) / this.questions.length) * 100);
  }

  get resultPercent(): number {
    if (this.questions.length === 0) {
      return 0;
    }
    return Math.round((this.correctAnswers / this.questions.length) * 100);
  }

  private shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}