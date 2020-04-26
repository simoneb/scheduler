import { getNextLink, getPrevLink } from '../utils/url';
import { JobsExecutionsService } from '../services/jobs-executions-service';

const jobExecutionSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        id: { type: 'string' },
        jobId: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        success: { type: 'boolean' },
        failureReason: { type: 'string' }
    }
};

const listSchema = {
    tags: ['jobs'],
    querystring: {
        page: { type: 'integer', minimum: 1, default: 1 },
        pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
        jobId: { type: 'string' }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                results: {
                    type: 'array',
                    items: jobExecutionSchema
                },
                next: { type: 'string' },
                prev: { type: 'string' }
            }
        }
    }
};

export function buildJobsExecutionsRoutes(jobsExecutionsService: JobsExecutionsService) {

    async function list(request) {
        const { page, pageSize, jobId } = request.query;
        const results = await jobsExecutionsService.list(page, pageSize, jobId);
        return {
            results,
            next: getNextLink(request, results),
            prev: getPrevLink(request)
        };
    }

    return function(fastify, opts, next) {
        fastify.get('/', { ...opts, schema: listSchema }, list);
        next();
    };
}
