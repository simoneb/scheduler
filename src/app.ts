import { connect, getAndSetupDatabase } from './database';
import { buildServer } from './server';
import { getAndSetupAgenda } from './agenda';
import { buildJobsService } from './services/jobs-service';
import buildJobExecutionHandler from './job-execution-handler';
import { buildJobsExecutionsService } from './services/jobs-executions-service';
import { Db } from 'mongodb';
import { Server, IncomingMessage, ServerResponse } from 'http';
import { FastifyInstance } from 'fastify';
import Agenda from 'agenda';

export type App = {
    close(): Promise<void>;
    getDatabase(): Db,
    getServer(): FastifyInstance<Server, IncomingMessage, ServerResponse>,
    getJobExecutionHandler(): (job: Agenda.Job, done: (error?: Error) => void) => void
};

export async function buildApp(options): Promise<App> {
    const dbClient = await connect(options.databaseUrl);
    const db = await getAndSetupDatabase(dbClient, options.databaseName);
    const jobsExecutionsService = buildJobsExecutionsService(db);
    const jobExecutionHandler = buildJobExecutionHandler(jobsExecutionsService);
    const agenda = await getAndSetupAgenda(db, jobExecutionHandler);
    await agenda.start();
    const jobsService = buildJobsService(agenda, jobExecutionHandler);
    const server = buildServer(jobsService, jobsExecutionsService);
    return {
        async close(): Promise<void> {
            await server.close();
            await agenda.stop();
            await dbClient.close();
        },
        getServer(): FastifyInstance<Server, IncomingMessage, ServerResponse> {
            return server;
        },
        getJobExecutionHandler() {
            return jobExecutionHandler;
        },
        getDatabase(): Db {
            return db;
        }
    };
}
