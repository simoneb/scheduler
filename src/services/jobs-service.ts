import { toDto } from '../utils/dto';
import Agenda from 'agenda';
import { ObjectId } from 'mongodb';
import { Job } from '../models/job';
import InvalidOperationError from '../errors/invalid-operation-error';
import { EveryJob } from '../models/every-job';
import { OnceJob } from '../models/once-job';

export type JobsService = {
    list(page: number, pageSize: number): Promise<Job[]>;
    create(job: Job): Promise<Job>;
    getById(id: string): Promise<Job>;
    deleteById(id: string): Promise<void>;
}

function assertJobIsValid(job: Job) {
    const { target } = job;
    if (target.method === 'GET' && target.body) {
        throw new InvalidOperationError('body/target/body cannot be set when method is GET');
    }
    if (isEveryJob(job) && !job.interval) {
        throw new InvalidOperationError('body should have required property \'interval\' when body/type is \'every\'');
    }
    if (isOnceJob(job) && !job.when) {
        throw new InvalidOperationError('body should have required property \'when\' when body/type is \'once\'');
    }
}

function isEveryJob(job: Job): job is EveryJob {
    return job.type === 'every';
}

function isOnceJob(job: Job): job is OnceJob {
    return job.type === 'once';
}

export function buildJobsService(agenda: Agenda, jobExecutionHandler: (job:Agenda.Job, done: () => void) => void): JobsService {

    return {
        async list(page: number, pageSize: number): Promise<Job[]> {
            const jobs = await agenda.jobs({});
            return jobs.slice((page - 1) * pageSize, page * pageSize).map(toDto);
        },
        async create(job: Job): Promise<Job> {
            assertJobIsValid(job);
            switch (job.type) {
                case 'once': {
                    const jobName = new ObjectId().toHexString();
                    const createdJob = await agenda.schedule(new Date(job.when), jobName, job.target);
                    agenda.define(jobName, jobExecutionHandler);
                    return toDto(createdJob);
                }
                case 'every':
                default: {
                    const jobName = new ObjectId().toHexString();
                    const createdJob = await agenda.every(job.interval, jobName, job.target);
                    agenda.define(jobName, jobExecutionHandler);
                    return toDto(createdJob);
                }
            }
        },
        async getById(id: string): Promise<Job> {
            const _id = ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : id;
            const jobs = await agenda.jobs({ _id });
            return toDto(jobs[0]);
        },
        async deleteById(id: string): Promise<void> {
            if (!ObjectId.isValid(id)) {
                return;
            }
            await agenda.cancel({ _id: ObjectId.createFromHexString(id) });
        }
    };
}
