const nodemailer = require('nodemailer');

let transporter = null;
let testAccount = null;

/**
 * Initialize the email transporter
 * Uses Ethereal in development, real SMTP in production
 */
async function initTransporter() {
    if (transporter) return transporter;
    
    const isDev = process.env.NODE_ENV !== 'production';
    
    if (isDev && !process.env.SMTP_USER) {
        // Create Ethereal test account automatically in development
        console.log('Creating Ethereal test account...');
        testAccount = await nodemailer.createTestAccount();
        
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        
        console.log('='.repeat(60));
        console.log('ETHEREAL TEST EMAIL ACCOUNT CREATED');
        console.log('='.repeat(60));
        console.log(`User: ${testAccount.user}`);
        console.log(`Pass: ${testAccount.pass}`);
        console.log(`View emails at: https://ethereal.email/login`);
        console.log('='.repeat(60));
    } else {
        // Use configured SMTP in production or when SMTP_USER is set
        const port = parseInt(process.env.SMTP_PORT) || 587;
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: port,
            secure: port === 465, // true for 465 (SSL), false for 587 (TLS)
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    
    return transporter;
}

/**
 * Send verification email to user
 * @param {string} email - User's email address
 * @param {string} token - Verification token
 */
async function sendVerificationEmail(email, token) {
    const transport = await initTransporter();
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/verify/${token}`;
    
    const fromEmail = testAccount ? testAccount.user : process.env.SMTP_USER;
    
    const mailOptions = {
        from: `"Matcha" <${fromEmail}>`,
        to: email,
        subject: 'Verify your Matcha account',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #e91e63;">Welcome to Matcha!</h1>
                <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" 
                       style="background-color: #e91e63; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email
                    </a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    This link will expire in 24 hours. If you did not create an account, please ignore this email.
                </p>
            </div>
        `,
        text: `Welcome to Matcha!\n\nPlease verify your email by visiting: ${verificationUrl}\n\nThis link will expire in 24 hours.`
    };

    const info = await transport.sendMail(mailOptions);
    
    // In development with Ethereal, log the preview URL
    if (testAccount) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('='.repeat(60));
        console.log('EMAIL SENT - Preview URL:');
        console.log(previewUrl);
        console.log('='.repeat(60));
    }
    
    return info;
}

/**
 * Verify SMTP connection
 */
async function verifyConnection() {
    try {
        const transport = await initTransporter();
        await transport.verify();
        console.log('SMTP connection verified');
        return true;
    } catch (error) {
        console.error('SMTP connection failed:', error.message);
        return false;
    }
}

module.exports = {
    sendVerificationEmail,
    verifyConnection,
    initTransporter
};
