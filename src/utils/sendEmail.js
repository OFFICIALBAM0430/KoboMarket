const emailTransporter = require('../config/email');

const sendEmail = async ({ to, subject, text, html}) => {
    try {
        if (!to || !subject || (!text && !html)) {
            throw new Error('Recipient, subject and email content are required');
        }

        const emailOptions = {
            from: process.env.EMAIL_FROM,
            to,
            subject,
            text,
            html,
        };

        const result = await emailTransporter.sendMail(emailOptions);

        console.log('Email sent successfully:', result.messageId);

        return result;
    } catch (error) {
        console.log('Email sending failed:');
        throw error;
    }
};
module.exports = sendEmail;