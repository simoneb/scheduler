import fastify from 'fastify';
import packageInfo from '../package.json';
import fastifySwagger from 'fastify-swagger';
import config from './config';
import NotFoundError from './errors/not-found-error';
import InvalidOperationError from './errors/invalid-operation-error';
import { buildAdminRoutes } from './routes/admin/admin';
import logger from './logger';
import { buildJobsRoutes } from './routes/jobs';

export function buildServer(jobsService) {
	const app = fastify({
		logger,
		trustProxy: config.trustedProxy
	});

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

	app.setNotFoundHandler(function(request, reply) {
		// Default not found handler with preValidation and preHandler hooks
		reply.code(404).send({ message: 'Resource not found' });
	});

	app.setErrorHandler((error, request, reply) => {
		if (error instanceof NotFoundError) {
			request.log.info(error);
			reply.status(404).send({ message: 'Resource not found' });
			return;
		}
		if (error instanceof InvalidOperationError ||
			error.validation) {
			request.log.info(error);
			reply.status(400).send(error);
			return;
		}
		if (error.statusCode && error.statusCode < 500) {
			request.log.info(error);
		} else {
			request.log.error(error);
		}
		console.log(error);
		reply.status(error.statusCode ?? 500).send(error);
	});

	return app;
}
