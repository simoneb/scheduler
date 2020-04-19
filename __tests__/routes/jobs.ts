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

    describe('get', () => {
        it('should return 200 with array of jobs', async () => {
            const createResponse = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'https://example.org',
                        method: 'GET'
                    }
                }
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
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'https://example.org',
                        method: 'GET'
                    }
                }
            })));
            const response = await server.inject({
                method: 'GET',
                url: '/jobs?page=1&pageSize=2'
            });
            const payloadResponse = JSON.parse(response.payload);
            expect(payloadResponse.prev).toBeUndefined();
            expect(payloadResponse.next).toBe('http://localhost:8888/jobs?page=2&pageSize=2');
        });

        it('should not set next and not prev link in first page when jobs returned are lower than page size', async () => {
            await Promise.all([1, 2].map(value => server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'https://example.org',
                        method: 'GET'
                    }
                }
            })));
            const response = await server.inject({
                method: 'GET',
                url: '/jobs?page=1&pageSize=3'
            });
            const payloadResponse = JSON.parse(response.payload);
            expect(payloadResponse.prev).toBeUndefined();
            expect(payloadResponse.next).toBeUndefined();
        });

        it('should set next and prev link if a middle page', async () => {
            await Promise.all([1, 2, 3, 4, 5].map(value => server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'https://example.org',
                        method: 'GET'
                    }
                }
            })));
            const response = await server.inject({
                method: 'GET',
                url: '/jobs?page=2&pageSize=2'
            });
            const payloadResponse = JSON.parse(response.payload);
            expect(payloadResponse.prev).toBe('http://localhost:8888/jobs?page=1&pageSize=2');
            expect(payloadResponse.next).toBe('http://localhost:8888/jobs?page=3&pageSize=2');
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

        it('should return 404 when job id is not a valid object id', async () => {
            const response = await server.inject({
                method: 'GET',
                url: '/jobs/abc'
            });
            expect(response.statusCode).toBe(404);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ message: 'Resource not found' }));
        });

        it('should return 200 with job info', async () => {
            const createResponse = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'https://example.org',
                        method: 'GET'
                    }
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

    describe('post', () => {
        it('should return 400 when type is undefined', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: undefined,
                    interval: '5 minutes',
                    target: {
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
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body should have required property \'type\'' }));
        });

        it('should return 400 when type is undefined', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'unknown type',
                    interval: '5 minutes',
                    target: {
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
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body.type should be equal to one of the allowed values' }));
        });

        it('should return 400 when interval is undefined', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: undefined,
                    target: {
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
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body should have required property \'interval\' when body.type is \'every\'' }));
        });

        it('should return 400 when target is undefined', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: undefined
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body should have required property \'target\'' }));
        });

        it('should return 400 when target.url is undefined', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: undefined,
                        method: 'GET'
                    }
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body.target should have required property \'url\'' }));
        });

        it('should return 400 when target.url is not valid', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'a non valid url',
                        method: 'GET'
                    }
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body.target.url should match format "url"' }));
        });

        it('should return 400 when target.method is not GET, POST, PATCH, PUT nor DELETE', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'https://example.org',
                        method: 'GUT'
                    }
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body.target.method should be equal to one of the allowed values' }));
        });

        it('should return 400 when target.header if not an object', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'https://example.org',
                        method: 'GET',
                        headers: 2
                    }
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body.target.headers should be object' }));
        });

        it('should return 400 when target.header is not in form of string dictionary', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'https://example.org',
                        method: 'GET',
                        headers: {
                            a: ['a', 'b']
                        }
                    }
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body.target.headers[\'a\'] should be string' }));
        });

        it('should return 400 when target.body is set but method is GET', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'https://example.org',
                        method: 'GET',
                        body: {
                            a: 3,
                            d: 'hi'
                        }
                    }
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body.target.body cannot be set when method is GET' }));
        });

        it.skip('should return 400 when interval is in an invalid format', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: 'bla bla bla',
                    target: {
                        url: 'https://example.org',
                        method: 'GET'
                    }
                }
            });
            expect(response.statusCode).toBe(400);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.payload).toBe(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'body.target.body cannot be set when method is GET' }));
        });

        it('should return 201 with created job when type is every and interval is valid', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'https://example.org',
                        method: 'POST',
                        headers: {
                            'Authorization': 'apiKey 123456',
                            'X-Header': 'hi'
                        },
                        body: {
                            message: 'hello world'
                        }
                    }
                }
            });
            expect(response.statusCode).toBe(201);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            const job = JSON.parse(response.payload);
            expect(response.headers.location).toBe(`http://localhost:8888/jobs/${job.id}`);
            expect(job.interval).toBe('5 minutes');
            expect(job.target.url).toBe('https://example.org');
            expect(job.target.method).toBe('POST');
            expect(job.target.headers).toStrictEqual({
                'Authorization': 'apiKey 123456',
                'X-Header': 'hi'
            });
            expect(job.target.body).toStrictEqual({
                message: 'hello world'
            });
            expect(ObjectId.isValid(job.id)).toBe(true);
        });

        it('should return 201 with created job when type is once and when is a Date', async () => {
            const date = new Date();
            const response = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'once',
                    when: date.toISOString(),
                    target: {
                        url: 'https://example.org',
                        method: 'POST',
                        headers: {
                            'Authorization': 'apiKey 123456',
                            'X-Header': 'hi'
                        },
                        body: {
                            message: 'hello world'
                        }
                    }
                }
            });
            expect(response.statusCode).toBe(201);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            const job = JSON.parse(response.payload);
            expect(response.headers.location).toBe(`http://localhost:8888/jobs/${job.id}`);
            expect(job.type).toBe('once');
            expect(job.interval).toBe(undefined);
            expect(job.when).toBe(date.toISOString());
            expect(job.target.url).toBe('https://example.org');
            expect(job.target.method).toBe('POST');
            expect(job.target.headers).toStrictEqual({
                'Authorization': 'apiKey 123456',
                'X-Header': 'hi'
            });
            expect(job.target.body).toStrictEqual({
                message: 'hello world'
            });
            expect(ObjectId.isValid(job.id)).toBe(true);
        });
    });

    describe('delete', () => {
        it('should return 204 when job does not exist', async () => {
            const response = await server.inject({
                method: 'DELETE',
                url: '/jobs/' + new ObjectId()
            });
            expect(response.statusCode).toBe(204);
        });

        it('should return 204 when job id is not Object Id format', async () => {
            const response = await server.inject({
                method: 'DELETE',
                url: '/jobs/abc'
            });
            expect(response.statusCode).toBe(204);
        });

        it('should return 204 when job exists', async () => {
            const createResponse = await server.inject({
                method: 'POST',
                url: '/jobs',
                body: {
                    type: 'every',
                    interval: '5 minutes',
                    target: {
                        url: 'https://example.org',
                        method: 'GET'
                    }
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
                url: '/jobs/' + createdJob.id
            });
            expect(getResponse.statusCode).toBe(404);
        });
    });
});
