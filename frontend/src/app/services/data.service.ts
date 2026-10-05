
import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';

import { db } from '../firebase.config';
import { AuthService } from './auth.service';

export interface Topic {
  id: string;
  name: string;
  createdAt?: Timestamp;
}

export interface Card {
  id: string;
  question: string;
  answer: string;
  learned: boolean;
}

export interface StudySessionResult {
  id: string;
  topicId: string;
  topicName: string;
  passedCount: number;
  totalCards: number;
  percentage: number;
  modes: string[];
  createdAt: Timestamp;
}

export interface QuizAttemptResult {
  id: string;
  topicId: string;
  topicName: string;
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  createdAt: Timestamp;
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

  constructor(
    private authService: AuthService
  ) {}

  private async getUserId(): Promise<string> {
    const user =
      await this.authService.waitForAuth();

    if (!user) {
      throw new Error(
        'Kein Benutzer angemeldet'
      );
    }

    return user.uid;
  }

  async getTopics(): Promise<Topic[]> {
    const userId =
      await this.getUserId();

    const cachedTopics =
      this.topicsCache.get(userId);

    if (cachedTopics) {
      return cachedTopics;
    }

    const existingRequest =
      this.topicsRequests.get(userId);

    if (existingRequest) {
      return existingRequest;
    }

    const request =
      this.loadTopics(userId);

    this.topicsRequests.set(
      userId,
      request
    );

    try {
      return await request;
    } finally {
      this.topicsRequests.delete(
        userId
      );
    }
  }

  private async loadTopics(
    userId: string
  ): Promise<Topic[]> {
    const topicsRef =
      collection(
        db,
        'topics'
      );

    const q =
      query(
        topicsRef,
        where(
          'userId',
          '==',
          userId
        )
      );

    const snapshot =
      await getDocs(q);

    const topics =
      snapshot.docs.map(
        docSnap => {
          const data =
            docSnap.data();

          return {
            id: docSnap.id,
            name: data['name'] || '',
            createdAt:
              data['createdAt'] instanceof Timestamp
                ? data['createdAt']
                : undefined
          };
        }
      );

    topics.sort(
      (a, b) => {
        const timeA =
          a.createdAt?.toMillis() || 0;

        const timeB =
          b.createdAt?.toMillis() || 0;

        return timeB - timeA;
      }
    );

    this.topicsCache.set(
      userId,
      topics
    );

    return topics;
  }

  async addTopic(
    name: string
  ): Promise<void> {
    const userId =
      await this.getUserId();

    const cleanName =
      name.trim();

    if (!cleanName) {
      return;
    }

    await addDoc(
      collection(
        db,
        'topics'
      ),
      {
        name: cleanName,
        userId,
        createdAt: Timestamp.now()
      }
    );

    this.topicsCache.delete(
      userId
    );
  }

  async deleteTopic(
    topicId: string
  ): Promise<void> {
    const userId =
      await this.getUserId();

    const cards =
      await this.getCards(topicId);

    const batch =
      writeBatch(db);

    for (const card of cards) {
      batch.delete(
        doc(
          db,
          'topics',
          topicId,
          'cards',
          card.id
        )
      );
    }

    batch.delete(
      doc(
        db,
        'topics',
        topicId
      )
    );

    await batch.commit();

    this.cardsCache.delete(
      topicId
    );

    this.cardsRequests.delete(
      topicId
    );

    this.topicsCache.delete(
      userId
    );
  }

