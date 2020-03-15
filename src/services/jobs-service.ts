import { toDto } from '../utils/dto';

export function buildJobsService() {

    const jobs: any = [];

    return {
        async list(page, pageSize) {
            return jobs.map(toDto);
        },
        async create(job) {
            jobs.push(job);
        },
        async getById(id) {
            const job = await jobs.find(j => j.id === id);
            return toDto(job);
        },
        async deleteById(id) {
            
        }
    };
}