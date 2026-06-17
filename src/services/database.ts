import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('acoustic_guard.db');

export const initDatabase = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      db REAL,
      duration INTEGER DEFAULT 1,
      timestamp TEXT,
      location TEXT
    );
  `);
};

export const saveMeasurement = (dbValue: number, location: string, timestamp: string, duration: number = 1) => {
  db.runSync(
    'INSERT INTO measurements (db, duration, timestamp, location) VALUES (?, ?, ?, ?)',
    [dbValue, duration, timestamp, location]
  );
};

export const updateOrSaveMeasurement = (dbValue: number, location: string) => {
  // format 'YYYY-MM-DD HH:MM:SS'
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const lastEntry = db.getFirstSync(
    `SELECT id, db, duration FROM measurements 
     WHERE location = ? 
     AND timestamp >= datetime('now', '-1 minute') 
     ORDER BY id DESC LIMIT 1`,
    [location]
  ) as any;

  if (lastEntry) {
    const newDuration = (lastEntry.duration || 0) + 1;
    const newAvg = Math.round(((lastEntry.db * lastEntry.duration) + dbValue) / newDuration);
    
    db.runSync(
      'UPDATE measurements SET db = ?, duration = ? WHERE id = ?',
      [newAvg, newDuration, lastEntry.id]
    );
  } else {
    db.runSync(
      'INSERT INTO measurements (db, duration, timestamp, location) VALUES (?, 1, ?, ?)',
      [dbValue, timestamp, location]
    );
  }
};

export const getHistory = (): any[] => {
  return db.getAllSync('SELECT * FROM measurements ORDER BY id DESC LIMIT 20');
};
