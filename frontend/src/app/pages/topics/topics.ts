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
  newTopicName = '';
  wordCounts: { [topicId: string]: number } = {};
  searchTerm = '';

  isLoading = true;
  isAddingTopic = false;
  isDeletingTopic = false;

  constructor(
    private dataService: DataService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadTopics();
  }

  async loadTopics(): Promise<void> {

    this.isLoading = true;

    try {

      const topics =
        await this.dataService.getTopics();

      this.topics =
        topics;

      this.wordCounts =
        {};

      this.isLoading =
        false;

      this.changeDetectorRef.detectChanges();

      await Promise.all(
        this.topics.map(
          async topic => {

            try {

              const cards =
                await this.dataService.getCards(
                  topic.id
                );

              this.wordCounts[topic.id] =
                cards.length;

            } catch (error) {

              console.error(
                'LOAD CARD COUNT ERROR:',
                error
              );

              this.wordCounts[topic.id] =
                0;
            }
          }
        )
      );

      this.changeDetectorRef.detectChanges();

    } catch (error) {

      console.error(
        'TOPICS ERROR:',
        error
      );

      this.isLoading =
        false;

      this.changeDetectorRef.detectChanges();
    }
  }

  getWordCount(
    topicId: string
  ): number {

    return (
      this.wordCounts[topicId] ||
      0
    );
  }

  get filteredTopics(): Topic[] {

    const term =
      this.searchTerm
        .trim()
        .toLowerCase();

    if (!term) {
      return this.topics;
    }

    return this.topics.filter(
      topic =>
        topic.name
          .toLowerCase()
          .includes(term)
    );
  }

  startAddTopic(): void {

    if (
      this.isAddingTopic ||
      this.isDeletingTopic
    ) {
      return;
    }

    this.isAddingTopic =
      true;
  }

  cancelAddTopic(): void {

    this.isAddingTopic =
      false;

    this.newTopicName =
      '';
  }

  async addTopic(): Promise<void> {

    if (
      this.isAddingTopic === false ||
      this.isDeletingTopic
    ) {
      return;
    }

    const name =
      this.newTopicName.trim();

    if (!name) {
      return;
    }

    try {

      await this.dataService.addTopic(
        name
      );

      this.newTopicName =
        '';

      this.isAddingTopic =
        false;

      await this.loadTopics();

    } catch (error) {

      console.error(
        'ADD TOPIC ERROR:',
        error
      );
    }
  }

 async deleteTopic(id: string): Promise<void> {
  if (this.isDeletingTopic) {
    return;
  }

  this.isDeletingTopic = true;
  this.changeDetectorRef.detectChanges();

  try {
    await this.dataService.deleteTopic(id);

    this.topics = this.topics.filter(
      topic => topic.id !== id
    );

    delete this.wordCounts[id];

    this.changeDetectorRef.detectChanges();

  } catch (error) {
    console.error(
      'DELETE TOPIC ERROR:',
      error
    );

  } finally {
    this.isDeletingTopic = false;
    this.changeDetectorRef.detectChanges();
  }
}
}