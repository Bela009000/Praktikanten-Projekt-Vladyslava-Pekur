import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  deleteUser,
  updatePassword
} from 'firebase/auth';

import type { User } from 'firebase/auth';

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { auth, db } from '../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  currentUser: User | null = null;

  private photoURLSubject =
    new BehaviorSubject<string>('');

  photoURL$ =
    this.photoURLSubject.asObservable();

  constructor() {
    onAuthStateChanged(auth, async user => {
      this.currentUser = user;

      if (!user) {
        this.photoURLSubject.next('');
        return;
      }

      try {
        const data = await this.getUserData();

        this.photoURLSubject.next(
          data?.photoURL || ''
        );
      } catch (error) {
        console.error(
          'AUTH USER DATA ERROR:',
          error
        );

        this.photoURLSubject.next('');
      }
    });
  }

  async waitForAuth(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    return new Promise(resolve => {
      const unsubscribe =
        onAuthStateChanged(auth, user => {
          this.currentUser = user;

          unsubscribe();

          resolve(user);
        });
    });
  }

  async getUserData(): Promise<any> {
    const user = await this.waitForAuth();

    if (!user) {
      return null;
    }

    const userRef = doc(
      db,
      'users',
      user.uid
    );

    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data();
  }

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<User> {

    const usersRef =
      collection(db, 'users');

    const usernameQuery =
      query(
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

    const user =
      userCredential.user;

    await updateProfile(user, {
      displayName: username
    });

    await setDoc(
      doc(db, 'users', user.uid),
      {
        username,
        email,
        photoURL: ''
      }
    );

    this.currentUser = user;

    this.photoURLSubject.next('');

    return user;
  }

  async login(
    usernameOrEmail: string,
    password: string
  ): Promise<User> {

    let email = usernameOrEmail;

    if (!usernameOrEmail.includes('@')) {

      const usersRef =
        collection(db, 'users');

      const q =
        query(
          usersRef,
          where(
            'username',
            '==',
            usernameOrEmail
          )
        );

      const snapshot =
        await getDocs(q);

      if (snapshot.empty) {
        throw {
          code: 'auth/user-not-found'
        };
      }

      email =
        snapshot.docs[0].data()['email'];
    }

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    this.currentUser =
      userCredential.user;

    await this.refreshUserData();

    return userCredential.user;
  }

  async changeUsername(
    newUsername: string
  ): Promise<User> {

    const user =
      await this.waitForAuth();

    if (!user) {
      throw new Error(
        'Kein Benutzer angemeldet'
      );
    }

    const username =
      newUsername.trim();

    if (
      !username ||
      username.includes('@')
    ) {
      throw {
        code: 'auth/invalid-username'
      };
    }

    const usersRef =
      collection(db, 'users');

    const usernameQuery =
      query(
        usersRef,
        where(
          'username',
          '==',
          username
        )
      );

    const usernameSnapshot =
      await getDocs(usernameQuery);

    const usernameIsUsedByAnotherUser =
      usernameSnapshot.docs.some(
        userDoc =>
          userDoc.id !== user.uid
      );

    if (usernameIsUsedByAnotherUser) {
      throw {
        code:
          'auth/username-already-in-use'
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

    this.currentUser =
      auth.currentUser;

    return user;
  }

  async changePassword(
    newPassword: string
  ): Promise<void> {

    const user =
      await this.waitForAuth();

    if (!user) {
      throw new Error(
        'Kein Benutzer angemeldet'
      );
    }

    if (newPassword.length < 6) {
      throw {
        code: 'auth/weak-password'
      };
    }

    await updatePassword(
      user,
      newPassword
    );
  }

  async changeAvatarBase64(
    file: File
  ): Promise<string> {

    const user =
      await this.waitForAuth();

    if (!user) {
      throw new Error(
        'Kein Benutzer angemeldet'
      );
    }

    if (!file.type.startsWith('image/')) {
      throw {
        code: 'avatar/invalid-file'
      };
    }

    const base64 =
      await this.compressImage(file);

    if (base64.length > 300000) {
      throw {
        code: 'avatar-too-large'
      };
    }

    await setDoc(
      doc(db, 'users', user.uid),
      {
        photoURL: base64
      },
      {
        merge: true
      }
    );

    this.photoURLSubject.next(base64);

    return base64;
  }

  async deleteAvatar(): Promise<void> {

    const user =
      await this.waitForAuth();

    if (!user) {
      throw new Error(
        'Kein Benutzer angemeldet'
      );
    }

    await setDoc(
      doc(db, 'users', user.uid),
      {
        photoURL: ''
      },
      {
        merge: true
      }
    );

    this.photoURLSubject.next('');
  }

  async refreshUserData(): Promise<void> {

    const user =
      await this.waitForAuth();

    if (!user) {
      this.photoURLSubject.next('');
      return;
    }

    const data =
      await this.getUserData();

    this.photoURLSubject.next(
      data?.photoURL || ''
    );
  }

  private compressImage(
    file: File
  ): Promise<string> {

    return new Promise(
      (resolve, reject) => {

        const reader =
          new FileReader();

        reader.onload = () => {

          const image =
            new Image();

          image.onload = () => {

            const maxSize = 512;

            let width =
              image.width;

            let height =
              image.height;

            if (width > height) {

              if (width > maxSize) {

                height =
                  Math.round(
                    height *
                    maxSize /
                    width
                  );

                width = maxSize;
              }

            } else {

              if (height > maxSize) {

                width =
                  Math.round(
                    width *
                    maxSize /
                    height
                  );

                height = maxSize;
              }
            }

            const canvas =
              document.createElement(
                'canvas'
              );

            canvas.width = width;
            canvas.height = height;

            const context =
              canvas.getContext('2d');

            if (!context) {
              reject(
                new Error(
                  'Canvas konnte nicht erstellt werden'
                )
              );

              return;
            }

            context.drawImage(
              image,
              0,
              0,
              width,
              height
            );

            const result =
              canvas.toDataURL(
                'image/jpeg',
                0.7
              );

            resolve(result);
          };

          image.onerror = () => {
            reject(
              new Error(
                'Bild konnte nicht geladen werden'
              )
            );
          };

          image.src =
            reader.result as string;
        };

        reader.onerror = () => {
          reject(
            new Error(
              'Bild konnte nicht gelesen werden'
            )
          );
        };

        reader.readAsDataURL(file);
      }
    );
  }

  async logout(): Promise<void> {

    await signOut(auth);

    this.currentUser = null;

    this.photoURLSubject.next('');
  }

  async deleteAccount(): Promise<void> {

    const user =
      await this.waitForAuth();

    if (!user) {
      throw new Error(
        'Kein Benutzer angemeldet'
      );
    }

    const userId =
      user.uid;

    const topicsRef =
      collection(db, 'topics');

    const topicsQuery =
      query(
        topicsRef,
        where(
          'userId',
          '==',
          userId
        )
      );

    const topicsSnapshot =
      await getDocs(topicsQuery);

    for (
      const topic of
      topicsSnapshot.docs
    ) {

      const cardsSnapshot =
        await getDocs(
          collection(
            db,
            'topics',
            topic.id,
            'cards'
          )
        );

      for (
        const card of
        cardsSnapshot.docs
      ) {
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

    for (
      const attempt of
      quizAttemptsSnapshot.docs
    ) {
      await deleteDoc(attempt.ref);
    }

    await deleteDoc(
      doc(
        db,
        'users',
        userId
      )
    );

    await deleteUser(user);

    this.currentUser = null;

    this.photoURLSubject.next('');
  }

  getCurrentUsername(): string {
    return (
      this.currentUser?.displayName ||
      ''
    );
  }
}