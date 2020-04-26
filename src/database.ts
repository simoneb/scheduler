import mongodb from 'mongodb';

const ninetyDays = 60 * 60 * 24 * 30 * 3;

export function connect(uri) {
    return mongodb.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ignoreUndefined: true
    });
}

export async function getAndSetupDatabase(client, databaseName) {
    const db = client.db(databaseName);
    const jobExecutions = db.collection('job-executions');
    await jobExecutions.createIndex({ createdAt: 1 }, { expireAfterSeconds: ninetyDays });
    await jobExecutions.createIndex({ jobId:1, createdAt: 1 });
    return db;
}
