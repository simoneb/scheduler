import { connect, getAndSetupDatabase } from './database';
import { buildServer } from './server';
import { getAndSetupAgenda } from './agenda';
import { buildJobsService } from './services/jobs-service';
import buildJobExecutionHandler from './job-execution-handler';

export async function buildApp(options) {
    const dbClient = await connect(options.databaseUrl);
    const db = await getAndSetupDatabase(dbClient, options.databaseName);
    const jobExecutionHandler = buildJobExecutionHandler();
    const agenda = await getAndSetupAgenda(db, jobExecutionHandler);
    await agenda.start();
    const jobsService = buildJobsService(agenda, jobExecutionHandler);
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
