import { toDto } from '../utils/dto';
import Agenda from 'agenda';
import { ObjectId } from 'mongodb';
import { Job } from '../models/Job';

export type JobsService = {
    list(page: number, pageSize: number): Promise<Job[]>;
    create(job: Job): Promise<Job>;
    getById(id: string): Promise<Job>;
    deleteById(id: string): Promise<void>;
}

export function buildJobsService(agenda: Agenda): JobsService {

    const jobs: any = [];

    return {
        async list(page: number, pageSize: number): Promise<Job[]> {
            return jobs.map(toDto);
        },
        async create(job: Job): Promise<Job> {
            const { interval, url } = job;
            const createdJob = await agenda.every(interval, 'scheduler', { url });
            return toDto(createdJob);
        },
        async getById(id: string): Promise<Job> {
            const _id = ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : id;
            const jobs = await agenda.jobs({ _id });
            return toDto(jobs[0]);
        },
        async deleteById(id: string): Promise<void> {
            
        }
    };
}