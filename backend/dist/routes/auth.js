"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../config/database");
const client_ses_1 = require("@aws-sdk/client-ses");
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'ses';
let sesClient = null;
if (EMAIL_PROVIDER === 'ses' && process.env.AWS_ACCESS_KEY_ID) {
    try {
        sesClient = new client_ses_1.SESClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
            maxAttempts: 3,
        });
        console.log('AWS SES client configured for region:', process.env.AWS_REGION || 'us-east-1');
    }
    catch (error) {
        console.error('Failed to configure AWS SES client:', error);
    }
}
const router = express_1.default.Router();
async function sendVerificationEmail(email, verificationToken) {
    const verificationLink = `https://api.macroscope.info/api/auth/verify-email?token=${verificationToken}`;
    const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4c4a0;">Welcome to MacroScope! 📊</h2>
      <p>Thank you for registering with MacroScope. Please click the button below to verify your email address:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="color: #666; word-break: break-all;">${verificationLink}</p>
      <p>This verification link will expire in 24 hours.</p>
      <p>If you didn't create this account, please ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px;">MacroScope Research Coordination Platform</p>
    </div>
  `;
    if (EMAIL_PROVIDER === 'ses' && sesClient) {
        const command = new client_ses_1.SendEmailCommand({
            Source: process.env.SES_FROM_EMAIL || 'noreply@macroscope.info',
            Destination: { ToAddresses: [email] },
            Message: {
                Subject: { Data: 'Verify your MacroScope account' },
                Body: { Html: { Data: emailContent } }
            }
        });
        try {
            const result = await sesClient.send(command);
            console.log('Email sent successfully. MessageId:', result.MessageId);
        }
        catch (error) {
            console.error('AWS SES error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to send email: ${errorMessage}`);
        }
    }
    else {
        throw new Error('Email service not configured or unavailable');
    }
}
async function sendPasswordResetEmail(email, resetToken) {
    const resetLink = `https://api.macroscope.info/api/auth/reset-password?token=${resetToken}`;
    const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4c4a0;">MacroScope Password Reset 🔐</h2>
      <p>You requested to reset your password for your MacroScope account. Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="color: #666; word-break: break-all;">${resetLink}</p>
      <p>This password reset link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px;">MacroScope Research Coordination Platform</p>
    </div>
  `;
    if (EMAIL_PROVIDER === 'ses' && sesClient) {
        const command = new client_ses_1.SendEmailCommand({
            Source: process.env.SES_FROM_EMAIL || 'noreply@macroscope.info',
            Destination: { ToAddresses: [email] },
            Message: {
                Subject: { Data: 'Reset your MacroScope password' },
                Body: { Html: { Data: emailContent } }
            }
        });
        try {
            const result = await sesClient.send(command);
            console.log('Password reset email sent successfully. MessageId:', result.MessageId);
        }
        catch (error) {
            console.error('AWS SES error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to send password reset email: ${errorMessage}`);
        }
    }
    else {
        throw new Error('Email service not configured or unavailable');
    }
}
router.get('/test', (req, res) => {
    res.json({ message: 'Auth router is working!' });
});
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const saltRounds = 10;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const { data, error } = await database_1.supabase
            .from('users')
            .insert([
            {
                username,
                email,
                password_hash: passwordHash,
                email_verified: false,
                verification_token: verificationToken,
                verification_token_expires: verificationExpiry.toISOString()
            }
        ])
            .select('id, username, email, created_at')
            .single();
        if (error) {
            console.error('Registration error:', error);
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Username or email already exists' });
            }
            return res.status(500).json({ error: 'Failed to create user' });
        }
        try {
            await sendVerificationEmail(email, verificationToken);
            console.log('Verification email sent to:', email);
        }
        catch (emailError) {
            console.error('Failed to send verification email:', emailError);
        }
        res.status(201).json({
            message: 'Registration successful! Please check your email to verify your account.',
            requiresVerification: true,
            email: email
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/login', async (req, res) => {
    try {
        console.log('SUPABASE AUTH ROUTE: Login request received');
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: user, error } = await database_1.supabase
            .from('users')
            .select('id, username, email, password_hash, email_verified')
            .eq('email', email)
            .single();
        if (error || !user) {
            console.log('User not found or database error');
            return res.status(401).json({ error: 'Username or password not recognized' });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isPasswordValid) {
            console.log('Password is invalid');
            return res.status(401).json({ error: 'Username or password not recognized' });
        }
        if (!user.email_verified) {
            return res.status(403).json({
                error: 'Please verify your email address before logging in',
                requiresVerification: true,
                email: user.email
            });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Invalid Verification Link</h2>
            <p>This verification link is invalid or malformed.</p>
            <a href="macroscope://login" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Open MacroScope App</a>
          </body>
        </html>
      `);
        }
        if (!database_1.supabase) {
            return res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Server Error</h2>
            <p>Database not available. Please try again later.</p>
          </body>
        </html>
      `);
        }
        const { data: user, error } = await database_1.supabase
            .from('users')
            .select('id, email, email_verified, verification_token_expires')
            .eq('verification_token', token)
            .single();
        if (error || !user) {
            return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Invalid Verification Link</h2>
            <p>This verification link is invalid or has already been used.</p>
            <a href="macroscope://login" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Open MacroScope App</a>
          </body>
        </html>
      `);
        }
        if (new Date() > new Date(user.verification_token_expires)) {
            return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Verification Link Expired</h2>
            <p>This verification link has expired. Please request a new one from the app.</p>
            <a href="macroscope://login" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Open MacroScope App</a>
          </body>
        </html>
      `);
        }
        if (user.email_verified) {
            return res.status(200).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #4caf50;">✅ Already Verified</h2>
            <p>Your email address is already verified. You can now log in to MacroScope.</p>
            <a href="macroscope://login?verified=true&email=${encodeURIComponent(user.email)}" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Open MacroScope App</a>
          </body>
        </html>
      `);
        }
        const { error: updateError } = await database_1.supabase
            .from('users')
            .update({
            email_verified: true,
            verification_token: null,
            verification_token_expires: null
        })
            .eq('id', user.id);
        if (updateError) {
            console.error('Error updating user verification status:', updateError);
            return res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Verification Failed</h2>
            <p>There was an error verifying your email. Please try again.</p>
            <a href="macroscope://login" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Open MacroScope App</a>
          </body>
        </html>
      `);
        }
        res.status(200).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #4caf50;">✅ Email Verified Successfully!</h2>
          <p>Your email address has been verified. You can now log in to MacroScope.</p>
          <a href="macroscope://login?verified=true&email=${encodeURIComponent(user.email)}" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; display: inline-block;">Open MacroScope App</a>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">If the button doesn't work, you can manually open the MacroScope app and log in.</p>
        </body>
      </html>
    `);
    }
    catch (error) {
        console.error('Email verification error:', error);
        res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #d32f2f;">❌ Server Error</h2>
          <p>There was an error processing your verification. Please try again later.</p>
        </body>
      </html>
    `);
    }
});
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: user, error } = await database_1.supabase
            .from('users')
            .select('id, email, email_verified')
            .eq('email', email)
            .single();
        if (error || !user) {
            return res.json({ message: 'If an account with that email exists, a verification email has been sent.' });
        }
        if (user.email_verified) {
            return res.status(400).json({ error: 'Email is already verified' });
        }
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const { error: updateError } = await database_1.supabase
            .from('users')
            .update({
            verification_token: verificationToken,
            verification_token_expires: verificationExpiry.toISOString()
        })
            .eq('id', user.id);
        if (updateError) {
            console.error('Error updating verification token:', updateError);
            return res.status(500).json({ error: 'Failed to generate verification token' });
        }
        try {
            await sendVerificationEmail(email, verificationToken);
            console.log('Verification email resent to:', email);
        }
        catch (emailError) {
            console.error('Failed to resend verification email:', emailError);
            return res.status(500).json({ error: 'Failed to send verification email' });
        }
        res.json({ message: 'Verification email sent successfully!' });
    }
    catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        if (!database_1.supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }
        const { data: user, error } = await database_1.supabase
            .from('users')
            .select('id, email, email_verified')
            .eq('email', email)
            .single();
        if (error || !user) {
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }
        if (!user.email_verified) {
            return res.status(400).json({ error: 'Please verify your email address first before resetting your password.' });
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);
        const { error: updateError } = await database_1.supabase
            .from('users')
            .update({
            password_reset_token: resetToken,
            password_reset_token_expires: resetExpiry.toISOString()
        })
            .eq('id', user.id);
        if (updateError) {
            console.error('Error updating password reset token:', updateError);
            return res.status(500).json({ error: 'Failed to generate password reset token' });
        }
        try {
            await sendPasswordResetEmail(email, resetToken);
            console.log('Password reset email sent to:', email);
        }
        catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            return res.status(500).json({ error: 'Failed to send password reset email' });
        }
        res.json({ message: 'Password reset email sent successfully!' });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/reset-password', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Invalid Reset Link</h2>
            <p>This password reset link is invalid or malformed.</p>
            <a href="macroscope://login" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Open MacroScope App</a>
          </body>
        </html>
      `);
        }
        if (!database_1.supabase) {
            return res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Server Error</h2>
            <p>Database not available. Please try again later.</p>
          </body>
        </html>
      `);
        }
        const { data: user, error } = await database_1.supabase
            .from('users')
            .select('id, email, password_reset_token_expires')
            .eq('password_reset_token', token)
            .single();
        if (error || !user) {
            return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Invalid Reset Link</h2>
            <p>This password reset link is invalid or has already been used.</p>
            <a href="macroscope://login" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Open MacroScope App</a>
          </body>
        </html>
      `);
        }
        if (new Date() > new Date(user.password_reset_token_expires)) {
            return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Reset Link Expired</h2>
            <p>This password reset link has expired. Please request a new one from the app.</p>
            <a href="macroscope://login" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Open MacroScope App</a>
          </body>
        </html>
      `);
        }
        res.status(200).send(`
      <html>
        <head>
          <title>Reset Password - MacroScope</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 50px auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <h2 style="color: #d4c4a0; text-align: center; margin-bottom: 30px;">🔐 Reset Your Password</h2>
            <p style="text-align: center; color: #666; margin-bottom: 30px;">Enter your new password for ${user.email}</p>
            
            <form action="/api/auth/reset-password" method="POST" style="display: flex; flex-direction: column; gap: 20px;">
              <input type="hidden" name="token" value="${token}">
              
              <div>
                <label for="password" style="display: block; margin-bottom: 8px; color: #333; font-weight: bold;">New Password:</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  required 
                  minlength="6"
                  style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 5px; font-size: 16px; box-sizing: border-box;"
                  placeholder="Enter your new password"
                >
              </div>
              
              <div>
                <label for="confirmPassword" style="display: block; margin-bottom: 8px; color: #333; font-weight: bold;">Confirm Password:</label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  required 
                  minlength="6"
                  style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 5px; font-size: 16px; box-sizing: border-box;"
                  placeholder="Confirm your new password"
                >
              </div>
              
              <button 
                type="submit" 
                style="background-color: #d4c4a0; color: #333; padding: 15px; border: none; border-radius: 5px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px;"
                onmouseover="this.style.backgroundColor='#c2b088'"
                onmouseout="this.style.backgroundColor='#d4c4a0'"
              >
                Reset Password
              </button>
            </form>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="macroscope://login" style="color: #d4c4a0; text-decoration: none;">← Back to MacroScope App</a>
            </div>
          </div>
          
          <script>
            document.querySelector('form').addEventListener('submit', function(e) {
              const password = document.getElementById('password').value;
              const confirmPassword = document.getElementById('confirmPassword').value;
              
              if (password !== confirmPassword) {
                e.preventDefault();
                alert('Passwords do not match. Please try again.');
                return false;
              }
              
              if (password.length < 6) {
                e.preventDefault();
                alert('Password must be at least 6 characters long.');
                return false;
              }
            });
          </script>
        </body>
      </html>
    `);
    }
    catch (error) {
        console.error('Password reset form error:', error);
        res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #d32f2f;">❌ Server Error</h2>
          <p>There was an error processing your request. Please try again later.</p>
        </body>
      </html>
    `);
    }
});
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;
        if (!token || !password || !confirmPassword) {
            return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Missing Information</h2>
            <p>All fields are required.</p>
            <a href="javascript:history.back()" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Go Back</a>
          </body>
        </html>
      `);
        }
        if (password !== confirmPassword) {
            return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Passwords Don't Match</h2>
            <p>The passwords you entered do not match. Please try again.</p>
            <a href="javascript:history.back()" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Go Back</a>
          </body>
        </html>
      `);
        }
        if (password.length < 6) {
            return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Password Too Short</h2>
            <p>Password must be at least 6 characters long.</p>
            <a href="javascript:history.back()" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Go Back</a>
          </body>
        </html>
      `);
        }
        if (!database_1.supabase) {
            return res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Server Error</h2>
            <p>Database not available. Please try again later.</p>
          </body>
        </html>
      `);
        }
        const { data: user, error } = await database_1.supabase
            .from('users')
            .select('id, email, password_reset_token_expires')
            .eq('password_reset_token', token)
            .single();
        if (error || !user) {
            return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Invalid Reset Token</h2>
            <p>This password reset link is invalid or has already been used.</p>
            <a href="macroscope://login" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Open MacroScope App</a>
          </body>
        </html>
      `);
        }
        if (new Date() > new Date(user.password_reset_token_expires)) {
            return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Reset Link Expired</h2>
            <p>This password reset link has expired. Please request a new one from the app.</p>
            <a href="macroscope://login" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Open MacroScope App</a>
          </body>
        </html>
      `);
        }
        const saltRounds = 10;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        const { error: updateError } = await database_1.supabase
            .from('users')
            .update({
            password_hash: passwordHash,
            password_reset_token: null,
            password_reset_token_expires: null
        })
            .eq('id', user.id);
        if (updateError) {
            console.error('Error updating password:', updateError);
            return res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Update Failed</h2>
            <p>There was an error updating your password. Please try again.</p>
            <a href="javascript:history.back()" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Go Back</a>
          </body>
        </html>
      `);
        }
        res.status(200).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #4caf50;">✅ Password Reset Successfully!</h2>
          <p>Your password has been updated. You can now log in to MacroScope with your new password.</p>
          <a href="macroscope://login?reset=success&email=${encodeURIComponent(user.email)}" style="background-color: #d4c4a0; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; display: inline-block;">Open MacroScope App</a>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">If the button doesn't work, you can manually open the MacroScope app and log in with your new password.</p>
        </body>
      </html>
    `);
    }
    catch (error) {
        console.error('Password reset error:', error);
        res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #d32f2f;">❌ Server Error</h2>
          <p>There was an error processing your request. Please try again later.</p>
        </body>
      </html>
    `);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map