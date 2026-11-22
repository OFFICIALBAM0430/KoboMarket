
const { Queue } = require('bullmq');
const redis = require('../config/redis');

const orderCompletionQueue = new Queue('orderCompletionQueue', {
    connection: redis,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: 500
    }
});

module.exports = { orderCompletionQueue };
