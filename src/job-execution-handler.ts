import logger from './logger';
import Agenda from 'agenda';
import fetch from 'node-fetch';
import { JobsExecutionsService } from './services/jobs-executions-service';
import { ObjectId } from 'mongodb';

export default function buildJobExecutionHandler(jobsExecutionsService: JobsExecutionsService): (job:Agenda.Job, done: (error?: Error) => void) => void {

    async function jobExecutionHandlerInternal(job: Agenda.Job, done: (error?: Error) => void): Promise<void> {
        const {_id, data, repeatInterval } = job.attrs;
        const { url, method, headers, body } = data;
        const jobId = _id.toHexString();
        logger.info('Running job', jobId);
        const jobExecutionId = new ObjectId().toHexString();
        const response = await fetch(url, {
            method,
            headers: {
                ...headers,
                ...(body ? { 'Content-Type': 'application/json' } : {}),
                ...{
                    'X-Scheduler-Job-Id': jobId,
                    'X-Scheduler-Job-Interval': (repeatInterval ?? '').toString(),
                    'X-Scheduler-Job-Execution-Id': jobExecutionId
                }
            },
            body: body ? JSON.stringify(body) : undefined
        });
        await jobsExecutionsService.create({
            id: jobExecutionId,
            jobId,
            createdAt: new Date(),
            success: response.ok,
            failureReason: !response.ok ? `${response.status} - ${response.statusText}` : undefined
        });
        if (!response.ok) {
            throw new Error(`${response.status} - ${response.statusText}`);
        }
        logger.info('Ran job successfully', jobId);
        done();
    }

    return function jobExecutionHandler(job: Agenda.Job, done: (error?: Error) => void): void {
        jobExecutionHandlerInternal(job, done).catch(error => {
            logger.error('Error running job', job.attrs._id, error);
            done(error);
        });
    };
}
