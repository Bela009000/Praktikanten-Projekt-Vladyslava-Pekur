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
  updateDoc,
  writeBatch
} from 'firebase/firestore';

import type { DocumentReference } from 'firebase/firestore';

import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { auth, db } from '../firebase.config';

export class AppError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'AppError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser: User | null = null;

  private userDataSubject = new BehaviorSubject<any>(null);

  userData$ = this.userDataSubject.asObservable();

  photoURL$ = this.userData$.pipe(
    map(data => (data?.photoURL as string) || ''),
    distinctUntilChanged()
  );

  private userDataCache: any = null;

  private authReady: Promise<User | null>;

  constructor(private injector: Injector) {
    this.authReady = new Promise(resolve => {
      const unsubscribe = onAuthStateChanged(auth, async user => { //«Пользователь сейчас вошёл или нет?»
        this.currentUser = user; //Сохранение текущего пользователя

        if (!user) {
          this.setUserData(null); //если пользователь не вошёл, то данные пользователя будут null
        } else {
          try {
            this.setUserData(await this.loadUserData(user));
          } catch (error) {
            console.error('AUTH USER DATA ERROR:', error);
            this.setUserData(null);
          }
        }

        unsubscribe();
        resolve(user);
      });
    });
  }

  // Helpers

  private setUserData(data: any): void {
    this.userDataCache = data;
    this.userDataSubject.next(data);
  }
//загрузка данных из базы
  private async loadUserData(user: User): Promise<any> {
    const snapshot = await getDoc(doc(db, 'users', user.uid));

    return snapshot.exists() ? snapshot.data() : null;
  }
//Проверка пользователя
  private async requireUser(): Promise<User> {
    const user = await this.waitForAuth();

    if (!user) {
      throw new Error('Kein Benutzer angemeldet');
    }

    return user;
  }

  private validUsername(username: string): boolean {
    return !!username && !username.includes('@');
  }
  private async clearDataCache(): Promise<void> {
    try {
      const { DataService } = await import('./data.service');
      this.injector.get(DataService).clearCache();
    } catch (error) {
      console.error('CLEAR CACHE ERROR:', error);
    }
  }
//Удаление данных пользователя
  private async deleteInBatches(refs: DocumentReference[]): Promise<void> {
    const size = 450;

    for (let i = 0; i < refs.length; i += size) {
      const batch = writeBatch(db);

      refs.slice(i, i + size).forEach(ref => batch.delete(ref));

      await batch.commit();
    }
  }

  // Auth state

  async waitForAuth(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    return this.authReady;
  }

  async getUserData(): Promise<any> {
    const user = await this.waitForAuth();

    if (!user) {
      return null;
    }

    if (this.userDataCache) {
      return this.userDataCache;
    }

    const data = await this.loadUserData(user);

    this.setUserData(data);

    return data;
  }