  async saveStudySessionResult(
    topicId: string,
    topicName: string,
    learnedCount: number,
    totalCards: number,
    modes: string[]
  ): Promise<void> {
    const userId =
      await this.getUserId();

    const resultsRef =
      collection(
        db,
        'users',
        userId,
        'studySessionResults'
      );

    const snapshot =
      await getDocs(
        query(
          resultsRef,
          where(
            'topicId',
            '==',
            topicId
          )
        )
      );

    const safeTotalCards =
      Math.max(
        0,
        totalCards
      );

    const safeLearnedCount =
      Math.min(
        Math.max(
          0,
          learnedCount
        ),
        safeTotalCards
      );

    const percentage =
      safeTotalCards > 0
        ? Math.round(
            (
              safeLearnedCount /
              safeTotalCards
            ) * 100
          )
        : 0;

    const data = {
      topicId,
      topicName,
      passedCount:
        safeLearnedCount,
      totalCards:
        safeTotalCards,
      percentage,
      modes,
      createdAt:
        Timestamp.now()
    };

    if (!snapshot.empty) {
      const sortedDocs =
        [...snapshot.docs].sort(
          (a, b) => {
            const aCreatedAt =
              a.data()['createdAt'];

            const bCreatedAt =
              b.data()['createdAt'];

            const aTime =
              aCreatedAt instanceof Timestamp
                ? aCreatedAt.toMillis()
                : 0;

            const bTime =
              bCreatedAt instanceof Timestamp
                ? bCreatedAt.toMillis()
                : 0;

            return bTime - aTime;
          }
        );

      await updateDoc(
        sortedDocs[0].ref,
        data
      );

      if (sortedDocs.length > 1) {
        await Promise.all(
          sortedDocs
            .slice(1)
            .map(docSnap =>
              deleteDoc(
                docSnap.ref
              )
            )
        );
      }

      return;
    }

    await addDoc(
      resultsRef,
      data
    );
  }

  async getLastStudySessionResults(
    limitCount = 3
  ): Promise<StudySessionResult[]> {
    const userId =
      await this.getUserId();

    const resultsRef =
      collection(
        db,
        'users',
        userId,
        'studySessionResults'
      );

    const q =
      query(
        resultsRef,
        orderBy(
          'createdAt',
          'desc'
        ),
        limit(limitCount)
      );

    const snapshot =
      await getDocs(q);

    return snapshot.docs.map(
      docSnap => {
        const data =
          docSnap.data();

        const totalCards =
          Number(
            data['totalCards']
          ) || 0;

        const passedCount =
          Math.min(
            Number(
              data['passedCount']
            ) || 0,
            totalCards
          );

        const percentage =
          totalCards > 0
            ? Math.round(
                (
                  passedCount /
                  totalCards
                ) * 100
              )
            : 0;

        return {
          id: docSnap.id,
          topicId:
            data['topicId'] || '',
          topicName:
            data['topicName'] || '',
          passedCount,
          totalCards,
          percentage,
          modes:
            Array.isArray(
              data['modes']
            )
              ? data['modes']
              : [],
          createdAt:
            data['createdAt'] instanceof Timestamp
              ? data['createdAt']
              : Timestamp.now()
        };
      }
    );
  }

  async getCards(
    topicId: string
  ): Promise<Card[]> {
    const cachedCards =
      this.cardsCache.get(
        topicId
      );

    if (cachedCards) {
      return cachedCards;
    }

    const existingRequest =
      this.cardsRequests.get(
        topicId
      );

    if (existingRequest) {
      return existingRequest;
    }

    const request =
      this.loadCards(topicId);

    this.cardsRequests.set(
      topicId,
      request
    );

    try {
      return await request;
    } finally {
      this.cardsRequests.delete(
        topicId
      );
    }
  }

  private async loadCards(
    topicId: string
  ): Promise<Card[]> {
    const snapshot =
      await getDocs(
        collection(
          db,
          'topics',
          topicId,
          'cards'
        )
      );

    const cards =
      snapshot.docs.map(
        docSnap => {
          const data =
            docSnap.data();

          return {
            id: docSnap.id,
            question:
              data['question'] || '',
            answer:
              data['answer'] || '',
            learned:
              data['learned'] || false
          };
        }
      );

    this.cardsCache.set(
      topicId,
      cards
    );

    return cards;
  }

