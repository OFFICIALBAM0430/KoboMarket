require('dotenv').config();

const {Worker} = require('bullmq');
const redis = require('../config/redis');
const sendEmail = require('../utils/sendEmail');

const emailWorker = new Worker('emailQueue',

    async (job) => {
        console.log(`Processing email job: ${job.id}`);

        const {to, subject, text, html, message} = job.data;

        const result = await sendEmail({
            to,
            subject,
            text: text || message,
            html,
        });
        console.log(`Email sent successfully for job: ${job.id}`);

        return {
            success: true,
            messageId: result.messageId,
        };
    },

    {
        connection: redis,
    }
);

emailWorker.on('completed', (job, result) => {
    console.log(`Email job ${job.id}completed:`, result);
});

emailWorker.on('failed', (job, error) => {
    console.log(`Email job ${job?.id} failed:`);
});

emailWorker.on('error', (error) => {
    console.log('Email worker error:');
});

console.log('KoboMarket email worker is running');

module.exports = emailWorker;