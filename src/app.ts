import { connect, getAndSetupDatabase } from './database';
import { buildServer } from './server';
import { getAndSetupAgenda } from './agenda';

export async function buildApp(options) {
    const dbClient = await connect(options.databaseUrl);
    const db = await getAndSetupDatabase(dbClient, options.databaseName);
    const agenda = getAndSetupAgenda(db);
    await agenda.start();
    const server = buildServer();
    return {
        async close() {
            await server.close();
            await agenda.stop();
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
