import logger from './logger';
import Agenda from 'agenda';
import fetch from 'node-fetch';

export default function buildJobExecutionHandler(): (job:Agenda.Job, done: (error?: Error) => void) => void {

    async function jobExecutionHandlerInternal(job: Agenda.Job, done: (error?: Error) => void): Promise<void> {
        const {_id, data, repeatInterval } = job.attrs;
        const { url, method, headers, body } = data;
        logger.info('Running job', _id);
        const response = await fetch(url, {
            method,
            headers: {
                ...headers,
                ...(body ?  { 'Content-Type': 'application/json' } : {}),
                ...{
                    'X-Scheduler-Id': _id.toHexString(),
                    'X-Scheduler-Interval': (repeatInterval ?? '').toString()
                }
            },
            body: body ? JSON.stringify(body) : undefined
        });
        if (!response.ok) {
            throw new Error(`${response.status} - ${response.statusText}`);
        }
        logger.info('Ran job successfully', _id);
        done();
    }

    return function jobExecutionHandler(job: Agenda.Job, done: (error?: Error) => void): void {
        jobExecutionHandlerInternal(job, done).catch(error => {
            logger.error(error, job.attrs._id);
            done(error);
        })
    };
}
