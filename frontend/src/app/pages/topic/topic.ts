import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface TopicData {
  id: number;
  name: string;
}

interface Word {
  id: number;
  word: string;
  translation: string;
}

@Component({
  selector: 'app-topic',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './topic.html',
  styleUrl: './topic.css'
})
export class Topic {

  topic: TopicData | null = null;
  words: Word[] = [];

  newWord = '';
  newTranslation = '';
  wordList = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const topicId = Number(
      this.route.snapshot.paramMap.get('id')
    );

    const savedTopics = localStorage.getItem('topics');

    if (savedTopics) {
      const topics: TopicData[] = JSON.parse(savedTopics);

      this.topic = topics.find(
        topic => topic.id === topicId
      ) || null;
    }

    const savedWords = localStorage.getItem(
      `words_${topicId}`
    );

    if (savedWords) {
      this.words = JSON.parse(savedWords);
    }
  }

  addWord() {
    if (!this.topic) {
      return;
    }

    const word = this.newWord.trim();
    const translation = this.newTranslation.trim();

    if (word === '' || translation === '') {
      return;
    }

    this.words.push({
      id: Date.now(),
      word: word,
      translation: translation
    });

    this.saveWords();

    this.newWord = '';
    this.newTranslation = '';
  }

  addWordList() {
    if (!this.topic || this.wordList.trim() === '') {
      return;
    }

    const lines = this.wordList
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');

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

      this.words.push({
        id: Date.now() + Math.random(),
        word: word,
        translation: translation
      });
    }

    this.saveWords();
    this.wordList = '';
  }

  deleteWord(id: number) {
    if (!this.topic) {
      return;
    }

    this.words = this.words.filter(
      word => word.id !== id
    );

    this.saveWords();
  }

  private saveWords() {
    if (!this.topic) {
      return;
    }

    localStorage.setItem(
      `words_${this.topic.id}`,
      JSON.stringify(this.words)
    );
  }
}