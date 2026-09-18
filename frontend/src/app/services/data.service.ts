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

    const topicsRef = collection(db, 'topics');

    const q = query(
      topicsRef,
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      name: docSnap.data()['name']
    }));
  }

  async addTopic(name: string): Promise<void> {
    const userId = await this.getUserId();

    await addDoc(collection(db, 'topics'), {
      name,
      userId
    });
  }

  async deleteTopic(topicId: string): Promise<void> {
    const cards = await this.getCards(topicId);

    for (const card of cards) {
      await this.deleteCard(topicId, card.id);
    }

    await deleteDoc(doc(db, 'topics', topicId));
  }

  async getCards(topicId: string): Promise<Card[]> {
    const snapshot = await getDocs(
      collection(db, 'topics', topicId, 'cards')
    );

    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      question: docSnap.data()['question'],
      answer: docSnap.data()['answer'],
      learned: docSnap.data()['learned'] || false
    }));
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
  }

  async deleteCard(
    topicId: string,
    cardId: string
  ): Promise<void> {
    await deleteDoc(
      doc(db, 'topics', topicId, 'cards', cardId)
    );
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
  }
}