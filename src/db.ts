import Dexie, { type Table } from 'dexie';

export interface Entry {
  id?: number;
  date: string;
  mood: number; // 0=none, 1-5
  journal: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id?: number;
  entryId: number;
  category: 'work' | 'study' | 'exercise' | 'leisure' | 'social' | 'other';
  description: string;
  durationMinutes?: number;
  createdAt: Date;
}

export interface Workout {
  id?: number;
  entryId: number;
  type: 'strength' | 'cardio' | 'flexibility' | 'sports' | 'other';
  exerciseName: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
  durationMinutes?: number;
  notes: string;
  createdAt: Date;
}

class JournalDB extends Dexie {
  entries!: Table<Entry>;
  activities!: Table<Activity>;
  workouts!: Table<Workout>;

  constructor() {
    super('JournalDB');
    this.version(1).stores({
      entries: '++id, &date',
      activities: '++id, entryId',
      workouts: '++id, entryId',
    });
  }
}

export const db = new JournalDB();
