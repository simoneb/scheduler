import { Db } from 'mongodb';
import Agenda from 'agenda';
import * as os from 'os';

export async function getAndSetupAgenda(db: Db): Promise<Agenda> {
    const agenda = new Agenda({ 
        processEvery: 1000,
        mongo: db
    });
    agenda.name(`${os.hostname}-${process.pid}`);
    await defineJobs(agenda);
    return agenda;
}

async function defineJobs(agenda: Agenda): Promise<void> {
    const jobs = await agenda.jobs({});
    jobs.forEach(j => agenda.define(j.attrs.name, jobProcessingHandler));
}

export function jobProcessingHandler(job, done) {
    console.log(new Date(), job);
    done();
}