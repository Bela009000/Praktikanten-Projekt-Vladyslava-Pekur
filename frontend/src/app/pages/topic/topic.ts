import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  DataService,
  Topic as FirebaseTopic,
  Card
} from '../../services/data.service';

@Component({
  selector: 'app-topic',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './topic.html',
  styleUrl: './topic.css'
})
export class Topic {

  topic: FirebaseTopic | null = null;
  words: Card[] = [];

  newWord = '';
  newTranslation = '';
  wordList = '';

  loading = true;
  addingWord = false;
  addingWordList = false;
  deletingWord = false;

  message = '';

  private topicId = '';

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.topicId =
      this.route.snapshot.paramMap.get('id') || '';

    if (!this.topicId) {
      this.loading = false;
      return;
    }

    await this.loadTopic();
  }

  private async loadTopic(): Promise<void> {
    this.loading = true;
    this.message = '';

    try {
      const topics =
        await this.dataService.getTopics();

      this.topic =
        topics.find(
          topic => topic.id === this.topicId
        ) || null;

      if (!this.topic) {
        this.message =
          'Thema konnte nicht gefunden werden.';
        return;
      }

      await this.loadWords();

    } catch (error) {
      console.error(
        'LOAD TOPIC ERROR:',
        error
      );

      this.message =
        'Das Thema konnte nicht geladen werden.';

    } finally {
      this.loading = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  private async loadWords(): Promise<void> {
    try {
      this.words =
        await this.dataService.getCards(
          this.topicId
        );

    } catch (error) {
      console.error(
        'LOAD WORDS ERROR:',
        error
      );

      this.message =
        'Die Karten konnten nicht geladen werden.';

    } finally {
      this.changeDetectorRef.detectChanges();
    }
  }

  async addWord(): Promise<void> {
    if (
      !this.topic ||
      this.addingWord ||
      this.addingWordList
    ) {
      return;
    }

    const word =
      this.newWord.trim();

    const translation =
      this.newTranslation.trim();

    if (!word || !translation) {
      return;
    }

    this.addingWord = true;
    this.message = '';

    try {
      await this.dataService.addCard(
        this.topic.id,
        word,
        translation
      );

      this.newWord = '';
      this.newTranslation = '';

      await this.loadWords();

      this.message =
        'Karte erfolgreich hinzugefügt.';

    } catch (error) {
      console.error(
        'ADD WORD ERROR:',
        error
      );

      this.message =
        'Die Karte konnte nicht hinzugefügt werden.';

    } finally {
      this.addingWord = false;
      this.changeDetectorRef.detectChanges();
    }
  }
async addWordList(): Promise<void> {

  if (
    !this.topic ||
    this.addingWordList ||
    this.addingWord
  ) {
    return;
  }

  const text = this.wordList.trim();

  if (!text) {
    return;
  }

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line !== '');

  const cards: {
    question: string;
    answer: string;
  }[] = [];

  for (const line of lines) {

    const parts = line.split(
      /\s*[-–—]\s*/
    );

    if (parts.length < 2) {
      continue;
    }

    const question = parts[0].trim();

    const answer = parts
      .slice(1)
      .join(' - ')
      .trim();

    if (
      !question ||
      !answer
    ) {
      continue;
    }

    cards.push({
      question,
      answer
    });
  }

  if (cards.length === 0) {

    this.message =
      'Keine gültigen Karten gefunden. Verwende zum Beispiel: Haus - house';

    return;
  }

  this.addingWordList = true;
  this.message = '';

  this.changeDetectorRef.detectChanges();

  try {

    const newCards =
      await this.dataService.addCards(
        this.topic.id,
        cards
      );

    // Не делаем await this.loadWords().
    // Карточки уже есть — добавляем их сразу в UI.
    this.words = [
      ...this.words,
      ...newCards
    ];

    this.wordList = '';

    this.message =
      `${newCards.length} Karten erfolgreich hinzugefügt.`;

  } catch (error) {

    console.error(
      'ADD WORD LIST ERROR:',
      error
    );

    this.message =
      'Die Kartenliste konnte nicht vollständig hinzugefügt werden.';

  } finally {

    this.addingWordList = false;

    this.changeDetectorRef.detectChanges();
  }
}

  async deleteWord(id: string): Promise<void> {
    if (
      !this.topic ||
      this.deletingWord
    ) {
      return;
    }

    this.deletingWord = true;
    this.message = '';

    try {
      await this.dataService.deleteCard(
        this.topic.id,
        id
      );

      await this.loadWords();

      this.message =
        'Karte gelöscht.';

    } catch (error) {
      console.error(
        'DELETE WORD ERROR:',
        error
      );

      this.message =
        'Die Karte konnte nicht gelöscht werden.';

    } finally {
      this.deletingWord = false;
      this.changeDetectorRef.detectChanges();
    }
  }
}