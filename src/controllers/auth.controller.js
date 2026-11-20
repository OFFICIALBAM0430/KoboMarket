const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/user.model');
const { createUserAccount, deleteUserAccount } = require('../services/wallet.service');
const { sendVerificationEmail } = require('../services/emailVerification.service');
const RefreshToken = require('../models/refreshToken.model');
const { sendPasswordResetEmail } = require('../services/passwordReset.service');

const generateEmailVerificationCode = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

const hashVerificationCode = (code) => {
    return crypto.createHash('sha256').update(code).digest('hex');
};

const hashToken = (token) => {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
};

const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({
            email: normalizedEmail
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email address is already registered'
            });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const verificationCode = generateEmailVerificationCode();
        const hashedVerificationCode = hashVerificationCode(verificationCode);

        const user = await User.create({
            firstName,
            lastName,
            email: normalizedEmail,
            password: hashedPassword,
            isEmailVerified: false,
            emailVerificationCode: hashedVerificationCode,
            emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000)
        });
        let account;
        try {
            account = await createUserAccount(user._id);
        } catch (walletError) {
            console.error('Wallet creation failed:', walletError);
            try {
                await deleteUserAccount(user._id);
            } catch (cleanupError) {
                console.error('Account cleanup failed:', cleanupError);
            }
            try {
                await User.deleteOne({ _id: user._id });
            } catch (cleanupError) {
                console.error('User cleanup failed:', cleanupError);
            }
            throw walletError;
        }

        let verificationEmailQueued = false;
        try {
            await sendVerificationEmail(normalizedEmail, verificationCode);
            verificationEmailQueued = true;
        } catch (emailError) {
            console.error('Verification email queue failed:', emailError);
        }

        const userData = user.toObject();
        delete userData.password;
        delete userData.emailVerificationCodeHash;
        return res.status(201).json({
            success: true,
            message: verificationEmailQueued
                ? 'Account created successfully. Please check your email for your verification code.'
                : 'Account created successfully, but the verification email could not be queued. Please request another verification email.',
            data: {
                user: userData,
                account,
                verificationEmailQueued
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Email address is already registered'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Something went wrong during registration'
        });
    }
};


const verifyEmail = async (req, res) => {
    try {
        const { email, verificationCode } = req.body;
        if (!email || !verificationCode) {
            return res.status(400).json({
                success: false,
                message: 'Email and verification code are required'
            });
        }
        if (!/^\d{6}$/.test(verificationCode)) {
            return res.status(400).json({
                success: false,
                message: 'Verification code must contain six digits'
            });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email address is already verified'
            });
        }
        if (
            !user.emailVerificationCode ||
            !user.emailVerificationExpires ||
            user.emailVerificationExpires <= new Date()
        ) {
            return res.status(400).json({
                success: false,
                message: 'Verification code has expired. Please request a new one.'
            });
        }
        const hashedCode = hashVerificationCode(verificationCode);
        if (hashedCode !== user.emailVerificationCode) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

        const result = await User.updateOne(
            {
                _id: user._id,
                isEmailVerified: false,
                emailVerificationCode: hashedCode,
                emailVerificationExpires: { $gt: new Date() }
            },
            {
                $set: { isEmailVerified: true },
                $unset: {
                    emailVerificationCode: 1,
                    emailVerificationExpires: 1
                }
            }
        );
        if (result.modifiedCount !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Verification code is invalid or has expired'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Email verified successfully. You can now log in.'
        });
    } catch (error) {
        console.error('Email verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong during email verification'
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your email and password'
            });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({
            email: normalizedEmail
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );
        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        if (!user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email before logging in'
            });
        }
        if (user.accountStatus !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Your account is not active'
            });
        }
        const accessToken = jwt.sign(
            {
                userId: user._id,
                roles: user.roles,
                tokenVersion: user.tokenVersion,
                tokenType: 'access'
            },
            process.env.JWT_ACCESS_SECRET,
            {
                expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
            }
        );
        const familyId = crypto.randomUUID();
        const refreshToken = jwt.sign(
            {
                userId: user._id,
                familyId,
                tokenType: 'refresh'
            },
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
            }
        );
        const decodedRefreshToken = jwt.decode(refreshToken);
        await RefreshToken.create({
            userId: user._id,
            tokenHash: hashToken(refreshToken),
            familyId,
            expiresAt: new Date(decodedRefreshToken.exp * 1000),
            userAgent: req.get('user-agent') || null,
            ipAddress: req.ip || null
        });
        user.lastLoginAt = new Date();
        await user.save();
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    roles: user.roles,
                    isEmailVerified: user.isEmailVerified
                },
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong during login'
        });
    }
};

