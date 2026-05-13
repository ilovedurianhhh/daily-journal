import Dexie, { type Table } from 'dexie';

export interface Entry {
  id?: number;
  date: string;
  mood: number;
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

export interface ExerciseSet {
  weightKg?: number;
  reps?: number;
  durationMinutes?: number;
  distanceKm?: number;
}

export interface Exercise {
  id?: number;
  date: string;
  type: 'strength' | 'cardio';
  exerciseName: string;
  sets: ExerciseSet[];
  notes: string;
  createdAt: Date;
}

export interface ExerciseImage {
  id?: number;
  exerciseId: number;
  data: Blob;
  createdAt: Date;
}

export interface JournalImage {
  id?: number;
  entryId: number;
  data: Blob;
  createdAt: Date;
}

export interface Expense {
  id?: number;
  date: string;
  category: 'food' | 'transport' | 'shopping' | 'entertainment' | 'home' | 'other';
  amount: number;
  note: string;
  createdAt: Date;
}

export interface Summary {
  id?: number;
  type: 'weekly' | 'monthly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  content: string;
  moodAvg: number;
  expenseTotal: number;
  createdAt: Date;
}

class JournalDB extends Dexie {
  entries!: Table<Entry>;
  activities!: Table<Activity>;
  workouts!: Table<Workout>;
  images!: Table<JournalImage>;
  exercises!: Table<Exercise>;
  exerciseImages!: Table<ExerciseImage>;
  expenses!: Table<Expense>;
  summaries!: Table<Summary>;

  constructor() {
    super('JournalDB');
    this.version(3).stores({
      entries: '++id, &date',
      activities: '++id, entryId',
      workouts: '++id, entryId',
      images: '++id, entryId',
      exercises: '++id, date',
      exerciseImages: '++id, exerciseId',
      expenses: '++id, date',
    });
    this.version(4).stores({
      entries: '++id, &date',
      activities: '++id, entryId',
      workouts: '++id, entryId',
      images: '++id, entryId',
      exercises: '++id, date',
      exerciseImages: '++id, exerciseId',
      expenses: '++id, date',
      summaries: '++id, type, periodStart, periodEnd',
    });
  }
}

export const db = new JournalDB();
