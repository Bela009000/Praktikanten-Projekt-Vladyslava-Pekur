
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs
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
    await auth.authStateReady();

    this.currentUser = auth.currentUser;

    return this.currentUser;
  }

  async register(
    username: string,
    email: string,
    password: string
  ) {
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

  async logout() {
    await signOut(auth);
    this.currentUser = null;
  }

  getCurrentUsername(): string {
    return this.currentUser?.displayName || '';
  }
}