const refreshAccessToken = async (req, res) => {
    let newRefreshTokenHash;

    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false, message: 'Refresh token is required'
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        if (decoded.tokenType !== 'refresh' || !decoded.userId || !decoded.familyId) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }

        const tokenHash = hashToken(refreshToken);

        const storedToken = await RefreshToken.findOne({ tokenHash });

        if (!storedToken) {
            return res.status(401).json({ success: false, message: 'Refresh token is not recognized' });
        }

        if (storedToken.revokedAt || storedToken.replacedByTokenHash) {
            await RefreshToken.updateMany(
                { userId: storedToken.userId, revokedAt: null }, { $set: { revokedAt: new Date() } }
            );

            await User.updateOne({ _id: storedToken.userId },
                {
                    $inc: {
                        tokenVersion: 1
                    }
                }
            );

            return res.status(401).json({ success: false, message: 'Refresh token reuse detected. Please log in again.' });
        }

        if (storedToken.expiresAt <= new Date()) {
            return res.status(401).json({ success: false, message: 'Refresh token has expired' });
        }

        const user = await User.findById(decoded.userId).select('_id roles accountStatus tokenVersion');
        if (!user || user.accountStatus !== 'active') {
            await RefreshToken.updateMany(
                { userId: decoded.userId, revokedAt: null },
                { $set: { revokedAt: new Date() } }
            );

            return res.status(403).json({ success: false, message: 'Your account is not active' });
        }

        const accessToken = jwt.sign({
            userId: user._id,
            roles: user.roles,
            tokenVersion: user.tokenVersion,
            tokenType: 'access'
        },
            process.env.JWT_ACCESS_SECRET,
            {
                expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
            }
        );

        const newRefreshToken = jwt.sign({
            userId: user._id,
            familyId: storedToken.familyId,
            tokenType: 'refresh'
        },
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
            }
        );

        const decodedNewToken = jwt.decode(newRefreshToken);
        newRefreshTokenHash = hashToken(newRefreshToken);

        const replacementRecord = await RefreshToken.create({
            userId: user._id,
            tokenHash: newRefreshTokenHash,
            familyId: storedToken.familyId,
            expiresAt: new Date(decodedNewToken.exp * 1000), userAgent: req.get('user-agent') || null,
            ipAddress: req.ip || null
        });

        const rotationResult = await RefreshToken.updateOne({
            _id: storedToken._id,
            revokedAt: null,
            replacedByTokenHash: null,
            expiresAt: { $gt: new Date() }
        },
            {
                $set: {
                    revokedAt: new Date(),
                    replacedByTokenHash: newRefreshTokenHash
                }
            }
        );

        if (rotationResult.modifiedCount !== 1) {
            await RefreshToken.deleteOne({ _id: replacementRecord._id });

            await RefreshToken.updateMany({ userId: user._id, revokedAt: null },
                { $set: { revokedAt: new Date() } }
            );

            return res.status(401).json({ success: false, message: 'Refresh token reuse detected. Please log in again.' });
        }

        return res.status(200).json({
            success: true, message: 'Access token refreshed successfully',
            data: { accessToken, refreshToken: newRefreshToken }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        }

        console.error('Refresh token error:', error);
        return res.status(500).json({ success: false, message: 'Something went wrong while refreshing your token' });
    }
};

const logoutUser = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );
        if (decoded.tokenType !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }
        const tokenHash = hashToken(refreshToken);
        // Revoke the stored refresh token.
        const result = await RefreshToken.updateOne(
            {
                userId: decoded.userId,
                tokenHash,
                revokedAt: null
            },
            {
                $set: {
                    revokedAt: new Date()
                }
            }
        );
        if (result.modifiedCount !== 1) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token is invalid or already revoked'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        if (
            error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }
        console.error('Logout error:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong during logout'
        });
    }
};

const logoutAllDevices = async (req, res) => {
    try {
        const result = await RefreshToken.updateMany(
            {
                userId: req.user._id,
                revokedAt: null
            },
            {
                $set: {
                    revokedAt: new Date()
                }
            }
        );

        await User.updateOne({ _id: req.user._id },
            {
                $inc: {
                    tokenVersion: 1
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: 'Successfully logged out from all devices',
            data: {
                sessionsRevoked: result.modifiedCount
            }
        });
    } catch (error) {
        console.error('Logout all devices error:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while logging out from all devices'
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Please provide your email address'
            });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({
            email: normalizedEmail
        });

        const response = {
            success: true,
            message: 'If an account exists with this email, password reset instructions will be sent.'
        };
        if (!user) {
            return res.status(200).json(response);
        }

        const resetToken = crypto.randomBytes(32).toString('hex');

        const hashedResetToken = hashToken(resetToken);
        user.passwordResetToken = hashedResetToken;
        user.passwordResetExpires = new Date(
            Date.now() + 10 * 60 * 1000
        );
        await user.save();
        try {
            await sendPasswordResetEmail(
                normalizedEmail,
                resetToken
            );
        } catch (emailError) {
            console.error(
                'Password reset email queue failed:',
                emailError
            );

            await User.updateOne(
                {
                    _id: user._id,
                    passwordResetToken: hashedResetToken
                },
                {
                    $unset: {
                        passwordResetToken: 1,
                        passwordResetExpires: 1
                    }
                }
            );
        }
        return res.status(200).json(response);
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;
        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, reset token and new password are required'
            });
        }
        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }
        const normalizedEmail = email.trim().toLowerCase();

        const hashedResetToken = hashToken(resetToken);

        const user = await User.findOne({
            email: normalizedEmail,
            passwordResetToken: hashedResetToken,
            passwordResetExpires: { $gt: new Date() }
        });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired password reset token'
            });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const updateResult = await User.updateOne(
            {
                _id: user._id,
                passwordResetToken: hashedResetToken,
                passwordResetExpires: { $gt: new Date() }
            },
            {
                $set: {
                    password: hashedPassword
                },
                $unset: {
                    passwordResetToken: 1,
                    passwordResetExpires: 1
                },
                $inc: {
                    tokenVersion: 1
                }
            }
        );
        if (updateResult.modifiedCount !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired password reset token'
            });
        }

        await RefreshToken.updateMany(
            {
                userId: user._id,
                revokedAt: null
            },
            {
                $set: {
                    revokedAt: new Date()
                }
            }
        );
        return res.status(200).json({
            success: true,
            message: 'Password reset successfully. Please log in again.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while resetting your password'
        });
    }
};

module.exports = { registerUser, verifyEmail, loginUser, refreshAccessToken, logoutUser, logoutAllDevices, forgotPassword, resetPassword };
