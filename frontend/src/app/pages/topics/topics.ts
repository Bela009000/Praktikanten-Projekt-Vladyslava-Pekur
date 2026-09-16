import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Topic {
  id: number;
  name: string;
}

@Component({
  imports: [FormsModule, CommonModule, RouterLink],
  selector: 'app-topics',
  styleUrl: './topics.css',
  templateUrl: './topics.html',
})
export class Topics {
  topics: Topic[] = [];
  newTopicName = '';
  private nextId = 1;

  ngOnInit() {
    const saved = localStorage.getItem('topics');

    if (saved) {
      this.topics = JSON.parse(saved);

      this.nextId = this.topics.length > 0
        ? Math.max(...this.topics.map(t => t.id)) + 1
        : 1;
    }
  }

  addTopic() {
    if (this.newTopicName.trim() === '') {
      return;
    }

    this.topics.push({
      id: this.nextId,
      name: this.newTopicName.trim(),
    });

    this.nextId++;
    this.newTopicName = '';

    this.saveTopics();
  }

  deleteTopic(id: number) {
    this.topics = this.topics.filter(t => t.id !== id);
    this.saveTopics();

    localStorage.removeItem(`words_${id}`);
  }

  private saveTopics() {
    localStorage.setItem('topics', JSON.stringify(this.topics));
  }
}