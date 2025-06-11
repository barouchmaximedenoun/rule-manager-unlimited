// src/utils/mongoClient.ts
import { MongoClient } from 'mongodb';

const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017/your-db';
console.log(`Connecting to MongoDB at ${uri}`);
export const client = new MongoClient(uri);

export async function getDb() {
  await client.connect(); // safe même si déjà connecté
  return client.db(); // defaults to database in URI
}