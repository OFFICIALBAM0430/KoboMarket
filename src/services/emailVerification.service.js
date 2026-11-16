const emailQueue = require('../queues/email.queue');

const sendVerificationEmail = async (email, verificationCode) => {
    await emailQueue.add('emailVerification', { to: email,
        subject: 'Verify Your KoboMarket Account',
        text: `Welcome to KoboMarket!

        Your email verification code is: ${verificationCode}
        
        This code expires in 10 minutes.
        
        if you did not create this account, please ignore this email.`,
        html: `
        <h2>Welcome to KoboMarket!</h2>
        <p>Thank you for creating an account.</p>
        <p>Your email verification code is:</p>
        <h1>${verificationCode}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not create this account, please ignore this email.</p>`,
    });

    return true;
};

module.exports = { sendVerificationEmail};