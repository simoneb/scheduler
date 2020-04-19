import NotFoundError from '../errors/not-found-error';
import { getNextLink, getPrevLink, getExternalUrl } from '../utils/url';
import { JobsService } from '../services/jobs-service';

const jobTargetSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['url', 'method'],
    properties: {
        url: { type: 'string', format: 'url' },
        method: {
            type: 'string',
            enum: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
        },
        headers: {
            type: 'object',
            additionalProperties: { type: 'string' }
        },
        body: {
            type: 'object',
            additionalProperties: true
        }
    }
};

const jobSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        id: { type: 'string' },
        type: { type: 'string', enum: ['every', 'once' ] },
        interval: { type: 'string' },
        when: { type: 'string', format: 'date-time' },
        nextRunAt: { type: 'string' },
        target: jobTargetSchema
    }
};

const listSchema = {
    tags: ['jobs'],
    querystring: {
        page: { type: 'integer', minimum: 1, default: 1 },
        pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                results: {
                    type: 'array',
                    items: jobSchema
                },
                next: { type: 'string' },
                prev: { type: 'string' }
            }
        }
    }
};

const getSchema = {
    tags: ['jobs'],
    params: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'job identifier'
          }
        }
    },
    response: {
        200: jobSchema
    }
};

const deleteSchema = {
    tags: ['jobs'],
    params: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'job identifier'
          }
        }
    },
    response: {
        204: {
            type: 'object'
        }
    }
};

const createSchema = {
    tags: ['jobs'],
    body: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'target'],
        properties: {
            type: { type: 'string', enum: ['every', 'once' ] },
            interval: { type: 'string' },
            when: { type: 'string', format: 'date-time' },
            target: jobTargetSchema
        }
    },
    response: {
        201: jobSchema
    }
};

export function buildJobsRoutes(jobsService: JobsService) {

    async function list(request) {
        const { page, pageSize } = request.query;
        const results = await jobsService.list(page, pageSize);
        return {
            results,
            next: getNextLink(request, results),
            prev: getPrevLink(request)
        };
    }

    async function getById(request) {
        const { id } = request.params;
        const job = await jobsService.getById(id);
        if (!job) {
            throw new NotFoundError(`Job ${id} cannot be found`);
        }
        return job;
    }

    async function deleteById(request, reply) {
        const { id } = request.params;
        await jobsService.deleteById(id);
        reply.status(204).send();
    }

    async function create(request, reply) {
        const job = await jobsService.create(request.body);
        reply.header('Location', `${getExternalUrl(request.raw.originalUrl)}/${job.id}`);
        reply.status(201).send(job);
    }

    return function(fastify, opts, next) {
        fastify.get('/', { ...opts, schema: listSchema }, list);
        fastify.get('/:id', { ...opts, schema: getSchema }, getById);
        fastify.delete('/:id', { ...opts, schema: deleteSchema }, deleteById);
        fastify.post('/', { ...opts, schema: createSchema }, create);
        next();
    };
}
