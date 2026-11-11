import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  databaseURL: "https://quan-ly-san-pham-c8d02-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

export { db };
