export class ProfileStoreLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileStoreLoadError';
  }
}
