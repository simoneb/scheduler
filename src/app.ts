import { connect, getAndSetupDatabase } from './database';
import { buildServer } from './server';
import { getAndSetupAgenda } from './agenda';
import { buildJobsService } from './services/jobs-service';

export async function buildApp(options) {
    const dbClient = await connect(options.databaseUrl);
    const db = await getAndSetupDatabase(dbClient, options.databaseName);
    const agenda = await getAndSetupAgenda(db);
    await agenda.start();
    const jobsService = buildJobsService(agenda);
    const server = buildServer(jobsService);
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
