import mongodb from 'mongodb';

export function connect(uri) {
    return mongodb.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ignoreUndefined: true
    });
}

export async function getAndSetupDatabase(client, databaseName) {
    const db = client.db(databaseName);
    return db;
}
