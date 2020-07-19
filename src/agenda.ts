import { Db } from 'mongodb';
import Agenda from 'agenda';
import * as os from 'os';

export async function getAndSetupAgenda(db: Db, jobExecutionHandler: (job:Agenda.Job, done: () => void) => void): Promise<Agenda> {
    const agenda = new Agenda({
        processEvery: 1000,
        mongo: db,
        name: `${os.hostname}-${process.pid}`
    });
    agenda.define('job', jobExecutionHandler);
    return agenda;
}
