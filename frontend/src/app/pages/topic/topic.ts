import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Topic {
  id: number;
  name: string;
}

@Component({
  selector: 'app-topics',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './topics.html',
  styleUrl: './topics.css'
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
        ? Math.max(...this.topics.map(topic => topic.id)) + 1
        : 1;
    }
  }

  addTopic() {
    const name = this.newTopicName.trim();

    if (name === '') {
      return;
    }

    this.topics.push({
      id: this.nextId,
      name: name
    });

    this.nextId++;
    this.newTopicName = '';

    this.saveTopics();
  }

  deleteTopic(id: number) {
    this.topics = this.topics.filter(
      topic => topic.id !== id
    );

    localStorage.removeItem(`words_${id}`);
    localStorage.removeItem(`cards_progress_${id}`);

    this.saveTopics();
  }

  private saveTopics() {
    localStorage.setItem(
      'topics',
      JSON.stringify(this.topics)
    );
  }
}