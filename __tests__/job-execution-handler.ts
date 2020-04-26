import nock from 'nock';
import { ObjectId } from 'mongodb';
import Agenda from 'agenda';
import { buildApp } from '../src/app';
import config from '../src/config';

describe('jobExecutionHandler', () => {

    let app;
    let jobExecutionHandler;

    beforeEach(async () => {
        const options = {
            databaseName: `test-${new ObjectId()}`,
            databaseUrl: config.mongodb.databaseUrl
        };
        app = await buildApp(options);
        nock.cleanAll();
        jobExecutionHandler = app.getJobExecutionHandler();
    });

    afterEach(async () => {
        await app.getDatabase().dropDatabase();
        await app.close();
    });


    it('should perform post http call with json payload', async () => {
        const job = {
            agenda: null,
            attrs: {
                name: 'a job',
                repeatInterval: '* * * * *',
                type: 'normal',
                _id: new ObjectId(),
                data: {
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
        } as unknown as Agenda.Job;

        const scope = nock('https://example.org', {
                reqheaders: {
                    'Authorization': 'apiKey 123456',
                    'X-Header': 'hi',
                    'X-Scheduler-Job-Id': job.attrs._id.toHexString(),
                    'X-Scheduler-Job-Interval': job.attrs.repeatInterval.toString(),
                    'Content-Type': 'application/json'
                }
            }).post('/', JSON.stringify({ message: 'hello world' })).reply(200);

        let doneResolve;
        const donePromise = new Promise(resolve => {
            doneResolve = resolve;
        });

        jobExecutionHandler(job, doneResolve);

        await donePromise;

        expect(scope.isDone()).toBe(true);
    });

    it('should perform get http call', async () => {
        const job = {
            agenda: null,
            attrs: {
                name: 'a job',
                repeatInterval: null,
                type: 'normal',
                _id: new ObjectId(),
                data: {
                    url: 'https://example.org',
                    method: 'GET'
                }
            }
        } as unknown as Agenda.Job;

        const scope = nock('https://example.org', {
                reqheaders: {
                    'X-Scheduler-Job-Id': job.attrs._id.toHexString()
                }
            }).get('/').reply(200);

        let doneResolve;
        const donePromise = new Promise(resolve => {
            doneResolve = resolve;
        });

        jobExecutionHandler(job, doneResolve);

        await donePromise;

        expect(scope.isDone()).toBe(true);
    });

    it('should perform call done callback with Error when http call fails', async () => {
        const job = {
            agenda: null,
            attrs: {
                name: 'a job',
                repeatInterval: '* * * * *',
                type: 'normal',
                _id: new ObjectId(),
                data: {
                    url: 'https://example.org',
                    method: 'GET'
                }
            }
        } as unknown as Agenda.Job;

        const scope = nock('https://example.org', {
                reqheaders: {
                    'X-Scheduler-Job-Id': job.attrs._id.toHexString(),
                    'X-Scheduler-Job-Interval': job.attrs.repeatInterval.toString(),
                }
            }).get('/').reply(500, { message: 'Unexpected error' });

        let doneResolve;
        const donePromise = new Promise<Error>(resolve => {
            doneResolve = resolve;
        });

        jobExecutionHandler(job, doneResolve);

        const error = await donePromise;
        expect(error.message).toBe('500 - Internal Server Error');
        expect(scope.isDone()).toBe(true);
    });
});
