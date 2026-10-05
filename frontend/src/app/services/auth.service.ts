import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  deleteUser,
  updatePassword,
  reload,
  reauthenticateWithCredential,
  EmailAuthProvider
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

  private userDataSubject =
    new BehaviorSubject<any>(null);

  userData$ =
    this.userDataSubject.asObservable();

  private userDataCache: any = null;

  private authReady: Promise<User | null>;

  constructor() {
    this.authReady =
      new Promise(resolve => {
        const unsubscribe =
          onAuthStateChanged(
            auth,
            async user => {
              this.currentUser = user;

              if (!user) {
                this.userDataCache = null;
                this.userDataSubject.next(null);
                this.photoURLSubject.next('');

                unsubscribe();
                resolve(null);

                return;
              }

              try {
                const data =
                  await this.loadUserDataFromFirestore(
                    user
                  );

                this.userDataCache = data;

                this.userDataSubject.next(
                  data
                );

                this.photoURLSubject.next(
                  data?.photoURL || ''
                );
              } catch (error) {
                console.error(
                  'AUTH USER DATA ERROR:',
                  error
                );

                this.userDataCache = null;
                this.userDataSubject.next(null);
                this.photoURLSubject.next('');
              }

              unsubscribe();
              resolve(user);
            }
          );
      });
  }

  async waitForAuth(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    return this.authReady;
  }

  private async loadUserDataFromFirestore(
    user: User
  ): Promise<any> {
    const userRef =
      doc(
        db,
        'users',
        user.uid
      );

    const snapshot =
      await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data();
  }

  async getUserData(): Promise<any> {
    const user =
      await this.waitForAuth();

    if (!user) {
      return null;
    }

    if (this.userDataCache) {
      return this.userDataCache;
    }

    const data =
      await this.loadUserDataFromFirestore(
        user
      );

    this.userDataCache = data;

    this.userDataSubject.next(data);

    this.photoURLSubject.next(
      data?.photoURL || ''
    );

    return data;
  }

  async refreshUserData(): Promise<{
    user: User;
    data: any;
  } | null> {
    let user =
      await this.waitForAuth();

    if (!user) {
      this.currentUser = null;
      this.userDataCache = null;

      this.userDataSubject.next(null);
      this.photoURLSubject.next('');

      return null;
    }

    await reload(user);

    user =
      auth.currentUser || user;

    this.currentUser = user;

    const data =
      await this.loadUserDataFromFirestore(
        user
      );

    this.userDataCache = data;

    this.userDataSubject.next(data);

    this.photoURLSubject.next(
      data?.photoURL || ''
    );

    return {
      user,
      data
    };
  }

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<User> {
    const cleanUsername =
      username.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    if (
      !cleanUsername ||
      cleanUsername.includes('@')
    ) {
      throw {
        code: 'auth/invalid-username'
      };
    }

    if (!cleanEmail) {
      throw {
        code: 'auth/invalid-email'
      };
    }

    const usernameRef =
      doc(
        db,
        'usernames',
        cleanUsername.toLowerCase()
      );

    const usernameSnapshot =
      await getDoc(usernameRef);

    if (usernameSnapshot.exists()) {
      throw {
        code:
          'auth/username-already-in-use'
      };
    }

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

    const user =
      userCredential.user;

    await updateProfile(
      user,
      {
        displayName:
          cleanUsername
      }
    );

    const userData = {
      username: cleanUsername,
      email: cleanEmail,
      photoURL: ''
    };

    await setDoc(
      doc(
        db,
        'users',
        user.uid
      ),
      userData
    );

    await setDoc(
      usernameRef,
      {
        uid: user.uid,
        email: cleanEmail
      }
    );

    this.currentUser = user;
    this.userDataCache = userData;

    this.userDataSubject.next(
      userData
    );

    this.photoURLSubject.next('');

    return user;
  }

  async login(
    usernameOrEmail: string,
    password: string
  ): Promise<User> {
    let email =
      usernameOrEmail.trim();

    if (!email.includes('@')) {
      const usernameRef =
        doc(
          db,
          'usernames',
          email.toLowerCase()
        );

      const usernameSnapshot =
        await getDoc(usernameRef);

      if (!usernameSnapshot.exists()) {
        throw {
          code: 'auth/user-not-found'
        };
      }

      const usernameData =
        usernameSnapshot.data();

      email =
        usernameData['email'];
    }

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user =
      userCredential.user;

    this.currentUser = user;

    const data =
      await this.loadUserDataFromFirestore(
        user
      );

    this.userDataCache = data;

    this.userDataSubject.next(data);

    this.photoURLSubject.next(
      data?.photoURL || ''
    );

    return user;
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

    const usernameKey =
      username.toLowerCase();

    const newUsernameRef =
      doc(
        db,
        'usernames',
        usernameKey
      );

    const usernameSnapshot =
      await getDoc(
        newUsernameRef
      );

    if (usernameSnapshot.exists()) {
      const existingData =
        usernameSnapshot.data();

      if (
        existingData['uid'] !==
        user.uid
      ) {
        throw {
          code:
            'auth/username-already-in-use'
        };
      }
    }

    const oldUsername =
      this.userDataCache?.username ||
      user.displayName ||
      '';

    const oldUsernameKey =
      oldUsername.toLowerCase();

    await updateProfile(
      user,
      {
        displayName:
          username
      }
    );

    await updateDoc(
      doc(
        db,
        'users',
        user.uid
      ),
      {
        username
      }
    );

    await setDoc(
      newUsernameRef,
      {
        uid: user.uid,
        email: user.email || ''
      }
    );

    if (
      oldUsernameKey &&
      oldUsernameKey !== usernameKey
    ) {
      const oldUsernameRef =
        doc(
          db,
          'usernames',
          oldUsernameKey
        );

      const oldSnapshot =
        await getDoc(
          oldUsernameRef
        );

      if (
        oldSnapshot.exists() &&
        oldSnapshot.data()['uid'] ===
          user.uid
      ) {
        await deleteDoc(
          oldUsernameRef
        );
      }
    }

    this.userDataCache = {
      ...(this.userDataCache || {}),
      username
    };

    this.currentUser =
      auth.currentUser;

    this.userDataSubject.next(
      this.userDataCache
    );

    return user;
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user =
      await this.waitForAuth();

    if (!user) {
      throw new Error(
        'Kein Benutzer angemeldet'
      );
    }

    if (!currentPassword) {
      throw {
        code:
          'auth/missing-current-password'
      };
    }

    if (
      !newPassword ||
      newPassword.length < 6
    ) {
      throw {
        code: 'auth/weak-password'
      };
    }

    if (!user.email) {
      throw {
        code: 'auth/no-email'
      };
    }

    const credential =
      EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

    await reauthenticateWithCredential(
      user,
      credential
    );

    await updatePassword(
      user,
      newPassword
    );

    this.currentUser =
      auth.currentUser;
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

    if (
      !file.type.startsWith('image/')
    ) {
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
      doc(
        db,
        'users',
        user.uid
      ),
      {
        photoURL: base64
      },
      {
        merge: true
      }
    );

    this.userDataCache = {
      ...(this.userDataCache || {}),
      photoURL: base64
    };

    this.userDataSubject.next(
      this.userDataCache
    );

    this.photoURLSubject.next(
      base64
    );

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
      doc(
        db,
        'users',
        user.uid
      ),
      {
        photoURL: ''
      },
      {
        merge: true
      }
    );

    this.userDataCache = {
      ...(this.userDataCache || {}),
      photoURL: ''
    };

    this.userDataSubject.next(
      this.userDataCache
    );

    this.photoURLSubject.next('');
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

                width =
                  maxSize;
              }
            } else {
              if (height > maxSize) {
                width =
                  Math.round(
                    width *
                    maxSize /
                    height
                  );

                height =
                  maxSize;
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

            resolve(
              canvas.toDataURL(
                'image/jpeg',
                0.7
              )
            );
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
    this.userDataCache = null;

    this.userDataSubject.next(null);
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
      collection(
        db,
        'topics'
      );

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
        await deleteDoc(
          card.ref
        );
      }

      await deleteDoc(
        topic.ref
      );
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
      await deleteDoc(
        attempt.ref
      );
    }

    const username =
      this.userDataCache?.username ||
      user.displayName ||
      '';

    if (username) {
      const usernameRef =
        doc(
          db,
          'usernames',
          username.toLowerCase()
        );

      const usernameSnapshot =
        await getDoc(usernameRef);

      if (
        usernameSnapshot.exists() &&
        usernameSnapshot.data()['uid'] ===
          userId
      ) {
        await deleteDoc(
          usernameRef
        );
      }
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
    this.userDataCache = null;

    this.userDataSubject.next(null);
    this.photoURLSubject.next('');
  }

  getCurrentUsername(): string {
    return (
      this.currentUser?.displayName ||
      ''
    );
  }
}