//Обновление данных пользователя (кнопка )
  async refreshUserData(): Promise<{ user: User; data: any } | null> {
    let user = await this.waitForAuth();

    if (!user) {
      this.currentUser = null;
      this.setUserData(null);

      return null;
    }

    await reload(user);

    user = auth.currentUser || user;
    this.currentUser = user;

    const data = await this.loadUserData(user);

    this.setUserData(data);

    return { user, data };
  }

  getCurrentUsername(): string {
    return this.currentUser?.displayName || '';
  }

  // Register / login / logout

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<User> {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!this.validUsername(cleanUsername)) {
      throw new AppError('auth/invalid-username');
    }

    if (!cleanEmail) {
      throw new AppError('auth/invalid-email');
    }

    const usernameRef = doc(db, 'usernames', cleanUsername.toLowerCase());

    if ((await getDoc(usernameRef)).exists()) {
      throw new AppError('auth/username-already-in-use');
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );

    const user = userCredential.user;

    await updateProfile(user, { displayName: cleanUsername });

    const userData = {
      username: cleanUsername,
      email: cleanEmail,
      photoURL: ''
    };

    await setDoc(doc(db, 'users', user.uid), userData);

    await setDoc(usernameRef, {
      uid: user.uid,
      email: cleanEmail
    });

    this.currentUser = user;
    this.setUserData(userData);

    return user;
  }

  async login(usernameOrEmail: string, password: string): Promise<User> {
    let email = usernameOrEmail.trim();

    if (!email.includes('@')) {
      const usernameSnapshot = await getDoc(
        doc(db, 'usernames', email.toLowerCase())
      );

      if (!usernameSnapshot.exists()) {
        throw new AppError('auth/user-not-found');
      }

      email = usernameSnapshot.data()['email'];
    }

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    this.currentUser = user;

    this.setUserData(await this.loadUserData(user));

    return user;
  }

  async logout(): Promise<void> {
    await signOut(auth);

    this.currentUser = null;
    this.setUserData(null);

    await this.clearDataCache();
  }

  // Profile

  async changeUsername(newUsername: string): Promise<User> {
    const user = await this.requireUser();
    const username = newUsername.trim();

    if (!this.validUsername(username)) {
      throw new AppError('auth/invalid-username');
    }

    const usernameKey = username.toLowerCase();
    const newUsernameRef = doc(db, 'usernames', usernameKey);
    const usernameSnapshot = await getDoc(newUsernameRef);

    if (
      usernameSnapshot.exists() &&
      usernameSnapshot.data()['uid'] !== user.uid
    ) {
      throw new AppError('auth/username-already-in-use');
    }

    const oldUsernameKey = (
      this.userDataCache?.username ||
      user.displayName ||
      ''
    ).toLowerCase();

    await updateProfile(user, { displayName: username });

    await updateDoc(doc(db, 'users', user.uid), { username });

    await setDoc(newUsernameRef, {
      uid: user.uid,
      email: user.email || ''
    });

    if (oldUsernameKey && oldUsernameKey !== usernameKey) {
      const oldUsernameRef = doc(db, 'usernames', oldUsernameKey);
      const oldSnapshot = await getDoc(oldUsernameRef);

      if (oldSnapshot.exists() && oldSnapshot.data()['uid'] === user.uid) {
        await deleteDoc(oldUsernameRef);
      }
    }

    this.currentUser = auth.currentUser;

    this.setUserData({
      ...(this.userDataCache || {}),
      username
    });

    return user;
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.requireUser();

    if (!currentPassword) {
      throw new AppError('auth/missing-current-password');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new AppError('auth/weak-password');
    }

    if (!user.email) {
      throw new AppError('auth/no-email');
    }

    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );

    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);

    this.currentUser = auth.currentUser;
  }

  // Avatar

  async changeAvatarBase64(file: File): Promise<string> {
    const user = await this.requireUser();

    if (!file.type.startsWith('image/')) {
      throw new AppError('avatar/invalid-file');
    }

    const base64 = await this.compressImage(file);

    if (base64.length > 300000) {
      throw new AppError('avatar-too-large');
    }

    await this.saveAvatar(user, base64);

    return base64;
  }

  async deleteAvatar(): Promise<void> {
    const user = await this.requireUser();

    await this.saveAvatar(user, '');
  }

  private async saveAvatar(user: User, photoURL: string): Promise<void> {
    await setDoc(doc(db, 'users', user.uid), { photoURL }, { merge: true });

    this.setUserData({
      ...(this.userDataCache || {}),
      photoURL
    });
  }
//загрузка и сжатие изображения
  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () =>
        reject(new Error('Bild konnte nicht gelesen werden'));

      reader.onload = () => {
        const image = new Image();

        image.onerror = () =>
          reject(new Error('Bild konnte nicht geladen werden'));

        image.onload = () => {
          const maxSize = 512;
          const scale = Math.min(
            1,
            maxSize / Math.max(image.width, image.height)
          );

          const width = Math.round(image.width * scale);
          const height = Math.round(image.height * scale);

          const canvas = document.createElement('canvas');

          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext('2d');

          if (!context) {
            reject(new Error('Canvas konnte nicht erstellt werden'));
            return;
          }

          context.drawImage(image, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };

        image.src = reader.result as string;
      };

      reader.readAsDataURL(file);
    });
  }

  // Delete account

  async deleteAccount(): Promise<void> {
    const user = await this.requireUser();
    const userId = user.uid;
//полует польхователя
    const refs: DocumentReference[] = [];
//ищет все его темы
    const topicsSnapshot = await getDocs(
      query(collection(db, 'topics'), where('userId', '==', userId))
    );

    for (const topic of topicsSnapshot.docs) {
      const cardsSnapshot = await getDocs(
        collection(db, 'topics', topic.id, 'cards')
      );

      cardsSnapshot.docs.forEach(card => refs.push(card.ref));
      refs.push(topic.ref);
    }

    for (const sub of ['quizAttempts', 'studySessionResults']) {
      const snapshot = await getDocs(collection(db, 'users', userId, sub));

      snapshot.docs.forEach(item => refs.push(item.ref));
    }

    await this.deleteInBatches(refs); // само удаление

    const username =
      this.userDataCache?.username || user.displayName || '';

    if (username) {
      const usernameRef = doc(db, 'usernames', username.toLowerCase());
      const usernameSnapshot = await getDoc(usernameRef);

      if (
        usernameSnapshot.exists() &&
        usernameSnapshot.data()['uid'] === userId
      ) {
        await deleteDoc(usernameRef);// удаление имени пользователя из коллекции usernames
      }
    }

    await deleteDoc(doc(db, 'users', userId));
    await deleteUser(user); //удаление пользователя из Firebase Authentication

    this.currentUser = null;
    this.setUserData(null);

    await this.clearDataCache();// очистка кэша данных
  }
}