import { Db } from 'mongodb';
import Agenda from 'agenda';
import * as os from 'os';

export function getAndSetupAgenda(db: Db): Agenda {
    const agenda = new Agenda({ 
        processEvery: 1000,
        mongo: db
    });
    agenda.name(`${os.hostname}-${process.pid}`);
    agenda.define('scheduler', (job, done) => {
        console.log(new Date(), job);
        done();
    });
    return agenda;
}