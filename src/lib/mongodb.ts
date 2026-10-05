import { MongoClient, type Db } from 'mongodb';

const databaseName = process.env.MONGODB_DB || 'zaindu_clinica';

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
    // Uma falha de conexão não pode ficar em cache: a próxima requisição tenta de novo.
    clientPromise = client.connect().catch(error => {
      globalThis.clinicMongoClient = undefined;
      globalThis.clinicMongoClientPromise = undefined;
      throw error;
    });
    globalThis.clinicMongoClient = client;
    globalThis.clinicMongoClientPromise = clientPromise;
  }
  return (await clientPromise).db(databaseName);
}
