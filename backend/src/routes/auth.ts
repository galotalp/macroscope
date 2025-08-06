import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../config/database';

// Email service imports
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';

// Email configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'ses';

// Configure AWS SES with better error handling
let sesClient: SESClient | null = null;
if (EMAIL_PROVIDER === 'ses' && process.env.AWS_ACCESS_KEY_ID) {
  try {
    sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      maxAttempts: 3,
    });
    console.log('AWS SES client configured for region:', process.env.AWS_REGION || 'us-east-1');
  } catch (error) {
    console.error('Failed to configure AWS SES client:', error);
  }
}

const router = express.Router();

// Email sending function
async function sendVerificationEmail(email: string, verificationToken: string) {
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
    const command = new SendEmailCommand({
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
    } catch (error) {
      console.error('AWS SES error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  } else {
    throw new Error('Email service not configured or unavailable');
  }
}

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Auth router is working!' });
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Insert user into database with email_verified = false
    const { data, error } = await supabase
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

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
      console.log('Verification email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email sending fails - user can request resend
    }

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      email: email
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('SUPABASE AUTH ROUTE: Login request received');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, password_hash, email_verified')
      .eq('email', email)
      .single();

    if (error || !user) {
      console.log('User not found or database error');
      return res.status(401).json({ error: 'Username or password not recognized' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      console.log('Password is invalid');
      return res.status(401).json({ error: 'Username or password not recognized' });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({ 
        error: 'Please verify your email address before logging in',
        requiresVerification: true,
        email: user.email
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email endpoint
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

    if (!supabase) {
      return res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #d32f2f;">❌ Server Error</h2>
            <p>Database not available. Please try again later.</p>
          </body>
        </html>
      `);
    }

    // Find user with this verification token
    const { data: user, error } = await supabase
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

    // Check if token has expired
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

    // Check if already verified
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

    // Mark email as verified and clear verification token
    const { error: updateError } = await supabase
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

    // Success response
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
  } catch (error) {
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

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('email', email)
      .single();

    if (error || !user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: 'If an account with that email exists, a verification email has been sent.' });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    const { error: updateError } = await supabase
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

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
      console.log('Verification email resent to:', email);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({ message: 'Verification email sent successfully!' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
