import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  deleteUser
} from 'firebase/auth';

import type { User } from 'firebase/auth';

import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

import { Injectable } from '@angular/core';

import { auth, db } from '../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  currentUser: User | null = null;

  constructor() {
    onAuthStateChanged(auth, user => {
      this.currentUser = user;
    });
  }

 async waitForAuth(): Promise<User | null> {
  if (this.currentUser) {
    return this.currentUser;
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      unsubscribe();
      resolve(user);
    });
  });
}

  async register(
    username: string,
    email: string,
    password: string
  ) {
    const usersRef = collection(db, 'users');

    const usernameQuery = query(
      usersRef,
      where('username', '==', username)
    );

    const usernameSnapshot =
      await getDocs(usernameQuery);

    if (!usernameSnapshot.empty) {
      throw {
        code: 'auth/username-already-in-use'
      };
    }

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    await updateProfile(user, {
      displayName: username
    });

    await setDoc(
      doc(db, 'users', user.uid),
      {
        username,
        email
      }
    );

    this.currentUser = user;

    return user;
  }

  async login(
    usernameOrEmail: string,
    password: string
  ) {
    let email = usernameOrEmail;

    if (!usernameOrEmail.includes('@')) {
      const usersRef = collection(db, 'users');

      const q = query(
        usersRef,
        where('username', '==', usernameOrEmail)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw {
          code: 'auth/user-not-found'
        };
      }

      email = snapshot.docs[0].data()['email'];
    }

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    this.currentUser = userCredential.user;

    return userCredential.user;
  }

  async changeUsername(
    newUsername: string
  ) {
    const user = await this.waitForAuth();

    if (!user) {
      throw new Error('Kein Benutzer angemeldet');
    }

    const username = newUsername.trim();

    if (username === '') {
      throw {
        code: 'auth/invalid-username'
      };
    }

    if (username.includes('@')) {
      throw {
        code: 'auth/invalid-username'
      };
    }

    const usersRef = collection(db, 'users');

    const usernameQuery = query(
      usersRef,
      where('username', '==', username)
    );

    const usernameSnapshot =
      await getDocs(usernameQuery);

    const usernameIsUsedByAnotherUser =
      usernameSnapshot.docs.some(
        userDoc => userDoc.id !== user.uid
      );

    if (usernameIsUsedByAnotherUser) {
      throw {
        code: 'auth/username-already-in-use'
      };
    }

    await updateProfile(user, {
      displayName: username
    });

    await updateDoc(
      doc(db, 'users', user.uid),
      {
        username
      }
    );

    this.currentUser = auth.currentUser;

    return user;
  }

  async logout() {
    await signOut(auth);

    this.currentUser = null;
  }

  async deleteAccount() {
    const user = await this.waitForAuth();

    if (!user) {
      throw new Error('Kein Benutzer angemeldet');
    }

    const userId = user.uid;

    const topicsRef = collection(db, 'topics');

    const topicsQuery = query(
      topicsRef,
      where('userId', '==', userId)
    );

    const topicsSnapshot =
      await getDocs(topicsQuery);

    for (const topic of topicsSnapshot.docs) {
      const cardsSnapshot = await getDocs(
        collection(
          db,
          'topics',
          topic.id,
          'cards'
        )
      );

      for (const card of cardsSnapshot.docs) {
        await deleteDoc(card.ref);
      }

      await deleteDoc(topic.ref);
    }

    const quizAttemptsSnapshot =
      await getDocs(
        collection(
          db,
          'users',
          userId,
          'quizAttempts'
        )
      );

    for (const attempt of quizAttemptsSnapshot.docs) {
      await deleteDoc(attempt.ref);
    }

    await deleteDoc(
      doc(db, 'users', userId)
    );

    await deleteUser(user);

    this.currentUser = null;
  }

  getCurrentUsername(): string {
    return this.currentUser?.displayName || '';
  }
}