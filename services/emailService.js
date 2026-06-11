// backend/services/emailService.js
const nodemailer = require('nodemailer');

// Email configuration
let transporter = null;

// Create email transporter
const createTransporter = async () => {
    if (transporter) return transporter;
    
    // For production - use your actual email service
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    } else {
        // For development - create ethereal test account
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        console.log('📧 Development email account created:', testAccount.user);
        console.log('📧 Preview emails at: https://ethereal.email/login');
    }
    
    return transporter;
};

// Send verification email
const sendVerificationEmail = async (to, code, userName) => {
    try {
        const transporter = await createTransporter();
        
        const htmlTemplate = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify Your DORIQ Account</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
                        padding: 40px 20px;
                    }
                    .container {
                        max-width: 560px;
                        margin: 0 auto;
                        background: #1a1a2e;
                        border-radius: 24px;
                        overflow: hidden;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                        border: 1px solid rgba(59, 130, 246, 0.2);
                    }
                    .header {
                        background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
                        padding: 32px;
                        text-align: center;
                    }
                    .logo {
                        font-size: 48px;
                        font-weight: 900;
                        font-style: italic;
                        color: white;
                        margin-bottom: 8px;
                    }
                    .logo span {
                        background: linear-gradient(135deg, #fff 0%, #e0e7ff 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    }
                    .subtitle {
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 14px;
                    }
                    .content {
                        padding: 40px;
                        background: #16213e;
                    }
                    .greeting {
                        color: white;
                        font-size: 24px;
                        font-weight: 700;
                        margin-bottom: 16px;
                    }
                    .message {
                        color: #a0aec0;
                        font-size: 16px;
                        line-height: 1.6;
                        margin-bottom: 32px;
                    }
                    .code-container {
                        background: #0f3460;
                        border-radius: 16px;
                        padding: 24px;
                        text-align: center;
                        margin-bottom: 32px;
                        border: 1px solid rgba(59, 130, 246, 0.3);
                    }
                    .code-label {
                        color: #8B5CF6;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        margin-bottom: 12px;
                    }
                    .code {
                        font-size: 48px;
                        font-weight: 800;
                        letter-spacing: 12px;
                        color: white;
                        font-family: monospace;
                        background: #0a0a2e;
                        padding: 20px;
                        border-radius: 12px;
                        display: inline-block;
                    }
                    .expiry {
                        color: #718096;
                        font-size: 12px;
                        margin-top: 12px;
                    }
                    .features {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 32px;
                        padding-top: 32px;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    .feature {
                        text-align: center;
                        flex: 1;
                    }
                    .feature-icon {
                        font-size: 24px;
                        margin-bottom: 8px;
                    }
                    .feature-text {
                        color: #718096;
                        font-size: 11px;
                    }
                    .footer {
                        background: #0f0f23;
                        padding: 24px;
                        text-align: center;
                    }
                    .footer-text {
                        color: #4a5568;
                        font-size: 11px;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
                        color: white;
                        padding: 12px 32px;
                        border-radius: 40px;
                        text-decoration: none;
                        font-weight: 600;
                        margin-top: 16px;
                    }
                    @media (max-width: 600px) {
                        .content { padding: 24px; }
                        .code { font-size: 32px; letter-spacing: 8px; }
                        .greeting { font-size: 20px; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">
                            <span>DORIQ</span>
                        </div>
                        <div class="subtitle">Global Digital Wallet</div>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">
                            Hello${userName ? ` ${userName}` : ''}! 👋
                        </div>
                        
                        <div class="message">
                            Thanks for choosing DORIQ! To get started with your global digital wallet, 
                            please verify your email address using the code below.
                        </div>
                        
                        <div class="code-container">
                            <div class="code-label">Your Verification Code</div>
                            <div class="code">${code}</div>
                            <div class="expiry">⏰ This code will expire in 15 minutes</div>
                        </div>
                        
                        <div class="message">
                            Didn't request this? You can safely ignore this email. Someone might have 
                            entered your email by mistake.
                        </div>
                        
                        <div class="features">
                            <div class="feature">
                                <div class="feature-icon">💰</div>
                                <div class="feature-text">Send & Receive</div>
                            </div>
                            <div class="feature">
                                <div class="feature-icon">🌍</div>
                                <div class="feature-text">Global Transfers</div>
                            </div>
                            <div class="feature">
                                <div class="feature-icon">🛡️</div>
                                <div class="feature-text">Secure Wallet</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <div class="footer-text">
                            © 2024 DORIQ Technologies. All rights reserved.<br>
                            This is an automated message, please do not reply.
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const textTemplate = `
DORIQ - Verify Your Email

Hello${userName ? ` ${userName}` : ''}!

Thanks for choosing DORIQ! Please verify your email address using this code:

${code}

This code will expire in 15 minutes.

If you didn't request this, you can safely ignore this email.

---
DORIQ - Global Digital Wallet
Secure • Fast • Reliable
        `;
        
        const info = await transporter.sendMail({
            from: `"DORIQ" <${process.env.EMAIL_FROM || 'verify@doriq.com'}>`,
            to: to,
            subject: 'Verify Your DORIQ Account - Action Required',
            html: htmlTemplate,
            text: textTemplate
        });
        
        console.log(`📧 Verification email sent to ${to}`);
        
        // Return preview URL for development
        if (process.env.NODE_ENV !== 'production' && info.messageId) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log(`📧 Preview: ${previewUrl}`);
                return { success: true, previewUrl };
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        return { success: false, error: error.message };
    }
};

// Send password reset email
const sendPasswordResetEmail = async (to, resetLink, userName) => {
    try {
        const transporter = await createTransporter();
        
        const htmlTemplate = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your DORIQ Password</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
                        padding: 40px 20px;
                    }
                    .container {
                        max-width: 520px;
                        margin: 0 auto;
                        background: #1a1a2e;
                        border-radius: 24px;
                        overflow: hidden;
                        border: 1px solid rgba(59, 130, 246, 0.2);
                    }
                    .header {
                        background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
                        padding: 32px;
                        text-align: center;
                    }
                    .logo { font-size: 48px; font-weight: 900; font-style: italic; color: white; }
                    .content { padding: 40px; background: #16213e; }
                    .greeting { color: white; font-size: 24px; font-weight: 700; margin-bottom: 16px; }
                    .message { color: #a0aec0; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
                        color: white;
                        padding: 14px 32px;
                        border-radius: 40px;
                        text-decoration: none;
                        font-weight: 600;
                        margin: 16px 0;
                    }
                    .warning { color: #fbbf24; font-size: 12px; margin-top: 16px; }
                    .footer { background: #0f0f23; padding: 24px; text-align: center; }
                    .footer-text { color: #4a5568; font-size: 11px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">DORIQ</div>
                    </div>
                    <div class="content">
                        <div class="greeting">Reset Your Password 🔐</div>
                        <div class="message">
                            We received a request to reset your DORIQ account password. 
                            Click the button below to create a new password.
                        </div>
                        <div style="text-align: center;">
                            <a href="${resetLink}" class="button">Reset Password</a>
                        </div>
                        <div class="message">
                            If you didn't request this, you can safely ignore this email.
                            Your password will not be changed.
                        </div>
                        <div class="warning">
                            ⚠️ This link will expire in 1 hour for security reasons.
                        </div>
                    </div>
                    <div class="footer">
                        <div class="footer-text">© 2024 DORIQ Technologies. All rights reserved.</div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        await transporter.sendMail({
            from: `"DORIQ" <${process.env.EMAIL_FROM || 'noreply@doriq.com'}>`,
            to: to,
            subject: 'Reset Your DORIQ Password',
            html: htmlTemplate,
            text: `Reset your DORIQ password\n\nClick this link to reset your password: ${resetLink}\n\nThis link expires in 1 hour.`
        });
        
        console.log(`📧 Password reset email sent to ${to}`);
        return { success: true };
    } catch (error) {
        console.error('Password reset email error:', error);
        return { success: false, error: error.message };
    }
};

// Send welcome email after verification
const sendWelcomeEmail = async (to, userName) => {
    try {
        const transporter = await createTransporter();
        
        const htmlTemplate = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to DORIQ!</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
                        padding: 40px 20px;
                    }
                    .container {
                        max-width: 520px;
                        margin: 0 auto;
                        background: #1a1a2e;
                        border-radius: 24px;
                        overflow: hidden;
                        border: 1px solid rgba(59, 130, 246, 0.2);
                    }
                    .header {
                        background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
                        padding: 40px;
                        text-align: center;
                    }
                    .logo { font-size: 56px; font-weight: 900; font-style: italic; color: white; }
                    .content { padding: 40px; background: #16213e; }
                    .greeting { color: white; font-size: 28px; font-weight: 700; margin-bottom: 16px; }
                    .message { color: #a0aec0; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
                    .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
                    .feature-card { background: #0f3460; padding: 16px; border-radius: 12px; text-align: center; }
                    .feature-icon { font-size: 28px; margin-bottom: 8px; }
                    .feature-name { color: white; font-size: 14px; font-weight: 600; }
                    .feature-desc { color: #718096; font-size: 10px; margin-top: 4px; }
                    .footer { background: #0f0f23; padding: 24px; text-align: center; }
                    .footer-text { color: #4a5568; font-size: 11px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">DORIQ</div>
                    </div>
                    <div class="content">
                        <div class="greeting">Welcome to DORIQ, ${userName || 'there'}! 🎉</div>
                        <div class="message">
                            Your email has been successfully verified and your global digital wallet is now active!
                            Here's what you can do with DORIQ:
                        </div>
                        <div class="features-grid">
                            <div class="feature-card">
                                <div class="feature-icon">💰</div>
                                <div class="feature-name">Send Money</div>
                                <div class="feature-desc">Instant transfers globally</div>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">📱</div>
                                <div class="feature-name">Airtime & Data</div>
                                <div class="feature-desc">Buy for any network</div>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">⚡</div>
                                <div class="feature-name">Bill Payments</div>
                                <div class="feature-desc">Electricity, TV, and more</div>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">💎</div>
                                <div class="feature-name">Vault Savings</div>
                                <div class="feature-desc">Earn up to 12% interest</div>
                            </div>
                        </div>
                        <div class="message">
                            <strong>Ready to get started?</strong><br>
                            Log in to your DORIQ account and explore all the features waiting for you!
                        </div>
                    </div>
                    <div class="footer">
                        <div class="footer-text">© 2024 DORIQ Technologies. All rights reserved.</div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        await transporter.sendMail({
            from: `"DORIQ Team" <${process.env.EMAIL_FROM || 'welcome@doriq.com'}>`,
            to: to,
            subject: 'Welcome to DORIQ! Your Global Wallet is Ready 🚀',
            html: htmlTemplate,
            text: `Welcome to DORIQ, ${userName || 'there'}!\n\nYour email has been verified and your wallet is active.\n\nLog in to start using DORIQ today!`
        });
        
        console.log(`📧 Welcome email sent to ${to}`);
        return { success: true };
    } catch (error) {
        console.error('Welcome email error:', error);
        return { success: false };
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail
};