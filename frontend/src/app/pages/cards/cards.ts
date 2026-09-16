import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { createIcons, ArrowLeft } from 'lucide';

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
  topicName = 'Mathematik';

  cards: Flashcard[] = [
    {
      id: 1,
      question: 'Was ist HTML?',
      answer: 'HyperText Markup Language',
      learned: false
    },
    {
      id: 2,
      question: 'Was bedeutet CSS?',
      answer: 'Cascading Style Sheets',
      learned: false
    },
    {
      id: 3,
      question: 'Was ist TypeScript?',
      answer: 'Eine Programmiersprache, die auf JavaScript basiert.',
      learned: false
    },
    {
      id: 4,
      question: 'Was ist Angular?',
      answer: 'Ein Framework zur Entwicklung von Webanwendungen.',
      learned: false
    },
    {
      id: 5,
      question: 'Was ist eine Variable?',
      answer: 'Ein Speicherplatz, in dem ein Wert gespeichert werden kann.',
      learned: false
    },
    {
      id: 6,
      question: 'Was ist eine Funktion?',
      answer: 'Ein wiederverwendbarer Block von Code.',
      learned: false
    },
    {
      id: 7,
      question: 'Was ist eine API?',
      answer: 'Eine Schnittstelle, über die Programme miteinander kommunizieren.',
      learned: false
    },
    {
      id: 8,
      question: 'Was ist JSON?',
      answer: 'Ein leichtgewichtiges Format zum Speichern und Übertragen von Daten.',
      learned: false
    },
    {
      id: 9,
      question: 'Was ist eine Datenbank?',
      answer: 'Ein System zur strukturierten Speicherung von Daten.',
      learned: false
    },
    {
      id: 10,
      question: 'Was bedeutet HTTP?',
      answer: 'Hypertext Transfer Protocol.',
      learned: false
    }
  ];

  currentIndex = 0;
  isFlipped = false;

  get currentCard(): Flashcard {
    return this.cards[this.currentIndex];
  }

  get learnedCount(): number {
    return this.cards.filter(card => card.learned).length;
  }

  get progress(): number {
    return Math.round((this.learnedCount / this.cards.length) * 100);
  }

  ngAfterViewInit() {
    createIcons({
      icons: {
        ArrowLeft
      }
    });
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
  }

  markNotLearned() {
    this.currentCard.learned = false;
    this.nextCard();
  }

  markLearned() {
    this.currentCard.learned = true;
    this.nextCard();
  }

  nextCard() {
    this.isFlipped = false;

    if (this.currentIndex < this.cards.length - 1) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0;
    }
  }
}