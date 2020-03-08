import { connect, getAndSetupDatabase } from './database';
import { buildServer } from './server';

export async function buildApp(options) {
    const dbClient = await connect(options.databaseUrl);
    const db = await getAndSetupDatabase(dbClient, options.databaseName);
    const server = buildServer();
    return {
        async close() {
            await server.close();
            await dbClient.close();
        },
        getServer() {
            return server;
        },
        getDatabase() {
            return db;
        }
    };
}
