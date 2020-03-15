import { toDto } from '../utils/dto';
import Agenda from 'agenda';
import { ObjectId } from 'mongodb';
import { Job } from '../models/Job';
import { jobProcessingHandler } from '../agenda';

export type JobsService = {
    list(page: number, pageSize: number): Promise<Job[]>;
    create(job: Job): Promise<Job>;
    getById(id: string): Promise<Job>;
    deleteById(id: string): Promise<void>;
}

export function buildJobsService(agenda: Agenda): JobsService {

    return {
        async list(page: number, pageSize: number): Promise<Job[]> {
            const jobs = await agenda.jobs({});
            return jobs.slice((page - 1) * pageSize, page * pageSize).map(toDto);
        },
        async create(job: Job): Promise<Job> {
            const { interval, target } = job;
            const jobName = new ObjectId().toHexString();
            agenda.define(jobName, jobProcessingHandler);
            const createdJob = await agenda.every(interval, jobName, target);
            return toDto(createdJob);
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