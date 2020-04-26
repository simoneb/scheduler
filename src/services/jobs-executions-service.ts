import { ObjectId, Db } from 'mongodb';
import { JobExecution } from '../models/job-execution';
import InvalidOperationError from '../errors/invalid-operation-error';

export type JobsExecutionsService = {
    list(page: number, pageSize: number, jobId?: string): Promise<JobExecution[]>;
    create(jobExecution: JobExecution): Promise<JobExecution>;
}

function toDto(item): JobExecution {
    const { createdAt, _id, jobId, success, failureReason } = item;
    return {
        createdAt,
        jobId: jobId.toHexString(),
        success,
        id: _id.toHexString(),
        failureReason
    };
}

export function buildJobsExecutionsService(db: Db): JobsExecutionsService {
    const jobsExecutions = db.collection('jobs-executions');
    return {
        async list(page: number, pageSize: number, jobId?: string): Promise<JobExecution[]> {
            if (jobId && !ObjectId.isValid(jobId)) {
                throw new InvalidOperationError('jobId format is invalid');
            }
            const query = jobId ? { jobId: new ObjectId(jobId) } : {};
            const skip = (page - 1) * pageSize;
            const result = await jobsExecutions.find(query).limit(pageSize).skip(skip).sort({ createdAt: -1 }).toArray();
            return result.map(toDto);
        },
        async create(jobExecution: JobExecution): Promise<JobExecution> {
            const { id, jobId, ...rest } = jobExecution;
            await jobsExecutions.insertOne({
                _id: new ObjectId(id),
                jobId: new ObjectId(jobId),
                ...rest
            });
            return jobExecution;
        }
    };
}