  async addCard(
    topicId: string,
    question: string,
    answer: string
  ): Promise<void> {
    await addDoc(
      collection(
        db,
        'topics',
        topicId,
        'cards'
      ),
      {
        question,
        answer,
        learned: false
      }
    );

    this.cardsCache.delete(
      topicId
    );
  }

  async addCards(
    topicId: string,
    cards: {
      question: string;
      answer: string;
    }[]
  ): Promise<Card[]> {
    if (cards.length === 0) {
      return [];
    }

    const batch =
      writeBatch(db);

    const cardsRef =
      collection(
        db,
        'topics',
        topicId,
        'cards'
      );

    const newCards: Card[] = [];

    for (const card of cards) {
      const cardRef =
        doc(cardsRef);

      const newCard: Card = {
        id: cardRef.id,
        question:
          card.question,
        answer:
          card.answer,
        learned: false
      };

      batch.set(
        cardRef,
        {
          question:
            card.question,
          answer:
            card.answer,
          learned: false
        }
      );

      newCards.push(
        newCard
      );
    }

    await batch.commit();

    const cachedCards =
      this.cardsCache.get(
        topicId
      );

    if (cachedCards) {
      this.cardsCache.set(
        topicId,
        [
          ...cachedCards,
          ...newCards
        ]
      );
    }

    return newCards;
  }

  async updateCard(
    topicId: string,
    cardId: string,
    question: string,
    answer: string
  ): Promise<void> {
    await updateDoc(
      doc(
        db,
        'topics',
        topicId,
        'cards',
        cardId
      ),
      {
        question,
        answer
      }
    );

    this.cardsCache.delete(
      topicId
    );
  }

  async deleteCard(
    topicId: string,
    cardId: string
  ): Promise<void> {
    await deleteDoc(
      doc(
        db,
        'topics',
        topicId,
        'cards',
        cardId
      )
    );

    this.cardsCache.delete(
      topicId
    );
  }

  async deleteCards(
    topicId: string,
    cardIds: string[]
  ): Promise<void> {
    if (cardIds.length === 0) {
      return;
    }

    const batch =
      writeBatch(db);

    for (const cardId of cardIds) {
      batch.delete(
        doc(
          db,
          'topics',
          topicId,
          'cards',
          cardId
        )
      );
    }

    await batch.commit();

    this.cardsCache.delete(
      topicId
    );
  }

  async setCardLearned(
    topicId: string,
    cardId: string,
    learned: boolean
  ): Promise<void> {
    await updateDoc(
      doc(
        db,
        'topics',
        topicId,
        'cards',
        cardId
      ),
      {
        learned
      }
    );

    this.cardsCache.delete(
      topicId
    );
  }

  async getQuizCount(): Promise<number> {
    const userId =
      await this.getUserId();

    const cachedCount =
      this.quizCountCache.get(
        userId
      );

    if (
      cachedCount !== undefined
    ) {
      return cachedCount;
    }

    const existingRequest =
      this.quizCountRequests.get(
        userId
      );

    if (existingRequest) {
      return existingRequest;
    }

    const request =
      this.loadQuizCount(
        userId
      );

    this.quizCountRequests.set(
      userId,
      request
    );

    try {
      return await request;
    } finally {
      this.quizCountRequests.delete(
        userId
      );
    }
  }

  private async loadQuizCount(
    userId: string
  ): Promise<number> {
    const snapshot =
      await getDocs(
        collection(
          db,
          'users',
          userId,
          'quizAttempts'
        )
      );

    const count =
      snapshot.size;

    this.quizCountCache.set(
      userId,
      count
    );

    return count;
  }

  async addQuizAttempt(
    topicId: string,
    correctAnswers: number,
    totalQuestions: number
  ): Promise<void> {
    const userId =
      await this.getUserId();

    await addDoc(
      collection(
        db,
        'users',
        userId,
        'quizAttempts'
      ),
      {
        topicId,
        correctAnswers,
        totalQuestions,
        createdAt:
          Timestamp.now()
      }
    );

    this.quizCountCache.delete(
      userId
    );
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