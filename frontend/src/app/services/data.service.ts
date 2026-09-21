import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { AuthService } from './auth.service';

export interface Topic {
  id: string;
  name: string;
}

export interface Card {
  id: string;
  question: string;
  answer: string;
  learned: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private topicsCache = new Map<string, Topic[]>();
  private topicsRequests = new Map<string, Promise<Topic[]>>();

  private cardsCache = new Map<string, Card[]>();
  private cardsRequests = new Map<string, Promise<Card[]>>();

  private quizCountCache = new Map<string, number>();
  private quizCountRequests = new Map<string, Promise<number>>();

  constructor(private authService: AuthService) {}

  private async getUserId(): Promise<string> {
    const user = await this.authService.waitForAuth();

    if (!user) {
      throw new Error('Kein Benutzer angemeldet');
    }

    return user.uid;
  }

  async getTopics(): Promise<Topic[]> {
    const userId = await this.getUserId();

    const cachedTopics = this.topicsCache.get(userId);

    if (cachedTopics) {
      return cachedTopics;
    }

    const existingRequest = this.topicsRequests.get(userId);

    if (existingRequest) {
      return existingRequest;
    }

    const request = this.loadTopics(userId);

    this.topicsRequests.set(userId, request);

    try {
      return await request;
    } finally {
      this.topicsRequests.delete(userId);
    }
  }

  private async loadTopics(userId: string): Promise<Topic[]> {
    const topicsRef = collection(db, 'topics');

    const q = query(
      topicsRef,
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);

    const topics = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      name: docSnap.data()['name']
    }));

    this.topicsCache.set(userId, topics);

    return topics;
  }

  async addTopic(name: string): Promise<void> {
    const userId = await this.getUserId();

    await addDoc(collection(db, 'topics'), {
      name,
      userId
    });

    this.topicsCache.delete(userId);
  }

  async deleteTopic(topicId: string): Promise<void> {
    const userId = await this.getUserId();

    const cards = await this.getCards(topicId);

    for (const card of cards) {
      await deleteDoc(
        doc(db, 'topics', topicId, 'cards', card.id)
      );
    }

    await deleteDoc(
      doc(db, 'topics', topicId)
    );

    this.cardsCache.delete(topicId);
    this.cardsRequests.delete(topicId);
    this.topicsCache.delete(userId);
  }

  async getCards(topicId: string): Promise<Card[]> {
    const cachedCards = this.cardsCache.get(topicId);

    if (cachedCards) {
      return cachedCards;
    }

    const existingRequest = this.cardsRequests.get(topicId);

    if (existingRequest) {
      return existingRequest;
    }

    const request = this.loadCards(topicId);

    this.cardsRequests.set(topicId, request);

    try {
      return await request;
    } finally {
      this.cardsRequests.delete(topicId);
    }
  }

  private async loadCards(topicId: string): Promise<Card[]> {
    const snapshot = await getDocs(
      collection(db, 'topics', topicId, 'cards')
    );

    const cards = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      question: docSnap.data()['question'],
      answer: docSnap.data()['answer'],
      learned: docSnap.data()['learned'] || false
    }));

    this.cardsCache.set(topicId, cards);

    return cards;
  }

  async addCard(
    topicId: string,
    question: string,
    answer: string
  ): Promise<void> {
    await addDoc(
      collection(db, 'topics', topicId, 'cards'),
      {
        question,
        answer,
        learned: false
      }
    );

    this.cardsCache.delete(topicId);
  }

  async updateCard(
    topicId: string,
    cardId: string,
    question: string,
    answer: string
  ): Promise<void> {
    await updateDoc(
      doc(db, 'topics', topicId, 'cards', cardId),
      {
        question,
        answer
      }
    );

    this.cardsCache.delete(topicId);
  }

  async deleteCard(
    topicId: string,
    cardId: string
  ): Promise<void> {
    await deleteDoc(
      doc(db, 'topics', topicId, 'cards', cardId)
    );

    this.cardsCache.delete(topicId);
  }

  async setCardLearned(
    topicId: string,
    cardId: string,
    learned: boolean
  ): Promise<void> {
    await updateDoc(
      doc(db, 'topics', topicId, 'cards', cardId),
      {
        learned
      }
    );

    this.cardsCache.delete(topicId);
  }

  async getQuizCount(): Promise<number> {
    const userId = await this.getUserId();

    const cachedCount = this.quizCountCache.get(userId);

    if (cachedCount !== undefined) {
      return cachedCount;
    }

    const existingRequest = this.quizCountRequests.get(userId);

    if (existingRequest) {
      return existingRequest;
    }

    const request = this.loadQuizCount(userId);

    this.quizCountRequests.set(userId, request);

    try {
      return await request;
    } finally {
      this.quizCountRequests.delete(userId);
    }
  }

  private async loadQuizCount(userId: string): Promise<number> {
    const snapshot = await getDocs(
      collection(db, 'users', userId, 'quizAttempts')
    );

    const count = snapshot.size;

    this.quizCountCache.set(userId, count);

    return count;
  }

  async addQuizAttempt(
    topicId: string,
    correctAnswers: number,
    totalQuestions: number
  ): Promise<void> {
    const userId = await this.getUserId();

    await addDoc(
      collection(db, 'users', userId, 'quizAttempts'),
      {
        topicId,
        correctAnswers,
        totalQuestions,
        createdAt: new Date()
      }
    );

    this.quizCountCache.delete(userId);
  }

  clearCache(): void {
    this.topicsCache.clear();
    this.topicsRequests.clear();
    this.cardsCache.clear();
    this.cardsRequests.clear();
    this.quizCountCache.clear();
    this.quizCountRequests.clear();
  }
}