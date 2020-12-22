import fastify from 'fastify';
import packageInfo from '../package.json';
import fastifySwagger from 'fastify-swagger';
import config from './config';
import NotFoundError from './errors/not-found-error';
import InvalidOperationError from './errors/invalid-operation-error';
import { buildAdminRoutes } from './routes/admin/admin';
import logger from './logger';
import { buildJobsRoutes } from './routes/jobs';
import { JobsService } from './services/jobs-service';
import { JobsExecutionsService } from './services/jobs-executions-service';
import { buildJobsExecutionsRoutes } from './routes/jobs-executions';
import Ajv from 'ajv';
import AjvErrors from 'ajv-errors';

export function buildServer(jobsService: JobsService, jobsExecutionsService: JobsExecutionsService) {
	const app = fastify({
		logger,
		trustProxy: config.trustedProxy
	});

	const ajv = new Ajv({
		removeAdditional: true,
		useDefaults: true,
		coerceTypes: true,
		allErrors: true,
		nullable: true,
		jsonPointers: true
	});
	AjvErrors(ajv);
	app.setValidatorCompiler(({ schema }) => ajv.compile(schema));

	app.register(fastifySwagger, {
		routePrefix: '/documentation',
		exposeRoute: true,
		swagger: {
			info: {
				title: packageInfo.name,
				description: packageInfo.description,
				version: packageInfo.version
			},
			externalDocs: {
				url: packageInfo.homepage,
				description: 'Find more info here'
			},
			tags: [
				{ name: 'system', description: 'System related end-points' },
				{ name: 'jobs', description: 'Jobs related end-points' }
			],
			host: config.externalHttp.host + (config.externalHttp.port ? ':' + config.externalHttp.port : ''),
			schemes: [config.externalHttp.protocol],
			consumes: ['application/json'],
			produces: ['application/json']
		}
	});

	// End points
	app.register(buildAdminRoutes(), { prefix: '/admin' });
	app.register(buildJobsRoutes(jobsService), { prefix: '/jobs' });
	app.register(buildJobsExecutionsRoutes(jobsExecutionsService), { prefix: '/jobs-executions' });

	app.setNotFoundHandler(function(request, reply) {
		// Default not found handler with preValidation and preHandler hooks
		reply.code(404).send({ message: 'Resource not found' });
	});

	app.setErrorHandler((error, request, reply) => {
		if (error instanceof NotFoundError) {
			request.log.info(error.message);
			reply.status(404).send({ message: 'Resource not found' });
			return;
		}
		if (error instanceof InvalidOperationError ||
			error.validation) {
			request.log.info(error.message);
			reply.status(400).send(error);
			return;
		}
		if (error.statusCode && error.statusCode < 500) {
			request.log.info(error.message);
		} else {
			request.log.error(error.message);
		}
		reply.status(error.statusCode ?? 500).send(error);
	});

	return app;
}
