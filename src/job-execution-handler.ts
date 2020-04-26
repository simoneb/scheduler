import logger from './logger';
import Agenda from 'agenda';

export default function buildJobExecutionHandler(): (job:Agenda.Job, done: () => void) => void {

    return function jobExecutionHandler(job: Agenda.Job, done: () => void): void {
        const {_id } = job.attrs;
        logger.info('Running job', _id);
        logger.info('Ran job successfully', _id);
        done();
    };
}
