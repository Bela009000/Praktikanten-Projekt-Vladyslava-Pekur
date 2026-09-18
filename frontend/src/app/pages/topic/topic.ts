import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService, Topic as FirebaseTopic, Card } from '../../services/data.service';

@Component({
  selector: 'app-topic',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './topic.html',
  styleUrl: './topic.css'
})
export class Topic {

  topic: FirebaseTopic | null = null;
  words: Card[] = [];

  newWord = '';
  newTranslation = '';
  wordList = '';

  private topicId = '';

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

    try {
      const topics = await this.dataService.getTopics();

      this.topic = topics.find(
        topic => topic.id === this.topicId
      ) || null;

      if (this.topic) {
        await this.loadWords();
      }

      this.changeDetectorRef.detectChanges();

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
      console.error('LOAD WORDS ERROR:', error);
    }
  }

  async addWord() {
    if (!this.topic) {
      return;
    }

    const word = this.newWord.trim();
    const translation = this.newTranslation.trim();

    if (word === '' || translation === '') {
      return;
    }

    try {
      await this.dataService.addCard(
        this.topic.id,
        word,
        translation
      );

      await this.loadWords();

      this.newWord = '';
      this.newTranslation = '';

      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error(error);
    }
  }

  async addWordList() {
    if (!this.topic || this.wordList.trim() === '') {
      return;
    }

    const lines = this.wordList
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');

    try {
      for (const line of lines) {
        const parts = line.split(/\s*[-–—]\s*/);

        if (parts.length < 2) {
          continue;
        }

        const word = parts[0].trim();
        const translation = parts.slice(1).join(' - ').trim();

        if (word === '' || translation === '') {
          continue;
        }

        await this.dataService.addCard(
          this.topic.id,
          word,
          translation
        );
      }

      await this.loadWords();

      this.wordList = '';

      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error(error);
    }
  }

  async deleteWord(id: string) {
    if (!this.topic) {
      return;
    }

    try {
      await this.dataService.deleteCard(
        this.topic.id,
        id
      );

      await this.loadWords();

    } catch (error) {
      console.error(error);
    }
  }
}