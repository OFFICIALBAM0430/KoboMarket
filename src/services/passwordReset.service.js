const emailQueue = require('../queues/email.queue');

const sendPasswordResetEmail = async (email, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    await emailQueue.add('passwordReset', {
        to: email,
        subject: 'KoboMarket Password Reset',
        text: `We received a request to reset your KoboMarket password.
Use this token to reset your password:
${resetToken}
You can also use this reset link:
${resetUrl}
This token expires in 10 minutes.
If you did not request a password reset, please ignore this email.`,
        html: `
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your KoboMarket password.</p>
            <p>Your password reset token is:</p>
            <h3>${resetToken}</h3>
            <p><a href="${resetUrl}">Reset Your Password</a></p>
            <p>This token expires in 10 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        `
    });
    return true;
};
module.exports = { sendPasswordResetEmail };