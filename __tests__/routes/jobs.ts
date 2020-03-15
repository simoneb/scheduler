jest.mock('pino');
import { ObjectId } from 'mongodb';
import config from '../../src/config';
import { buildApp } from '../../src/app';

describe('jobs', () => {
    let app;
    let server;

    beforeEach(async () => {
        const options = {
            databaseName: `test-${new ObjectId()}`,
            databaseUrl: config.mongodb.databaseUrl
        };
        app = await buildApp(options);
        server = app.getServer();
    });

    afterEach(async () => {
        await app.getDatabase().dropDatabase();
        await app.close();
    });

    describe.skip('get', () => {
        it('should return 200 with array of jobs', async () => {
            const createResponse = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {}
            });
            expect(createResponse.statusCode).toBe(201);
            expect(createResponse.headers['content-type']).toBe('application/json; charset=utf-8');
            const createdJob = JSON.parse(createResponse.payload);

            const response = await server.inject({
                method: 'GET',
                url: '/jobs'
            });
            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            const listResponse = JSON.parse(response.payload);
            expect(listResponse.results.length).toBe(1);
            const job = listResponse.results[0];
            expect(job).toEqual(createdJob);
        });

        it('should set next and not prev link in first page when jobs returned match page size', async () => {
            await Promise.all([1, 2, 3, 4, 5].map(value => server.inject({
                method: 'POST',
                url: '/jobs',
                body: {}
            })));
            const responseNoPrev = await server.inject({
                method: 'GET',
                url: '/jobs?page=1&pageSize=2'
            });
            const payloadResponseNoPrev = JSON.parse(responseNoPrev.payload);
            expect(payloadResponseNoPrev.prev).toBeUndefined();
            expect(payloadResponseNoPrev.next).toBe('http://localhost:8888/jobs?page=2&pageSize=2');
        });

        it('should not set next and not prev link in first page when jobs returned are lower than page size', async () => {
            await Promise.all([1, 2].map(value => server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    name: 'a job ' + value,
                    url: 'http://example.org'
                }
            })));
            const responseNoPrev = await server.inject({
                method: 'GET',
                url: '/jobs?page=1&pageSize=3'
            });
            const payloadResponseNoPrev = JSON.parse(responseNoPrev.payload);
            expect(payloadResponseNoPrev.prev).toBeUndefined();
            expect(payloadResponseNoPrev.next).toBeUndefined();
        });

        it('should set next and prev link if a middle page', async () => {
            await Promise.all([1, 2, 3, 4, 5].map(value => server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    name: 'a job ' + value,
                    url: 'http://example.org'
                }
            })));
            const responseNoPrev = await server.inject({
                method: 'GET',
                url: '/jobs?page=2&pageSize=2'
            });
            const payloadResponseNoPrev = JSON.parse(responseNoPrev.payload);
            expect(payloadResponseNoPrev.prev).toBe('http://localhost:8888/jobs?page=1&pageSize=2');
            expect(payloadResponseNoPrev.next).toBe('http://localhost:8888/jobs?page=3&pageSize=2');
        });

        it('should return 400 with invalid page query string', async () => {
            const response = await server.inject({
                method: 'GET',
                url: '/jobs?page=invalid'
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({
                statusCode: 400,
                error: 'Bad Request',
                message: 'querystring.page should be integer'
            }));
        });

        it('should return 400 with invalid pageSize query string', async () => {
            const response = await server.inject({
                method: 'GET',
                url: '/jobs?pageSize=invalid'
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({
                statusCode: 400,
                error: 'Bad Request',
                message: 'querystring.pageSize should be integer'
            }));
        });

        it('should return 400 with pageSize query string greater than 100', async () => {
            const response = await server.inject({
                method: 'GET',
                url: '/jobs?pageSize=101'
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({
                statusCode: 400,
                error: 'Bad Request',
                message: 'querystring.pageSize should be <= 100'
            }));
        });

        it('should return 400 with pageSize query string lesser than 1', async () => {
            const response = await server.inject({
                method: 'GET',
                url: '/jobs?pageSize=0'
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({
                statusCode: 400,
                error: 'Bad Request',
                message: 'querystring.pageSize should be >= 1'
            }));
        });

        it('should return 400 with page query string lesser than 1', async () => {
            const response = await server.inject({
                method: 'GET',
                url: '/jobs?page=0'
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({
                statusCode: 400,
                error: 'Bad Request',
                message: 'querystring.page should be >= 1'
            }));
        });
    });

    describe('get by id', () => {

        it('should return 404 when job does not exists', async () => {
            const response = await server.inject({
                method: 'GET',
                url: '/jobs/' + new ObjectId()
            });
            expect(response.statusCode).toBe(404);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ message: 'Resource not found' }));
        });

        it('should return 200 with array of jobs', async () => {
            const createResponse = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    name: 'a job',
                    url: 'http://example.org'
                }
            });
            expect(createResponse.statusCode).toBe(201);
            expect(createResponse.headers['content-type']).toBe('application/json; charset=utf-8');
            const createdJob = JSON.parse(createResponse.payload);

            const response = await server.inject({
                method: 'GET',
                url: '/jobs/' + createdJob.id
            });
            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            const getJob = JSON.parse(response.payload);
            expect(getJob).toEqual(createdJob);
        });
    });

    describe.skip('post', () => {
        it('should return 400 when name is undefined', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    name: undefined,
                    callback: {
                        url: 'https://example.org',
                        method: 'POST',
                        headers: {
                            'Authorization': 'apiKey 123' 
                        },
                        body: {}
                    }
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body should have required property \'name\'' }));
        });

        it('should return 400 when url is undefined', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    name: 'a job',
                    url: undefined
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body should have required property \'url\'' }));
        });

        it('should return 400 when url is not valid', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    name: 'a job',
                    url: 'a non valid url'
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body.url should match format "url"' }));
        });

        it('should return 400 when name is longer than 100 characters', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    name: 'a'.repeat(101),
                    url: 'https://example.org'
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body.name should NOT be longer than 100 characters' }));
        });

        it('should return 201 with created job when request is valid', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    name: 'a job',
                    url: 'http://example.org'
                }
            });
            expect(response.statusCode).toBe(201);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            const job = JSON.parse(response.payload);
            expect(response.headers.location).toBe(`http://localhost:8888/jobs/${job.id}`);
            expect(job.name).toBe('a job');
            expect(job.url).toBe('http://example.org');
            expect(ObjectId.isValid(job.id)).toBe(true);
        });

        it('should return 409 when try to create a job with the same name', async () => {
            const responseCreateJob = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    name: 'same name',
                    url: 'http://example.org'
                }
            });
            const job = JSON.parse(responseCreateJob.payload);
            const responseCreateJob2 = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    name: 'same name',
                    url: 'http://example.org'
                }
            });
            expect(responseCreateJob2.statusCode).toBe(409);
            expect(responseCreateJob2.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(responseCreateJob2.headers.location).toBe(`http://localhost:8888/jobs/${job.id}`);
            expect(responseCreateJob2.payload).toBe(JSON.stringify({ message: `job name must be unique and is already taken by job with id ${job.id}` }));
        });
    });

    describe.skip('delete', () => {
        it('should return 204 when job does not exist', async () => {
            const response = await server.inject({
                method: 'DELETE',
                url: '/jobs/' + new ObjectId()
            });
            expect(response.statusCode).toBe(204);
        });

        it('should return 204 when job exists', async () => {
            const createResponse = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    name: 'a job',
                    url: 'http://example.org'
                }
            });
            expect(createResponse.statusCode).toBe(201);
            expect(createResponse.headers['content-type']).toBe('application/json; charset=utf-8');
            const createdJob = JSON.parse(createResponse.payload);

            const deleteResponse = await server.inject({
                method: 'DELETE',
                url: '/jobs/' + createdJob.id
            });
            expect(deleteResponse.statusCode).toBe(204);

            const getResponse = await server.inject({
                method: 'GET',
                url: '/jobs' + createdJob.id
            });
            expect(getResponse.statusCode).toBe(404);
        });
    });
});
