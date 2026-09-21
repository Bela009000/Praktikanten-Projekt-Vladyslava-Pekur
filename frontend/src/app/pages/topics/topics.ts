import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService, Topic } from '../../services/data.service';

@Component({
  selector: 'app-topics',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './topics.html',
  styleUrl: './topics.css'
})
export class Topics {

  topics: Topic[] = [];
  newTopicName = "";
  wordCounts: { [topicId: string]: number } = {};
  searchTerm= "" ;
  isLoading = true;

  constructor(
    private dataService: DataService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadTopics();
  }

  async loadTopics() {
    this.isLoading = true;

    try {
      const topics = await this.dataService.getTopics();

      this.topics = topics;
      this.wordCounts = {};
      this.isLoading = false;

      this.changeDetectorRef.detectChanges();

      await Promise.all(
        this.topics.map(async topic => {
          try {
            const cards = await this.dataService.getCards(topic.id);
            this.wordCounts[topic.id] = cards.length;
          } catch (error) {
            console.error(error);
            this.wordCounts[topic.id] = 0;
          }
        })
      );

      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error('TOPICS ERROR:', error);
      this.isLoading = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  getWordCount(topicId: string): number {
    return this.wordCounts[topicId] || 0;
  }
  get filteredTopics(): Topic[] {
  const term = this.searchTerm.trim().toLowerCase();

  if (term === '') {
    return this.topics;
  }

  return this.topics.filter(topic =>
    topic.name.toLowerCase().includes(term)
  );
}

  async addTopic() {
    const name = this.newTopicName.trim();

    if (name === '') {
      return;
    }

    try {
      await this.dataService.addTopic(name);

      this.newTopicName = '';

      await this.loadTopics();

    } catch (error) {
      console.error('ADD TOPIC ERROR:', error);
    }
  }

  async deleteTopic(id: string) {
    try {
      await this.dataService.deleteTopic(id);

      await this.loadTopics();

    } catch (error) {
      console.error('DELETE TOPIC ERROR:', error);
    }
  }
}