export interface StoredCredential {
  uid: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface TokenStore {
  get(uid: string): StoredCredential | undefined;
  set(credential: StoredCredential): void;
  update(uid: string, updates: Partial<StoredCredential>): StoredCredential;
  delete(uid: string): void;
  list(): StoredCredential[];
}

/**
 * In-memory token store. Replace with a real database implementation when
 * moving beyond the demo. Keep the interface consistent to swap the storage
 * layer with MySQL or any other persistent backend.
 */
class InMemoryTokenStore implements TokenStore {
  private readonly store = new Map<string, StoredCredential>();

  get(uid: string) {
    return this.store.get(uid);
  }

  set(credential: StoredCredential) {
    this.store.set(credential.uid, credential);
  }

  update(uid: string, updates: Partial<StoredCredential>) {
    const previous = this.store.get(uid);
    if (!previous) {
      throw new Error(`No credential found for uid ${uid}`);
    }

    const next: StoredCredential = {
      ...previous,
      ...updates,
      uid,
      updatedAt: Date.now()
    };

    this.store.set(uid, next);
    return next;
  }

  delete(uid: string) {
    this.store.delete(uid);
  }

  list() {
    return Array.from(this.store.values());
  }
}

export const tokenStore: TokenStore = new InMemoryTokenStore();
