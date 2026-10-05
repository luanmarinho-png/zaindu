import { MongoClient, type Db } from 'mongodb';

const databaseName = process.env.MONGODB_DB || 'noria_clinica';

declare global {
  var clinicMongoClient: MongoClient | undefined;
  var clinicMongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI não está configurada.');
  let clientPromise = globalThis.clinicMongoClientPromise;
  if (!clientPromise) {
    const client = globalThis.clinicMongoClient ?? new MongoClient(uri, { maxPoolSize: 10 });
    clientPromise = client.connect();
    globalThis.clinicMongoClient = client;
    globalThis.clinicMongoClientPromise = clientPromise;
  }
  return (await clientPromise).db(databaseName);
}
