import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase() {
  if (db) {
    return db;
  }

  const url = process.env.MONGODB_URL;
  const dbName = process.env.MONGODB_DB;

  if (!url || !dbName) {
    throw new Error('MongoDB connection string or database name not configured');
  }

  try {
    client = new MongoClient(url);
    await client.connect();
    db = client.db(dbName);
    console.log('✅ Connected to MongoDB:', dbName);
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
