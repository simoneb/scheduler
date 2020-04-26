import { Db } from 'mongodb';
import Agenda from 'agenda';
import * as os from 'os';

export async function getAndSetupAgenda(db: Db, jobExecutionHandler: (job:Agenda.Job, done: () => void) => void): Promise<Agenda> {
    const agenda = new Agenda({
        processEvery: 1000,
        mongo: db
    });
    agenda.name(`${os.hostname}-${process.pid}`);
    await defineJobs(agenda, jobExecutionHandler);
    return agenda;
}

async function defineJobs(agenda: Agenda, jobExecutionHandler: (job:Agenda.Job, done: () => void) => void): Promise<void> {
    const jobs = await agenda.jobs({});
    jobs.forEach(j => agenda.define(j.attrs.name, jobExecutionHandler));
}
