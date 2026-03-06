import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3';

// Supremo Barber Management System - Backend API
// Updated: 2024-12-14 - Added email notifications for appointments
const app = new Hono();

// CORS configuration
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'apikey'],
}));

// Logger
app.use('*', logger(console.log));

// Supabase client - ALWAYS use service role key to bypass RLS
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// Create admin client that bypasses RLS
function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Create anon client for auth operations (login, etc.)
function getAnonClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Helper function to normalize role format (convert underscores to dashes for consistency)
function normalizeRole(role: string): string {
  if (!role) return role;
  // Convert super_admin to super-admin, etc.
  return role.replace(/_/g, '-');
}

// Helper function to convert camelCase to snake_case
function toSnakeCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  }

  const snakeCaseObj: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeCaseObj[snakeKey] = toSnakeCase(obj[key]);
    }
  }
  return snakeCaseObj;
}

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  const camelCaseObj: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelCaseObj[camelKey] = toCamelCase(obj[key]);
    }
  }
  return camelCaseObj;
}

// ==================== EMAIL NOTIFICATION FUNCTIONS ====================

/**
 * Send email using Gmail SMTP (500 emails/day FREE)
 * 
 * Required Supabase Edge Function Secrets:
 * - SMTP_HOST: smtp.gmail.com
 * - SMTP_PORT: 587
 * - SMTP_USER: your-gmail@gmail.com
 * - SMTP_PASS: your-16-char-app-password (from Gmail settings)
 * - SMTP_FROM: Supremo Barber <your-gmail@gmail.com>
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const smtpFrom = Deno.env.get('SMTP_FROM') || `Supremo Barber <${smtpUser}>`;

    // Validate configuration
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('⚠️ SMTP not configured - email not sent');
      console.warn('Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
      console.warn('Optional: SMTP_PORT (default 587), SMTP_FROM');
      return false;
    }

    console.log(`📧 Sending email to ${to} via ${smtpHost}:${smtpPort}`);

    // Create email message
    const message = createEmailMessage(smtpFrom, to, subject, html);

    // Send via SMTP
    const success = await sendSMTP(
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      to,
      message
    );

    if (success) {
      console.log('✅ Email sent successfully to:', to);
      return true;
    } else {
      console.error('❌ Email send failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Email send error:', error);
    return false;
  }
}

/**
 * Create RFC 5322 compliant email message
 */
function createEmailMessage(from: string, to: string, subject: string, html: string): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const date = new Date().toUTCString();

  // Strip HTML for plain text version
  const plainText = html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    plainText,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    html,
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  return message;
}

/**
 * Extract email address from "Name <email@domain.com>" format
 */
function extractEmail(address: string): string {
  const match = address.match(/<(.+?)>/);
  return match ? match[1] : address;
}

/**
 * Send email via SMTP with STARTTLS
 */
async function sendSMTP(
  host: string,
  port: number,
  user: string,
  pass: string,
  from: string,
  to: string,
  message: string
): Promise<boolean> {
  let conn: Deno.Conn | Deno.TlsConn | null = null;

  try {
    // Connect to SMTP server
    const plainConn = await Deno.connect({ hostname: host, port });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper to read response
    const readResponse = async (connection: Deno.Conn | Deno.TlsConn): Promise<string> => {
      const buffer = new Uint8Array(4096);
      const n = await connection.read(buffer);
      const response = decoder.decode(buffer.subarray(0, n || 0));
      console.log('SMTP <<', response.trim().substring(0, 100));
      return response;
    };

    // Helper to send command
    const sendCommand = async (connection: Deno.Conn | Deno.TlsConn, command: string): Promise<string> => {
      console.log('SMTP >>', command.trim());
      await connection.write(encoder.encode(command + '\r\n'));
      return await readResponse(connection);
    };

    // Read server greeting (220)
    await readResponse(plainConn);

    // Send EHLO
    const ehloResp = await sendCommand(plainConn, `EHLO ${host}`);

    // Start TLS
    await sendCommand(plainConn, 'STARTTLS');

    // Upgrade connection to TLS
    conn = await Deno.startTls(plainConn, { hostname: host });
    console.log('🔒 TLS connection established');

    // Send EHLO again over TLS
    await sendCommand(conn, `EHLO ${host}`);

    // Authenticate
    await sendCommand(conn, 'AUTH LOGIN');
    await sendCommand(conn, btoa(user));
    const authResp = await sendCommand(conn, btoa(pass));

    if (!authResp.startsWith('235')) {
      console.error('❌ SMTP authentication failed');
      return false;
    }
    console.log('✅ SMTP authenticated');

    // Send email
    await sendCommand(conn, `MAIL FROM:<${extractEmail(from)}>`);
    await sendCommand(conn, `RCPT TO:<${to}>`);
    await sendCommand(conn, 'DATA');

    // Send message body
    await conn.write(encoder.encode(message + '\r\n.\r\n'));
    const dataResp = await readResponse(conn);

    if (!dataResp.startsWith('250')) {
      console.error('❌ SMTP message send failed');
      return false;
    }

    await sendCommand(conn, 'QUIT');

    return true;
  } catch (error) {
    console.error('❌ SMTP connection error:', error);
    return false;
  } finally {
    if (conn) {
      try {
        conn.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
}

/**
 * Send appointment approval email
 */
async function sendAppointmentApprovalEmail(appointment: any): Promise<boolean> {
  const subject = '✅ Your Appointment at Supremo Barber is Approved!';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #DB9D47 0%, #C56E33 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Supremo Barber</h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Stay Sharp. Look Supreme.</p>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #2d3748; font-size: 24px;">Appointment Approved! 🎉</h2>
                  
                  <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                    Dear <strong>${appointment.customer_name}</strong>,
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                    Great news! Your appointment has been approved. We're looking forward to seeing you!
                  </p>
                  
                  <!-- Appointment Details Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; border-radius: 8px; border: 2px solid #DB9D47;">
                    <tr>
                      <td style="padding: 25px;">
                        <h3 style="margin: 0 0 15px 0; color: #2d3748; font-size: 18px;">Appointment Details</h3>
                        
                        <table width="100%" cellpadding="8" cellspacing="0">
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 8px 0;"><strong>📅 Date:</strong></td>
                            <td style="color: #2d3748; font-size: 14px; text-align: right; padding: 8px 0;">${new Date(appointment.appointment_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                          </tr>
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 8px 0;"><strong>⏰ Time:</strong></td>
                            <td style="color: #2d3748; font-size: 14px; text-align: right; padding: 8px 0;">${appointment.appointment_time}</td>
                          </tr>
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 8px 0;"><strong>✂️ Service:</strong></td>
                            <td style="color: #2d3748; font-size: 14px; text-align: right; padding: 8px 0;">${appointment.service_name}</td>
                          </tr>
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 8px 0;"><strong>👤 Barber:</strong></td>
                            <td style="color: #2d3748; font-size: 14px; text-align: right; padding: 8px 0;">${appointment.barber_name}</td>
                          </tr>
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 8px 0;"><strong>⏱️ Duration:</strong></td>
                            <td style="color: #2d3748; font-size: 14px; text-align: right; padding: 8px 0;">${appointment.service_duration} minutes</td>
                          </tr>
                          <tr style="border-top: 2px solid #e2e8f0;">
                            <td style="color: #718096; font-size: 14px; padding: 12px 0 8px 0;"><strong>💰 Total Amount:</strong></td>
                            <td style="color: #DB9D47; font-size: 18px; font-weight: bold; text-align: right; padding: 12px 0 8px 0;">₱${appointment.total_amount.toFixed(2)}</td>
                          </tr>
                          ${appointment.down_payment > 0 ? `
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 4px 0;">Down Payment:</td>
                            <td style="color: #48bb78; font-size: 14px; text-align: right; padding: 4px 0;">₱${appointment.down_payment.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 4px 0;">Remaining:</td>
                            <td style="color: #f56565; font-size: 14px; text-align: right; padding: 4px 0;">₱${appointment.remaining_amount.toFixed(2)}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Important Notes -->
                  <div style="margin-top: 30px; padding: 20px; background-color: #fffbeb; border-left: 4px solid #DB9D47; border-radius: 4px;">
                    <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">📌 Important Reminders</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                      <li>Please arrive 5-10 minutes before your scheduled time</li>
                      <li>Bring a valid ID for verification</li>
                      ${appointment.remaining_amount > 0 ? '<li>Remaining balance to be paid at the shop</li>' : ''}
                      <li>Contact us if you need to reschedule or cancel</li>
                    </ul>
                  </div>
                  
                  <!-- Location Info -->
                  <div style="margin-top: 25px; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #4a5568; font-size: 14px;">
                      <strong>📍 Location:</strong><br>
                      Supremo Barber Lagro, Quezon City
                    </p>
                    <p style="margin: 0; color: #4a5568; font-size: 14px;">
                      <strong>📞 Contact:</strong> 0923-456-7890<br>
                      <strong>✉️ Email:</strong> info@supremobarber.com
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #2d3748; padding: 25px 30px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #a0aec0; font-size: 13px;">
                    Thank you for choosing Supremo Barber!
                  </p>
                  <p style="margin: 0; color: #718096; font-size: 12px;">
                    This is an automated message. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return await sendEmail(appointment.customer_email, subject, html);
}

/**
 * Send appointment reminder email (24 hours before)
 */
async function sendAppointmentReminderEmail(appointment: any): Promise<boolean> {
  const subject = '⏰ Reminder: Your Appointment at Supremo Barber is Tomorrow!';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Supremo Barber</h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">⏰ Appointment Reminder</p>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #2d3748; font-size: 24px;">Your Appointment is Tomorrow! ⏰</h2>
                  
                  <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                    Hi <strong>${appointment.customer_name}</strong>,
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                    This is a friendly reminder about your upcoming appointment at Supremo Barber. We're excited to see you!
                  </p>
                  
                  <!-- Appointment Details Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ebf8ff; border-radius: 8px; border: 2px solid #4299e1;">
                    <tr>
                      <td style="padding: 25px;">
                        <h3 style="margin: 0 0 15px 0; color: #2d3748; font-size: 18px;">Appointment Details</h3>
                        
                        <table width="100%" cellpadding="8" cellspacing="0">
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 8px 0;"><strong>📅 Date:</strong></td>
                            <td style="color: #2d3748; font-size: 14px; text-align: right; padding: 8px 0;">${new Date(appointment.appointment_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                          </tr>
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 8px 0;"><strong>⏰ Time:</strong></td>
                            <td style="color: #2d3748; font-size: 14px; text-align: right; padding: 8px 0;">${appointment.appointment_time}</td>
                          </tr>
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 8px 0;"><strong>✂️ Service:</strong></td>
                            <td style="color: #2d3748; font-size: 14px; text-align: right; padding: 8px 0;">${appointment.service_name}</td>
                          </tr>
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 8px 0;"><strong>👤 Barber:</strong></td>
                            <td style="color: #2d3748; font-size: 14px; text-align: right; padding: 8px 0;">${appointment.barber_name}</td>
                          </tr>
                          <tr>
                            <td style="color: #718096; font-size: 14px; padding: 8px 0;"><strong>⏱️ Duration:</strong></td>
                            <td style="color: #2d3748; font-size: 14px; text-align: right; padding: 8px 0;">${appointment.service_duration} minutes</td>
                          </tr>
                          ${appointment.remaining_amount > 0 ? `
                          <tr style="border-top: 2px solid #bee3f8;">
                            <td style="color: #718096; font-size: 14px; padding: 12px 0 8px 0;"><strong>💰 Amount to Pay:</strong></td>
                            <td style="color: #f56565; font-size: 18px; font-weight: bold; text-align: right; padding: 12px 0 8px 0;">₱${appointment.remaining_amount.toFixed(2)}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Call to Action -->
                  <div style="margin-top: 30px; text-align: center;">
                    <a href="tel:0923-456-7890" style="display: inline-block; padding: 14px 32px; background-color: #4299e1; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      📞 Call to Confirm
                    </a>
                  </div>
                  
                  <!-- Important Notes -->
                  <div style="margin-top: 25px; padding: 20px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
                    <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">📌 Important Reminders</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                      <li>Please arrive 5-10 minutes early</li>
                      <li>Bring a valid ID for verification</li>
                      ${appointment.remaining_amount > 0 ? '<li>Remaining balance to be paid at the shop</li>' : ''}
                      <li>Need to cancel? Please call us ASAP</li>
                    </ul>
                  </div>
                  
                  <!-- Location Info -->
                  <div style="margin-top: 25px; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #4a5568; font-size: 14px;">
                      <strong>📍 Location:</strong><br>
                      Supremo Barber Lagro, Quezon City
                    </p>
                    <p style="margin: 0; color: #4a5568; font-size: 14px;">
                      <strong>📞 Contact:</strong> 0923-456-7890<br>
                      <strong>✉️ Email:</strong> info@supremobarber.com
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #2d3748; padding: 25px 30px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #a0aec0; font-size: 13px;">
                    See you tomorrow at Supremo Barber!
                  </p>
                  <p style="margin: 0; color: #718096; font-size: 12px;">
                    This is an automated reminder. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return await sendEmail(appointment.customer_email, subject, html);
}

// Health check
app.get('/make-server-70e1fc66/health', (c) => {
  return c.json({ success: true, message: 'Server is running' });
});

// ==================== AUTHENTICATION ====================

app.post('/make-server-70e1fc66/api/auth/register', async (c) => {
  try {
    const { email, password, name, phone, role: requestedRole } = await c.req.json();
    console.log('📝 Registration attempt:', { email, name, role: requestedRole || 'auto' });

    const supabase = getAdminClient();

    // First, check if email already exists in our users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      console.log('❌ Registration attempt with existing email in database:', email);
      return c.json({
        success: false,
        error: 'A user with this email address has already been registered. Please login instead.',
        code: 'email_exists'
      }, 422);
    }

    // Also check if user exists in Supabase Auth (they might have auth but no profile)
    const { data: authUsers, error: authCheckError } = await supabase.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users?.find(u => u.email === email);

    if (existingAuthUser) {
      console.log('⚠️ User exists in auth but not in database. Checking if we can create profile...');

      // Check if they already have a profile (edge case)
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', existingAuthUser.id)
        .maybeSingle();

      if (profile) {
        console.log('❌ User has both auth and profile. Email exists.');
        return c.json({
          success: false,
          error: 'A user with this email address has already been registered. Please login instead.',
          code: 'email_exists'
        }, 422);
      }

      // User has auth but no profile - create the profile
      console.log('🔧 Creating missing profile for existing auth user:', existingAuthUser.id);

      // Determine role
      const { data: allUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      const isFirstUser = !allUsers || allUsers.length === 0;
      const userRole = requestedRole || (isFirstUser ? 'admin' : 'customer');

      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: existingAuthUser.id,
          email,
          name,
          phone: phone || null,
          role: userRole
        });

      if (profileError) {
        console.error('❌ Failed to create profile for existing auth user:', profileError);
        return c.json({
          success: false,
          error: 'Failed to create user profile. Please contact support.',
        }, 400);
      }

      // Sign in to get token
      console.log('🔑 Signing in existing user...');
      const anonClient = getAnonClient();
      const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({
        email,
        password,
      });

      if (sessionError) {
        console.error('❌ Could not sign in. Password might be incorrect.');
        return c.json({
          success: false,
          error: 'Account exists but password verification failed. Please try logging in or reset your password.',
        }, 400);
      }

      const user = {
        id: existingAuthUser.id,
        email,
        name,
        phone: phone || '',
        role: userRole
      };

      console.log('✅ Profile created for existing auth user');
      return c.json({
        success: true,
        data: {
          user,
          token: sessionData.session.access_token,
        }
      });
    }

    // Determine user role for brand new user
    let userRole: string;
    if (requestedRole) {
      userRole = requestedRole;
      console.log('👤 Using requested role:', userRole);
    } else {
      const { data: existingUsers, error: countError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      const isFirstUser = !countError && (existingUsers === null || existingUsers.length === 0);
      userRole = isFirstUser ? 'admin' : 'customer';
      console.log('👤 Auto-assigned role:', userRole, isFirstUser ? '(first user)' : '');
    }

    // Create user in auth
    console.log('🔐 Creating auth user with admin.createUser()...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone }
    });

    if (authError) {
      console.error('❌ Auth error during registration:', authError);
      // Handle specific error for email already exists
      if (authError.message.includes('already been registered') ||
        authError.message.includes('already exists') ||
        authError.status === 422 ||
        authError.code === 'user_already_exists' ||
        authError.code === 'email_exists') {
        return c.json({
          success: false,
          error: 'A user with this email address has already been registered. Please login instead.',
          code: 'email_exists'
        }, 422);
      }
      return c.json({ success: false, error: authError.message }, 400);
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Create user profile
    console.log('💾 Creating user profile in database...');
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        phone: phone || null,
        role: userRole
      });

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      return c.json({ success: false, error: 'Failed to create user profile: ' + profileError.message }, 400);
    }

    console.log('✅ User profile created successfully');

    // Sign in to get token using anon client
    console.log('🔑 Attempting to sign in to get token...');
    const anonClient = getAnonClient();
    const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError) {
      console.error('❌ Session creation error:', sessionError);
      console.error('⚠️ User was created but auto-login failed. User can still log in manually.');
      return c.json({ success: false, error: sessionError.message }, 400);
    }

    console.log('✅ Session created successfully');

    const user = {
      id: authData.user.id,
      email,
      name,
      phone: phone || '',
      role: userRole
    };

    console.log(userRole === 'admin' ? '👑 First user registered as ADMIN' :
      userRole === 'barber' ? '💈 Barber registered successfully' :
        '👤 Customer registered successfully');

    return c.json({
      success: true,
      data: {
        user,
        token: sessionData.session.access_token,
      }
    });
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    // Handle AuthApiError specifically
    if (error.code === 'email_exists' ||
      error.code === 'user_already_exists' ||
      error.message?.includes('already been registered') ||
      error.message?.includes('already exists')) {
      return c.json({
        success: false,
        error: 'A user with this email address has already been registered. Please login instead.',
        code: 'email_exists'
      }, 422);
    }
    return c.json({ success: false, error: error.message || 'Registration failed' }, 500);
  }
});

app.post('/make-server-70e1fc66/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    console.log('🔐 Login attempt for email:', email);

    const supabase = getAnonClient();

    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError) {
      console.error('❌ Login error:', sessionError);
      console.error('Error code:', sessionError.code);
      console.error('Error status:', sessionError.status);

      // Check if user exists in our database
      const adminClient = getAdminClient();
      const { data: userExists } = await adminClient
        .from('users')
        .select('id, email, role')
        .eq('email', email)
        .maybeSingle();

      if (userExists) {
        console.log('✅ User exists in database:', userExists);
        console.log('⚠️ But authentication failed - password might be incorrect or auth user might not exist');

        // Provide helpful error message
        return c.json({
          success: false,
          error: 'Invalid email or password. If you were added as a customer/barber by an admin, your default password is "customer123" or "barber123". Please try that or contact an administrator.',
          code: 'invalid_credentials'
        }, 401);
      } else {
        console.log('❌ User does not exist in database');
        return c.json({
          success: false,
          error: 'No account found with this email address. Please register first.',
          code: 'user_not_found'
        }, 401);
      }
    }

    console.log('✅ Authentication successful for user:', sessionData.user.id);

    // Get user profile using admin client for reliable access
    const adminClient = getAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', sessionData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      return c.json({ success: false, error: 'Failed to fetch user profile' }, 400);
    }

    console.log('✅ Profile fetched successfully:', profile.email, 'Role:', profile.role);

    const user = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone || '',
      role: profile.role
    };

    return c.json({
      success: true,
      data: {
        user,
        token: sessionData.session.access_token,
      }
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    return c.json({ success: false, error: error.message || 'Login failed' }, 500);
  }
});

app.post('/make-server-70e1fc66/api/auth/check-email', async (c) => {
  try {
    const { email } = await c.req.json();
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    return c.json({
      success: true,
      data: { exists: !!data }
    });
  } catch (error: any) {
    console.error('Check email error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Password verification endpoint for admin actions
app.post('/make-server-70e1fc66/api/auth/verify-password', async (c) => {
  try {
    const { password } = await c.req.json();
    console.log('🔐 Password verification request');

    // Get the user's token from the Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No authorization token provided');
      return c.json({
        success: false,
        error: 'Unauthorized - no token provided'
      }, 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the user's token and get their email
    const supabase = getAnonClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ Invalid token:', userError);
      return c.json({
        success: false,
        error: 'Invalid or expired token'
      }, 401);
    }

    console.log('👤 Verifying password for user:', user.email);

    // Try to sign in with the provided password to verify it
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      console.error('❌ Password verification failed:', signInError.message);
      return c.json({
        success: false,
        error: 'Incorrect password',
        verified: false
      }, 200); // Return 200 with verified: false instead of error status
    }

    console.log('✅ Password verified successfully');
    return c.json({
      success: true,
      verified: true
    });
  } catch (error: any) {
    console.error('❌ Password verification error:', error);
    return c.json({
      success: false,
      error: error.message || 'Password verification failed'
    }, 500);
  }
});

// ==================== USERS ====================

app.get('/make-server-70e1fc66/api/users', async (c) => {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const users = data.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone || '',
      role: u.role
    }));

    return c.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Get users error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/make-server-70e1fc66/api/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    const user = {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone || '',
      role: data.role
    };

    return c.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Get user error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/make-server-70e1fc66/api/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const supabase = getAdminClient();

    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.avatarUrl !== undefined) updateData.avatarUrl = updates.avatarUrl;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.email !== undefined) updateData.email = updates.email;
    // Remove loyaltyPoints mapping

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const user = {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone || '',
      role: data.role,
      isActive: data.is_active ?? true,
      avatarUrl: data.avatarUrl || null,
      bio: data.bio || null
    };

    return c.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Update user error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete('/make-server-70e1fc66/api/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({ success: true, data: { message: 'User deleted successfully' } });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Change Password endpoint
app.post('/make-server-70e1fc66/api/users/:id/change-password', async (c) => {
  try {
    const id = c.req.param('id');
    const { currentPassword, newPassword } = await c.req.json();
    const supabase = getAdminClient();

    console.log('🔐 Password change request for user:', id);

    // First, get the user to verify current password
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('password')
      .eq('id', id)
      .single();

    if (userError || !userData) {
      console.error('❌ User not found:', userError);
      throw new Error('User not found');
    }

    // Verify current password matches
    if (userData.password !== currentPassword) {
      console.error('❌ Current password is incorrect');
      return c.json({
        success: false,
        error: 'Current password is incorrect'
      }, 401);
    }

    // Update to new password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', id);

    if (updateError) {
      console.error('❌ Failed to update password:', updateError);
      throw updateError;
    }

    console.log('✅ Password changed successfully for user:', id);

    return c.json({
      success: true,
      data: { message: 'Password changed successfully' }
    });
  } catch (error: any) {
    console.error('❌ Change password error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to change password'
    }, 500);
  }
});

// ==================== BARBERS ====================

app.get('/make-server-70e1fc66/api/barbers', async (c) => {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('barbers')
      .select(`
        *,
        users:user_id (
          id,
          email,
          name,
          phone,
          "avatarUrl",
          bio
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const barbers = data.map((b: any) => ({
      id: b.id,
      user_id: b.user_id,
      name: b.users?.name || 'Unknown',
      email: b.users?.email || '',
      phone: b.users?.phone || '',
      avatarUrl: b.users?.avatarUrl || '',
      bio: b.users?.bio || '',
      specialties: b.specialties || [],
      rating: parseFloat(b.rating) || 5.0,
      available_hours: b.available_hours || {},
    }));

    return c.json({ success: true, data: barbers });
  } catch (error: any) {
    console.error('Get barbers error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// IMPORTANT: More specific routes must come before generic routes
app.get('/make-server-70e1fc66/api/barbers/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('barbers')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email,
          phone,
          role,
          "avatarUrl",
          bio
        )
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return c.json({ success: false, error: 'Barber not found' }, 404);
    }

    const barber = {
      id: data.id,
      user_id: data.user_id,
      specialties: data.specialties || [],
      rating: parseFloat(data.rating || 0),
      is_active: data.is_active !== undefined ? data.is_active : true,
      available_hours: data.available_hours || {},
      created_at: data.created_at,
      user_name: data.users?.name || '',
      user_email: data.users?.email || '',
      user_phone: data.users?.phone || '',
      avatarUrl: data.users?.avatarUrl || '',
      bio: data.users?.bio || '',
    };

    return c.json({ success: true, data: barber });
  } catch (error: any) {
    console.error('Get barber by user_id error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/make-server-70e1fc66/api/barbers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('barbers')
      .select(`
        *,
        users:user_id (
          id,
          email,
          name,
          phone,
          "avatarUrl",
          bio
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const barber = {
      id: data.id,
      user_id: data.user_id,
      name: data.users?.name || 'Unknown',
      email: data.users?.email || '',
      phone: data.users?.phone || '',
      avatarUrl: data.users?.avatarUrl || '',
      bio: data.users?.bio || '',
      specialties: data.specialties || [],
      rating: parseFloat(data.rating) || 5.0,
      available_hours: data.available_hours || {},
    };

    return c.json({ success: true, data: barber });
  } catch (error: any) {
    console.error('Get barber error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/make-server-70e1fc66/api/barbers', async (c) => {
  try {
    const barberData = await c.req.json();
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('barbers')
      .insert({
        user_id: barberData.user_id,
        specialties: barberData.specialties || [],
        rating: barberData.rating || 5.0,
        available_hours: barberData.available_hours || {},
      })
      .select(`
        *,
        users:user_id (
          id,
          email,
          name,
          phone
        )
      `)
      .single();

    if (error) throw error;

    const barber = {
      id: data.id,
      user_id: data.user_id,
      name: data.users?.name || 'Unknown',
      email: data.users?.email || '',
      phone: data.users?.phone || '',
      specialties: data.specialties || [],
      rating: parseFloat(data.rating) || 5.0,
      available_hours: data.available_hours || {},
    };

    return c.json({ success: true, data: barber });
  } catch (error: any) {
    console.error('Create barber error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/make-server-70e1fc66/api/barbers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const supabase = getAdminClient();

    const updateData: any = {};
    if (updates.specialties !== undefined) updateData.specialties = updates.specialties;
    if (updates.rating !== undefined) updateData.rating = updates.rating;
    if (updates.available_hours !== undefined) updateData.available_hours = updates.available_hours;

    const { data, error } = await supabase
      .from('barbers')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        users:user_id (
          id,
          email,
          name,
          phone
        )
      `)
      .single();

    if (error) throw error;

    const barber = {
      id: data.id,
      user_id: data.user_id,
      name: data.users?.name || 'Unknown',
      email: data.users?.email || '',
      phone: data.users?.phone || '',
      specialties: data.specialties || [],
      rating: parseFloat(data.rating) || 5.0,
      available_hours: data.available_hours || {},
    };

    return c.json({ success: true, data: barber });
  } catch (error: any) {
    console.error('Update barber error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete('/make-server-70e1fc66/api/barbers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('barbers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({ success: true, data: { message: 'Barber deleted successfully' } });
  } catch (error: any) {
    console.error('Delete barber error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/make-server-70e1fc66/api/barbers/:id/earnings', async (c) => {
  try {
    const id = c.req.param('id');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const supabase = getAdminClient();

    // Build query for completed appointments
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('barber_id', id)
      .eq('status', 'completed');

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('appointment_date', startDate);
    }
    if (endDate) {
      query = query.lte('appointment_date', endDate);
    }

    const { data: appointments, error } = await query;

    if (error) throw error;

    // Calculate earnings
    const totalEarnings = appointments?.reduce((sum, apt) => sum + (apt.total_amount || 0), 0) || 0;
    const totalAppointments = appointments?.length || 0;
    const averageEarningPerAppointment = totalAppointments > 0 ? totalEarnings / totalAppointments : 0;

    // Group by date
    const earningsByDate = appointments?.reduce((acc: any, apt: any) => {
      const date = apt.appointment_date;
      if (!acc[date]) {
        acc[date] = { date, amount: 0, count: 0 };
      }
      acc[date].amount += apt.total_amount || 0;
      acc[date].count += 1;
      return acc;
    }, {}) || {};

    return c.json({
      success: true,
      data: {
        totalEarnings,
        totalAppointments,
        averageEarningPerAppointment,
        earningsByDate: Object.values(earningsByDate),
      }
    });
  } catch (error: any) {
    console.error('Get barber earnings error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== SERVICES ====================

app.get('/make-server-70e1fc66/api/services', async (c) => {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert snake_case to camelCase for frontend
    const camelCaseData = toCamelCase(data);

    return c.json({ success: true, data: camelCaseData });
  } catch (error: any) {
    console.error('Get services error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/make-server-70e1fc66/api/services/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Convert snake_case to camelCase for frontend
    const camelCaseData = toCamelCase(data);

    return c.json({ success: true, data: camelCaseData });
  } catch (error: any) {
    console.error('Get service error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/make-server-70e1fc66/api/services', async (c) => {
  try {
    const serviceData = await c.req.json();
    const supabase = getAdminClient();

    // Convert camelCase to snake_case for database
    const snakeCaseData = toSnakeCase(serviceData);

    const { data, error } = await supabase
      .from('services')
      .insert(snakeCaseData)
      .select()
      .single();

    if (error) throw error;

    // Convert snake_case back to camelCase for frontend
    const camelCaseData = toCamelCase(data);

    return c.json({ success: true, data: camelCaseData });
  } catch (error: any) {
    console.error('Create service error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/make-server-70e1fc66/api/services/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const supabase = getAdminClient();

    // Convert camelCase to snake_case for database
    const snakeCaseUpdates = toSnakeCase(updates);

    const { data, error } = await supabase
      .from('services')
      .update(snakeCaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Convert snake_case back to camelCase for frontend
    const camelCaseData = toCamelCase(data);

    return c.json({ success: true, data: camelCaseData });
  } catch (error: any) {
    console.error('Update service error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete('/make-server-70e1fc66/api/services/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({ success: true, data: { message: 'Service deleted successfully' } });
  } catch (error: any) {
    console.error('Delete service error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== APPOINTMENTS ====================

app.get('/make-server-70e1fc66/api/appointments', async (c) => {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          email,
          phone
        ),
        barber:barber_id (
          id,
          users:user_id (
            name
          )
        ),
        service:service_id (
          id,
          name,
          price,
          duration
        )
      `)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) throw error;

    const appointments = data.map((a: any) => ({
      id: a.id,
      customer_id: a.customer_id,
      customer_name: a.customer?.name || 'Unknown',
      customer_email: a.customer?.email || '',
      customer_phone: a.customer?.phone || '',
      barber_id: a.barber_id,
      barber_name: a.barber?.users?.name || 'Unknown',
      service_id: a.service_id,
      service_name: a.service?.name || 'Unknown',
      service_price: parseFloat(a.service?.price || 0),
      service_duration: a.service?.duration || 0,
      appointment_date: a.date,
      appointment_time: a.time,
      status: a.status,
      payment_status: a.payment_status || 'pending',
      total_amount: parseFloat(a.total_amount || 0),
      down_payment: parseFloat(a.down_payment || 0),
      remaining_amount: parseFloat(a.remaining_amount || 0),
      notes: a.notes || '',
      created_at: a.created_at,
    }));

    return c.json({ success: true, data: appointments });
  } catch (error: any) {
    console.error('Get appointments error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/make-server-70e1fc66/api/appointments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          email,
          phone
        ),
        barber:barber_id (
          id,
          users:user_id (
            name
          )
        ),
        service:service_id (
          id,
          name,
          price,
          duration
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const appointment = {
      id: data.id,
      customer_id: data.customer_id,
      customer_name: data.customer?.name || 'Unknown',
      customer_email: data.customer?.email || '',
      customer_phone: data.customer?.phone || '',
      barber_id: data.barber_id,
      barber_name: data.barber?.users?.name || 'Unknown',
      service_id: data.service_id,
      service_name: data.service?.name || 'Unknown',
      service_price: parseFloat(data.service?.price || 0),
      service_duration: data.service?.duration || 0,
      appointment_date: data.date,
      appointment_time: data.time,
      status: data.status,
      payment_status: data.payment_status || 'pending',
      total_amount: parseFloat(data.total_amount || 0),
      down_payment: parseFloat(data.down_payment || 0),
      remaining_amount: parseFloat(data.remaining_amount || 0),
      notes: data.notes || '',
      created_at: data.created_at,
    };

    return c.json({ success: true, data: appointment });
  } catch (error: any) {
    console.error('Get appointment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/make-server-70e1fc66/api/appointments/customer/:customerId', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          email,
          phone
        ),
        barber:barber_id (
          id,
          users:user_id (
            name
          )
        ),
        service:service_id (
          id,
          name,
          price,
          duration
        )
      `)
      .eq('customer_id', customerId)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) throw error;

    const appointments = data.map((a: any) => ({
      id: a.id,
      customer_id: a.customer_id,
      customer_name: a.customer?.name || 'Unknown',
      customer_email: a.customer?.email || '',
      customer_phone: a.customer?.phone || '',
      barber_id: a.barber_id,
      barber_name: a.barber?.users?.name || 'Unknown',
      service_id: a.service_id,
      service_name: a.service?.name || 'Unknown',
      service_price: parseFloat(a.service?.price || 0),
      service_duration: a.service?.duration || 0,
      appointment_date: a.date,
      appointment_time: a.time,
      status: a.status,
      payment_status: a.payment_status || 'pending',
      total_amount: parseFloat(a.total_amount || 0),
      down_payment: parseFloat(a.down_payment || 0),
      remaining_amount: parseFloat(a.remaining_amount || 0),
      notes: a.notes || '',
      created_at: a.created_at,
    }));

    return c.json({ success: true, data: appointments });
  } catch (error: any) {
    console.error('Get customer appointments error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/make-server-70e1fc66/api/appointments/barber/:barberId', async (c) => {
  try {
    const barberId = c.req.param('barberId');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          email,
          phone
        ),
        barber:barber_id (
          id,
          users:user_id (
            name
          )
        ),
        service:service_id (
          id,
          name,
          price,
          duration
        )
      `)
      .eq('barber_id', barberId)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) throw error;

    const appointments = data.map((a: any) => ({
      id: a.id,
      customer_id: a.customer_id,
      customer_name: a.customer?.name || 'Unknown',
      customer_email: a.customer?.email || '',
      customer_phone: a.customer?.phone || '',
      barber_id: a.barber_id,
      barber_name: a.barber?.users?.name || 'Unknown',
      service_id: a.service_id,
      service_name: a.service?.name || 'Unknown',
      service_price: parseFloat(a.service?.price || 0),
      service_duration: a.service?.duration || 0,
      appointment_date: a.date,
      appointment_time: a.time,
      status: a.status,
      payment_status: a.payment_status || 'pending',
      total_amount: parseFloat(a.total_amount || 0),
      down_payment: parseFloat(a.down_payment || 0),
      remaining_amount: parseFloat(a.remaining_amount || 0),
      notes: a.notes || '',
      created_at: a.created_at,
    }));

    return c.json({ success: true, data: appointments });
  } catch (error: any) {
    console.error('Get barber appointments error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/make-server-70e1fc66/api/appointments/date/:date', async (c) => {
  try {
    const date = c.req.param('date');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          email,
          phone
        ),
        barber:barber_id (
          id,
          users:user_id (
            name
          )
        ),
        service:service_id (
          id,
          name,
          price,
          duration
        )
      `)
      .eq('date', date)
      .order('time', { ascending: true });

    if (error) throw error;

    const appointments = data.map((a: any) => ({
      id: a.id,
      customer_id: a.customer_id,
      customer_name: a.customer?.name || 'Unknown',
      customer_email: a.customer?.email || '',
      customer_phone: a.customer?.phone || '',
      barber_id: a.barber_id,
      barber_name: a.barber?.users?.name || 'Unknown',
      service_id: a.service_id,
      service_name: a.service?.name || 'Unknown',
      service_price: parseFloat(a.service?.price || 0),
      service_duration: a.service?.duration || 0,
      appointment_date: a.date,
      appointment_time: a.time,
      status: a.status,
      payment_status: a.payment_status || 'pending',
      total_amount: parseFloat(a.total_amount || 0),
      down_payment: parseFloat(a.down_payment || 0),
      remaining_amount: parseFloat(a.remaining_amount || 0),
      notes: a.notes || '',
      created_at: a.created_at,
    }));

    return c.json({ success: true, data: appointments });
  } catch (error: any) {
    console.error('Get date appointments error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/make-server-70e1fc66/api/appointments', async (c) => {
  try {
    const appointmentData = await c.req.json();
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        customer_id: appointmentData.customer_id,
        barber_id: appointmentData.barber_id,
        service_id: appointmentData.service_id,
        date: appointmentData.appointment_date,
        time: appointmentData.appointment_time,
        status: appointmentData.status || 'pending',
        payment_status: appointmentData.payment_status || 'pending',
        total_amount: appointmentData.total_amount || 0,
        down_payment: appointmentData.down_payment || 0,
        remaining_amount: appointmentData.remaining_amount || 0,
        notes: appointmentData.notes || '',
      })
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          email,
          phone
        ),
        barber:barber_id (
          id,
          users:user_id (
            name
          )
        ),
        service:service_id (
          id,
          name,
          price,
          duration
        )
      `)
      .single();

    if (error) throw error;

    const appointment = {
      id: data.id,
      customer_id: data.customer_id,
      customer_name: data.customer?.name || 'Unknown',
      customer_email: data.customer?.email || '',
      customer_phone: data.customer?.phone || '',
      barber_id: data.barber_id,
      barber_name: data.barber?.users?.name || 'Unknown',
      service_id: data.service_id,
      service_name: data.service?.name || 'Unknown',
      service_price: parseFloat(data.service?.price || 0),
      service_duration: data.service?.duration || 0,
      appointment_date: data.date,
      appointment_time: data.time,
      status: data.status,
      payment_status: data.payment_status || 'pending',
      total_amount: parseFloat(data.total_amount || 0),
      down_payment: parseFloat(data.down_payment || 0),
      remaining_amount: parseFloat(data.remaining_amount || 0),
      notes: data.notes || '',
      created_at: data.created_at,
    };

    return c.json({ success: true, data: appointment });
  } catch (error: any) {
    console.error('Create appointment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/make-server-70e1fc66/api/appointments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const supabase = getAdminClient();

    // Check if status is being changed to 'approved' to trigger email
    const statusChangedToApproved = updates.status === 'approved';

    const updateData: any = {};
    if (updates.appointment_date !== undefined) updateData.date = updates.appointment_date;
    if (updates.appointment_time !== undefined) updateData.time = updates.appointment_time;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.payment_status !== undefined) updateData.payment_status = updates.payment_status;
    if (updates.total_amount !== undefined) updateData.total_amount = updates.total_amount;
    if (updates.down_payment !== undefined) updateData.down_payment = updates.down_payment;
    if (updates.remaining_amount !== undefined) updateData.remaining_amount = updates.remaining_amount;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.barber_id !== undefined) updateData.barber_id = updates.barber_id;
    if (updates.service_id !== undefined) updateData.service_id = updates.service_id;

    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          email,
          phone
        ),
        barber:barber_id (
          id,
          users:user_id (
            name
          )
        ),
        service:service_id (
          id,
          name,
          price,
          duration
        )
      `)
      .single();

    if (error) throw error;

    const appointment = {
      id: data.id,
      customer_id: data.customer_id,
      customer_name: data.customer?.name || 'Unknown',
      customer_email: data.customer?.email || '',
      customer_phone: data.customer?.phone || '',
      barber_id: data.barber_id,
      barber_name: data.barber?.users?.name || 'Unknown',
      service_id: data.service_id,
      service_name: data.service?.name || 'Unknown',
      service_price: parseFloat(data.service?.price || 0),
      service_duration: data.service?.duration || 0,
      appointment_date: data.date,
      appointment_time: data.time,
      status: data.status,
      payment_status: data.payment_status || 'pending',
      total_amount: parseFloat(data.total_amount || 0),
      down_payment: parseFloat(data.down_payment || 0),
      remaining_amount: parseFloat(data.remaining_amount || 0),
      notes: data.notes || '',
      created_at: data.created_at,
    };

    // Send approval email if status changed to approved
    if (statusChangedToApproved && appointment.customer_email) {
      console.log('📧 Sending approval email to:', appointment.customer_email);
      // Send email asynchronously (don't wait for it)
      sendAppointmentApprovalEmail(appointment).then(success => {
        if (success) {
          console.log('✅ Approval email sent successfully');
        } else {
          console.log('⚠️ Approval email failed (but appointment was updated)');
        }
      }).catch(err => {
        console.error('❌ Approval email error:', err);
      });
    }

    return c.json({ success: true, data: appointment });
  } catch (error: any) {
    console.error('Update appointment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete('/make-server-70e1fc66/api/appointments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({ success: true, data: { message: 'Appointment deleted successfully' } });
  } catch (error: any) {
    console.error('Delete appointment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Send reminder emails for appointments happening in 24 hours
 * This endpoint should be called by a Supabase Cron job daily
 */
app.post('/make-server-70e1fc66/api/appointments/send-reminders', async (c) => {
  try {
    console.log('🔔 Starting appointment reminder job...');
    const supabase = getAdminClient();

    // Get tomorrow's date (24 hours from now)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log('📅 Looking for appointments on:', tomorrowDateStr);

    // Find all approved appointments for tomorrow
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          email,
          phone
        ),
        barber:barber_id (
          id,
          users:user_id (
            name
          )
        ),
        service:service_id (
          id,
          name,
          price,
          duration
        )
      `)
      .eq('date', tomorrowDateStr)
      .eq('status', 'approved');

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      console.log('ℹ️ No appointments found for tomorrow');
      return c.json({
        success: true,
        message: 'No reminders to send',
        count: 0
      });
    }

    console.log(`📧 Found ${appointments.length} appointments to remind`);

    // Send reminder emails
    let successCount = 0;
    let failCount = 0;

    for (const appt of appointments) {
      const appointment = {
        id: appt.id,
        customer_id: appt.customer_id,
        customer_name: appt.customer?.name || 'Unknown',
        customer_email: appt.customer?.email || '',
        customer_phone: appt.customer?.phone || '',
        barber_id: appt.barber_id,
        barber_name: appt.barber?.users?.name || 'Unknown',
        service_id: appt.service_id,
        service_name: appt.service?.name || 'Unknown',
        service_price: parseFloat(appt.service?.price || 0),
        service_duration: appt.service?.duration || 0,
        appointment_date: appt.date,
        appointment_time: appt.time,
        status: appt.status,
        payment_status: appt.payment_status || 'pending',
        total_amount: parseFloat(appt.total_amount || 0),
        down_payment: parseFloat(appt.down_payment || 0),
        remaining_amount: parseFloat(appt.remaining_amount || 0),
        notes: appt.notes || '',
        created_at: appt.created_at,
      };

      if (appointment.customer_email) {
        const emailSent = await sendAppointmentReminderEmail(appointment);
        if (emailSent) {
          successCount++;
          console.log(`✅ Reminder sent to ${appointment.customer_name}`);
        } else {
          failCount++;
          console.log(`❌ Failed to send reminder to ${appointment.customer_name}`);
        }
      } else {
        failCount++;
        console.log(`⚠️ No email for ${appointment.customer_name}`);
      }
    }

    console.log(`✅ Reminder job complete: ${successCount} sent, ${failCount} failed`);

    return c.json({
      success: true,
      message: `Sent ${successCount} reminders`,
      total: appointments.length,
      sent: successCount,
      failed: failCount
    });
  } catch (error: any) {
    console.error('❌ Reminder job error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== ANALYTICS ====================

app.get('/make-server-70e1fc66/api/analytics/dashboard', async (c) => {
  try {
    const supabase = getAdminClient();

    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('*, service:service_id(price)');

    if (apptError) throw apptError;

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    if (usersError) throw usersError;

    const totalAppointments = appointments?.length || 0;
    const completedAppointments = appointments?.filter((a: any) => a.status === 'completed').length || 0;
    const pendingAppointments = appointments?.filter((a: any) => a.status === 'pending').length || 0;
    const cancelledAppointments = appointments?.filter((a: any) => a.status === 'cancelled').length || 0;

    const totalRevenue = appointments
      ?.filter((a: any) => a.status === 'completed')
      .reduce((sum: number, a: any) => sum + (parseFloat(a.total_amount) || 0), 0) || 0;

    const totalCustomers = users?.filter((u: any) => u.role === 'customer').length || 0;

    return c.json({
      success: true,
      data: {
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        cancelledAppointments,
        totalRevenue,
        totalCustomers,
      }
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== PAYMENTS ====================

app.get('/make-server-70e1fc66/api/payments', async (c) => {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        appointment:appointment_id (
          id,
          date,
          time,
          customer:customer_id (
            name
          ),
          service:service_id (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const payments = data.map((p: any) => ({
      id: p.id,
      appointment_id: p.appointment_id,
      customer_name: p.appointment?.customer?.name || 'Unknown',
      service_name: p.appointment?.service?.name || 'Unknown',
      appointment_date: p.appointment?.date || '',
      appointment_time: p.appointment?.time || '',
      amount: parseFloat(p.amount || 0),
      payment_type: p.payment_type,
      payment_method: p.payment_method,
      proof_url: p.proof_url || null,
      created_at: p.created_at,
    }));

    return c.json({ success: true, data: payments });
  } catch (error: any) {
    console.error('Get payments error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/make-server-70e1fc66/api/payments', async (c) => {
  try {
    const paymentData = await c.req.json();
    const supabase = getAdminClient();

    console.log('📝 Creating payment record:', paymentData);

    const { data, error } = await supabase
      .from('payments')
      .insert({
        appointment_id: paymentData.appointment_id,
        amount: paymentData.amount,
        payment_type: paymentData.payment_type,
        payment_method: paymentData.payment_method,
        proof_url: paymentData.proof_url || null, // Store Cloudflare R2 payment proof URL
      })
      .select(`
        *,
        appointment:appointment_id (
          id,
          date,
          time,
          customer:customer_id (
            name
          ),
          service:service_id (
            name
          )
        )
      `)
      .single();

    if (error) {
      console.error('❌ Payment creation error:', error);
      throw error;
    }

    console.log('✅ Payment record created:', data.id);

    const payment = {
      id: data.id,
      appointment_id: data.appointment_id,
      customer_name: data.appointment?.customer?.name || 'Unknown',
      service_name: data.appointment?.service?.name || 'Unknown',
      appointment_date: data.appointment?.date || '',
      appointment_time: data.appointment?.time || '',
      amount: parseFloat(data.amount || 0),
      payment_type: data.payment_type,
      payment_method: data.payment_method,
      proof_url: data.proof_url || null,
      created_at: data.created_at,
    };

    return c.json({ success: true, data: payment });
  } catch (error: any) {
    console.error('Create payment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/make-server-70e1fc66/api/payments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const supabase = getAdminClient();

    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.verified_by !== undefined) updateData.verified_by = updates.verified_by;
    if (updates.verified_at !== undefined) updateData.verified_at = updates.verified_at;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        appointment:appointment_id (
          id,
          date,
          time,
          customer:customer_id (
            name
          ),
          service:service_id (
            name
          )
        )
      `)
      .single();

    if (error) throw error;

    const payment = {
      id: data.id,
      appointment_id: data.appointment_id,
      customer_name: data.appointment?.customer?.name || 'Unknown',
      service_name: data.appointment?.service?.name || 'Unknown',
      appointment_date: data.appointment?.date || '',
      appointment_time: data.appointment?.time || '',
      amount: parseFloat(data.amount || 0),
      payment_type: data.payment_type,
      payment_method: data.payment_method,
      created_at: data.created_at,
    };

    return c.json({ success: true, data: payment });
  } catch (error: any) {
    console.error('Update payment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== EARNINGS ====================

app.get('/make-server-70e1fc66/api/earnings/barber/:barberId', async (c) => {
  try {
    const barberId = c.req.param('barberId');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('earnings')
      .select(`
        *,
        appointment:appointment_id (
          id,
          date,
          time,
          service:service_id (
            name
          )
        )
      `)
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const earnings = data.map((e: any) => ({
      id: e.id,
      barber_id: e.barber_id,
      appointment_id: e.appointment_id,
      service_name: e.appointment?.service?.name || 'Unknown',
      appointment_date: e.appointment?.date || '',
      appointment_time: e.appointment?.time || '',
      amount: parseFloat(e.amount || 0),
      created_at: e.created_at,
    }));

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);

    return c.json({
      success: true,
      data: {
        earnings,
        total: totalEarnings
      }
    });
  } catch (error: any) {
    console.error('Get barber earnings error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/make-server-70e1fc66/api/earnings', async (c) => {
  try {
    const earningData = await c.req.json();
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('earnings')
      .insert({
        barber_id: earningData.barber_id,
        appointment_id: earningData.appointment_id,
        amount: earningData.amount,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Create earning error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== IMAGE UPLOAD (CLOUDFLARE R2) ====================

app.post('/make-server-70e1fc66/api/upload-image', async (c) => {
  try {
    console.log('📤 Starting image upload to Cloudflare R2...');

    // Get environment variables for Cloudflare R2
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.error('❌ Missing Cloudflare R2 credentials');
      return c.json({
        success: false,
        error: 'Cloudflare R2 credentials not configured. Please set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, and CLOUDFLARE_R2_BUCKET_NAME environment variables.'
      }, 500);
    }

    // Parse the multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const uploadType = formData.get('type') as string || 'general'; // 'avatar', 'payment-proof', 'general'

    if (!file) {
      console.error('❌ No file provided');
      return c.json({
        success: false,
        error: 'No file provided'
      }, 400);
    }

    console.log(`📁 File received: ${file.name}, size: ${file.size} bytes, type: ${file.type}, uploadType: ${uploadType}`);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      console.error(`❌ Invalid file type: ${file.type}`);
      return c.json({
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'
      }, 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error(`❌ File too large: ${file.size} bytes`);
      return c.json({
        success: false,
        error: 'File size exceeds 5MB limit.'
      }, 400);
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Determine folder based on upload type
    let folder = 'general';
    if (uploadType === 'avatar') {
      folder = 'avatars';
    } else if (uploadType === 'payment-proof') {
      folder = 'payment-proofs';
    }

    // Generate unique filename with appropriate folder
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `supremo-barber/${folder}/${timestamp}-${randomString}.${fileExtension}`;

    console.log(`📝 Uploading to R2 as: ${fileName} (type: ${uploadType})`);

    // Configure S3 client for Cloudflare R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(uploadCommand);

    // Construct the public URL
    // For Cloudflare R2 with public bucket access enabled:
    // The format is: https://pub-<hash>.r2.dev/<filename>
    // You need to get the public bucket URL from Cloudflare dashboard
    // Alternatively, use custom domain if configured

    // Get custom R2 public URL from environment (optional)
    const r2PublicUrl = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

    let publicUrl: string;
    if (r2PublicUrl) {
      // Use custom domain or public bucket URL from environment
      publicUrl = `${r2PublicUrl}/${fileName}`;
    } else {
      // Default: construct using account ID and bucket name
      // Note: This requires the bucket to have public access enabled in Cloudflare
      publicUrl = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${fileName}`;
    }

    console.log(`✅ Image uploaded successfully: ${publicUrl}`);

    return c.json({
      success: true,
      data: {
        url: publicUrl,
        fileName: fileName,
      }
    });

  } catch (error: any) {
    console.error('❌ Image upload error:', error);
    return c.json({
      success: false,
      error: `Failed to upload image: ${error.message}`
    }, 500);
  }
});

// ==================== ADMIN UTILITIES ====================

app.delete('/make-server-70e1fc66/api/admin/reset-all-data', async (c) => {
  try {
    const supabase = getAdminClient();

    // Delete in correct order (respecting foreign key constraints)

    // 1. Delete payments (references appointments)
    console.log('Deleting payments...');
    const { error: paymentsError, count: paymentsCount } = await supabase
      .from('payments')
      .delete()
      .gte('created_at', '1970-01-01'); // Delete all rows by using a filter that matches everything

    if (paymentsError && paymentsError.code !== 'PGRST116') { // PGRST116 = no rows returned (table is empty)
      console.error('Error deleting payments:', paymentsError);
      throw paymentsError;
    }
    console.log('✅ Payments deleted');

    // 2. Delete appointments (references users, barbers, services)
    console.log('Deleting appointments...');
    const { error: appointmentsError, count: appointmentsCount } = await supabase
      .from('appointments')
      .delete()
      .gte('created_at', '1970-01-01'); // Delete all rows

    if (appointmentsError && appointmentsError.code !== 'PGRST116') {
      console.error('Error deleting appointments:', appointmentsError);
      throw appointmentsError;
    }
    console.log('✅ Appointments deleted');

    // 3. Delete barbers (references users)
    console.log('Deleting barbers...');
    const { error: barbersError, count: barbersCount } = await supabase
      .from('barbers')
      .delete()
      .gte('created_at', '1970-01-01'); // Delete all rows

    if (barbersError && barbersError.code !== 'PGRST116') {
      console.error('Error deleting barbers:', barbersError);
      throw barbersError;
    }
    console.log('✅ Barbers deleted');

    // 4. Delete services (no dependencies)
    console.log('Deleting services...');
    const { error: servicesError, count: servicesCount } = await supabase
      .from('services')
      .delete()
      .gte('created_at', '1970-01-01'); // Delete all rows

    if (servicesError && servicesError.code !== 'PGRST116') {
      console.error('Error deleting services:', servicesError);
      throw servicesError;
    }
    console.log('✅ Services deleted');

    // 5. Delete users and their auth accounts
    console.log('Deleting users and auth accounts...');
    const { data: allUsers, error: fetchUsersError } = await supabase
      .from('users')
      .select('id');

    if (fetchUsersError) {
      console.error('Error fetching users:', fetchUsersError);
      throw fetchUsersError;
    }

    // Delete auth users one by one
    if (allUsers && allUsers.length > 0) {
      for (const user of allUsers) {
        try {
          await supabase.auth.admin.deleteUser(user.id);
          console.log(`Deleted auth user: ${user.id}`);
        } catch (authDeleteError) {
          console.error(`Failed to delete auth user ${user.id}:`, authDeleteError);
          // Continue with other users
        }
      }
    }

    // Delete user profiles
    const { error: usersError, count: usersCount } = await supabase
      .from('users')
      .delete()
      .gte('created_at', '1970-01-01'); // Delete all rows

    if (usersError && usersError.code !== 'PGRST116') {
      console.error('Error deleting users:', usersError);
      throw usersError;
    }
    console.log('✅ Users deleted');

    // 6. Delete earnings (references barbers)
    console.log('Deleting earnings...');
    const { error: earningsError, count: earningsCount } = await supabase
      .from('earnings')
      .delete()
      .gte('created_at', '1970-01-01'); // Delete all rows

    if (earningsError && earningsError.code !== 'PGRST116') {
      console.error('Error deleting earnings:', earningsError);
      throw earningsError;
    }
    console.log('✅ Earnings deleted');

    return c.json({
      success: true,
      data: {
        message: 'All data reset successfully',
        deletedCounts: {
          payments: paymentsCount,
          appointments: appointmentsCount,
          barbers: barbersCount,
          services: servicesCount,
          users: usersCount,
          earnings: earningsCount
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Reset all data error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== REVIEWS ====================

/**
 * Test Supabase connection - Diagnostic endpoint for Test 3
 */
app.get('/make-server-70e1fc66/api/reviews/debug/test-connection', async (c) => {
  try {
    console.log('🧪 [TEST 3] Testing Supabase connection from backend...');

    const supabase = getAdminClient();

    // Test 1: Try a simple query
    console.log('📊 [TEST 3] Attempting direct query to reviews table...');
    const { data, error, count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('❌ [TEST 3] Direct query error:', error);
      return c.json({
        success: false,
        message: 'Supabase query failed',
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        },
        config: {
          url: supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        }
      }, 500);
    }

    console.log('✅ [TEST 3] Direct query succeeded!', data?.length, 'reviews found');

    // Test 2: Sample repository-style query
    const { data: filteredData, error: filterError } = await supabase
      .from('reviews')
      .select('*')
      .eq('show_on_landing', true);

    return c.json({
      success: true,
      message: 'Backend can access Supabase!',
      tests: {
        clientCreation: {
          success: true,
          message: 'Supabase client created successfully'
        },
        directQuery: {
          success: true,
          count: data?.length || 0,
          totalCount: count,
          sample: data?.[0] || null,
          message: `Found ${data?.length || 0} total reviews`
        },
        repositoryQuery: {
          success: !filterError,
          count: filteredData?.length || 0,
          sample: filteredData?.[0] || null,
          error: filterError?.message || null,
          message: `Found ${filteredData?.length || 0} reviews with show_on_landing=true`
        }
      },
      config: {
        url: supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ [TEST 3] Test connection failed:', error);
    return c.json({
      success: false,
      message: 'Backend test failed',
      error: error.message,
      stack: error.stack,
      diagnosis: 'Unexpected error in diagnostic endpoint'
    }, 500);
  }
});

/**
 * Get all reviews (with optional filters)
 */
app.get('/make-server-70e1fc66/api/reviews', async (c) => {
  try {
    console.log('🔍 [REVIEWS] getAllReviews called');

    const supabase = getAdminClient();
    const rating = c.req.query('rating');
    const barberId = c.req.query('barberId');
    const customerId = c.req.query('customerId');
    const showOnLanding = c.req.query('showOnLanding');

    let query = supabase
      .from('reviews')
      .select(`
        *,
        customer:users!reviews_customer_id_fkey (
          id,
          name,
          email
        ),
        barber:barbers!reviews_barber_id_fkey (
          id,
          user:users!barbers_user_id_fkey (
            id,
            name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (barberId) {
      query = query.eq('barber_id', barberId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (showOnLanding !== undefined) {
      query = query.eq('show_on_landing', showOnLanding === 'true');
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('❌ [REVIEWS] Repository query failed:', error);
      return c.json({
        success: false,
        message: 'Repository query failed',
        error: error.message,
        details: 'Check if Supabase client is initialized correctly in backend'
      }, 500);
    }

    if (!reviews) {
      console.warn('⚠️ [REVIEWS] Repository returned null/undefined');
      return c.json({ success: true, data: [] });
    }

    // Transform the data to include customer and barber names
    const transformedReviews = reviews.map((r: any) => ({
      ...r,
      customer_name: r.customer?.name || r.customer?.email || 'Unknown Customer',
      barber_name: r.barber?.user?.name || r.barber?.user?.email || 'Unknown Barber'
    }));

    // Filter by rating if provided
    let filteredReviews = transformedReviews;
    if (rating && rating !== 'all') {
      if (rating === 'best') {
        filteredReviews = transformedReviews.filter((r: any) => r.rating === 5);
      } else if (rating === '4+') {
        filteredReviews = transformedReviews.filter((r: any) => r.rating >= 4);
      } else {
        filteredReviews = transformedReviews.filter((r: any) => r.rating === parseInt(rating));
      }
    }

    console.log('✅ [REVIEWS] Returning', filteredReviews.length, 'reviews with customer and barber names');
    return c.json({ success: true, data: filteredReviews });
  } catch (error: any) {
    console.error('❌ [REVIEWS] Error fetching reviews:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    }, 500);
  }
});

/**
 * Get recent reviews (for landing page)
 * IMPORTANT: This must come before the /:id route
 */
app.get('/make-server-70e1fc66/api/reviews/recent', async (c) => {
  try {
    console.log('🔍 [REVIEWS] getRecentReviews called');

    const supabase = getAdminClient();
    const limit = c.req.query('limit') || '10';

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('show_on_landing', true)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('❌ [REVIEWS] Error fetching recent reviews:', error);
      return c.json({
        success: false,
        message: 'Failed to fetch recent reviews',
        error: error.message
      }, 500);
    }

    console.log('✅ [REVIEWS] Returning', reviews?.length || 0, 'recent reviews');
    return c.json({ success: true, data: reviews || [] });
  } catch (error: any) {
    console.error('❌ [REVIEWS] Error fetching recent reviews:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch recent reviews',
      error: error.message
    }, 500);
  }
});

/**
 * Get reviews for a specific barber
 * IMPORTANT: This must come before the /:id route
 */
app.get('/make-server-70e1fc66/api/reviews/barber/:barberId/rating', async (c) => {
  try {
    const barberId = c.req.param('barberId');
    const supabase = getAdminClient();

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('barber_id', barberId);

    if (error) throw error;

    if (!reviews || reviews.length === 0) {
      return c.json({
        success: true,
        data: {
          averageRating: 0,
          totalReviews: 0
        }
      });
    }

    const totalRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
    const averageRating = totalRating / reviews.length;

    return c.json({
      success: true,
      data: {
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalReviews: reviews.length
      }
    });
  } catch (error: any) {
    console.error('❌ [REVIEWS] Error fetching barber rating:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch barber rating',
      error: error.message
    }, 500);
  }
});

/**
 * Get reviews for a specific barber
 * IMPORTANT: This must come before the /:id route
 */
app.get('/make-server-70e1fc66/api/reviews/barber/:barberId', async (c) => {
  try {
    const barberId = c.req.param('barberId');
    const supabase = getAdminClient();

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: reviews || [] });
  } catch (error: any) {
    console.error('❌ [REVIEWS] Error fetching barber reviews:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch barber reviews',
      error: error.message
    }, 500);
  }
});

/**
 * Get reviews by customer
 * IMPORTANT: This must come before the /:id route
 */
app.get('/make-server-70e1fc66/api/reviews/customer/:customerId', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    const supabase = getAdminClient();

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: reviews || [] });
  } catch (error: any) {
    console.error('❌ [REVIEWS] Error fetching customer reviews:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch customer reviews',
      error: error.message
    }, 500);
  }
});

/**
 * Get review by ID
 * IMPORTANT: This must come AFTER all specific routes
 */
app.get('/make-server-70e1fc66/api/reviews/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();

    const { data: review, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ success: false, message: 'Review not found' }, 404);
      }
      throw error;
    }

    return c.json({ success: true, data: review });
  } catch (error: any) {
    console.error('❌ [REVIEWS] Error fetching review:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch review',
      error: error.message
    }, 500);
  }
});

/**
 * Create a new review
 */
app.post('/make-server-70e1fc66/api/reviews', async (c) => {
  try {
    console.log('📝 [REVIEWS] Received review creation request');

    const body = await c.req.json();
    const {
      customerId,
      customer_id,
      customerName,
      customer_name,
      barberId,
      barber_id,
      barberName,
      barber_name,
      appointmentId,
      appointment_id,
      serviceName,
      service_name,
      serviceId,
      service_id,
      rating,
      comment,
      showOnLanding,
      show_on_landing,
    } = body;

    // Accept both camelCase and snake_case
    const finalCustomerId = customer_id || customerId;
    const finalCustomerName = customer_name || customerName;
    const finalBarberId = barber_id || barberId;
    const finalBarberName = barber_name || barberName;
    const finalAppointmentId = appointment_id || appointmentId;
    const finalServiceName = service_name || serviceName;
    const finalServiceId = service_id || serviceId;
    const finalShowOnLanding = show_on_landing ?? showOnLanding ?? false;

    // Validate required fields
    if (!finalCustomerId || !rating || !comment) {
      return c.json({
        success: false,
        message: 'Customer ID, rating, and comment are required'
      }, 400);
    }

    const supabase = getAdminClient();

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        customer_id: finalCustomerId,
        customer_name: finalCustomerName || null,
        barber_id: finalBarberId || null,
        barber_name: finalBarberName || null,
        appointment_id: finalAppointmentId || null,
        service_id: finalServiceId || null,
        service_name: finalServiceName || null,
        rating: parseInt(rating),
        comment,
        show_on_landing: finalShowOnLanding,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ [REVIEWS] Review created successfully:', review.id);
    return c.json({ success: true, data: review }, 201);
  } catch (error: any) {
    console.error('❌ [REVIEWS] Error creating review:', error);
    return c.json({
      success: false,
      message: 'Failed to create review',
      error: error.message
    }, 500);
  }
});

/**
 * Update a review
 */
app.put('/make-server-70e1fc66/api/reviews/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const supabase = getAdminClient();

    // Check if review exists
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !existingReview) {
      return c.json({ success: false, message: 'Review not found' }, 404);
    }

    // Update the review
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return c.json({ success: true, data: updatedReview });
  } catch (error: any) {
    console.error('❌ [REVIEWS] Error updating review:', error);
    return c.json({
      success: false,
      message: 'Failed to update review',
      error: error.message
    }, 500);
  }
});

/**
 * Toggle show on landing page
 */
app.put('/make-server-70e1fc66/api/reviews/:id/toggle-landing', async (c) => {
  try {
    console.log('🔄 [REVIEWS] toggleShowOnLanding called for review:', c.req.param('id'));

    const id = c.req.param('id');
    const supabase = getAdminClient();

    // Get current review
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('show_on_landing')
      .eq('id', id)
      .single();

    if (fetchError || !review) {
      return c.json({ success: false, message: 'Review not found' }, 404);
    }

    console.log('[REVIEWS] Current show_on_landing value:', review.show_on_landing);

    // Toggle the value
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({
        show_on_landing: !review.show_on_landing,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log('✅ [REVIEWS] Toggled to:', updatedReview?.show_on_landing);
    return c.json({ success: true, data: updatedReview });
  } catch (error: any) {
    console.error('❌ [REVIEWS] Error toggling show on landing:', error);
    return c.json({
      success: false,
      message: 'Failed to toggle show on landing',
      error: error.message
    }, 500);
  }
});

/**
 * Delete a review
 */
app.delete('/make-server-70e1fc66/api/reviews/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();

    // Check if review exists
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !review) {
      return c.json({ success: false, message: 'Review not found' }, 404);
    }

    // Delete the review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return c.json({ success: true, data: { message: 'Review deleted successfully' } });
  } catch (error: any) {
    console.error('❌ [REVIEWS] Error deleting review:', error);
    return c.json({
      success: false,
      message: 'Failed to delete review',
      error: error.message
    }, 500);
  }
});

// =====================================================
// NOTIFICATIONS ROUTES
// =====================================================

/**
 * Get all notifications (admin only)
 */
app.get('/make-server-70e1fc66/api/notifications', async (c) => {
  try {
    console.log('🔍 [NOTIFICATIONS] getAllNotifications called');

    const supabase = getAdminClient();
    const limit = c.req.query('limit');

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) throw error;

    console.log('✅ [NOTIFICATIONS] Fetched', data?.length || 0, 'notifications');
    return c.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error fetching notifications:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    }, 500);
  }
});

/**
 * Get notifications for a specific user
 */
app.get('/make-server-70e1fc66/api/notifications/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const role = c.req.query('role');
    console.log('🔍 [NOTIFICATIONS] getNotificationsByUser called for:', userId, 'role:', role);

    const supabase = getAdminClient();

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (role) {
      query = query.eq('user_role', role);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    console.log('✅ [NOTIFICATIONS] Fetched', data?.length || 0, 'notifications for user');
    return c.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error fetching user notifications:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch user notifications',
      error: error.message
    }, 500);
  }
});

/**
 * Get unread notification count for a user
 */
app.get('/make-server-70e1fc66/api/notifications/user/:userId/unread-count', async (c) => {
  try {
    const userId = c.req.param('userId');
    const role = c.req.query('role');
    console.log('🔢 [NOTIFICATIONS] getUnreadCount called for:', userId);

    const supabase = getAdminClient();

    let query = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (role) {
      query = query.eq('user_role', role);
    }

    const { count, error } = await query;

    if (error) throw error;

    console.log('✅ [NOTIFICATIONS] Unread count:', count);
    return c.json({
      success: true,
      data: { count: count || 0 }
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error fetching unread count:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    }, 500);
  }
});

/**
 * Create a new notification
 */
app.post('/make-server-70e1fc66/api/notifications', async (c) => {
  try {
    console.log('📝 [NOTIFICATIONS] createNotification called');
    const body = await c.req.json();
    console.log('📝 [NOTIFICATIONS] Request body:', JSON.stringify(body, null, 2));

    const supabase = getAdminClient();

    // Clean the notification data - remove fields that shouldn't be inserted
    const { id, created_at, updated_at, timestamp, ...cleanData } = body;

    // Ensure required fields are present
    const notificationData = {
      user_id: cleanData.userId || cleanData.user_id,
      user_role: cleanData.user_role,
      type: cleanData.type,
      title: cleanData.title,
      message: cleanData.message,
      related_id: cleanData.related_id,
      related_type: cleanData.related_type,
      action_url: cleanData.action_url || cleanData.actionUrl,
      action_label: cleanData.action_label || cleanData.actionLabel,
      priority: cleanData.priority || 'medium',
      metadata: cleanData.metadata,
      is_read: cleanData.is_read !== undefined ? cleanData.is_read : (cleanData.isRead !== undefined ? cleanData.isRead : false),
    };

    // Remove undefined values
    Object.keys(notificationData).forEach(key => {
      if (notificationData[key] === undefined) {
        delete notificationData[key];
      }
    });

    console.log('📝 [NOTIFICATIONS] Cleaned data:', JSON.stringify(notificationData, null, 2));

    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) {
      console.error('❌ [NOTIFICATIONS] Database error:', error);
      throw error;
    }

    console.log('✅ [NOTIFICATIONS] Notification created:', data.id);
    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error creating notification:', error);
    console.error('❌ [NOTIFICATIONS] Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return c.json({
      success: false,
      message: 'Failed to create notification',
      error: error.message,
      details: error.details || error.hint || 'Check Supabase logs for more details'
    }, 500);
  }
});

/**
 * Mark notification as read
 */
app.patch('/make-server-70e1fc66/api/notifications/:id/read', async (c) => {
  try {
    const id = c.req.param('id');
    console.log('✅ [NOTIFICATIONS] markAsRead called for:', id);

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ [NOTIFICATIONS] Notification marked as read');
    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error marking notification as read:', error);
    return c.json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    }, 500);
  }
});

/**
 * Mark all notifications as read for a user
 */
app.patch('/make-server-70e1fc66/api/notifications/user/:userId/read-all', async (c) => {
  try {
    const userId = c.req.param('userId');
    const role = c.req.query('role');
    console.log('✅ [NOTIFICATIONS] markAllAsRead called for:', userId);

    const supabase = getAdminClient();

    let query = supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (role) {
      query = query.eq('user_role', role);
    }

    const { error } = await query;

    if (error) throw error;

    console.log('✅ [NOTIFICATIONS] All notifications marked as read');
    return c.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error marking all as read:', error);
    return c.json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    }, 500);
  }
});

/**
 * Delete a notification
 */
app.delete('/make-server-70e1fc66/api/notifications/:id', async (c) => {
  try {
    const id = c.req.param('id');
    console.log('🗑️ [NOTIFICATIONS] deleteNotification called for:', id);

    const supabase = getAdminClient();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ [NOTIFICATIONS] Notification deleted');
    return c.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error deleting notification:', error);
    return c.json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    }, 500);
  }
});

// =====================================================
// AUDIT LOGS ROUTES
// =====================================================

/**
 * Get all audit logs (admin only)
 */
app.get('/make-server-70e1fc66/api/audit-logs', async (c) => {
  try {
    console.log('🔍 [AUDIT] getAllAuditLogs called');

    const supabase = getAdminClient();
    const limit = c.req.query('limit');
    const action = c.req.query('action');
    const userId = c.req.query('userId');

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    console.log('✅ [AUDIT] Fetched', data?.length || 0, 'audit logs');
    return c.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('❌ [AUDIT] Error fetching audit logs:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    }, 500);
  }
});

/**
 * Get audit logs for a specific user
 */
app.get('/make-server-70e1fc66/api/audit-logs/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const limit = c.req.query('limit');
    console.log('🔍 [AUDIT] getAuditLogsByUser called for:', userId);

    const supabase = getAdminClient();

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) throw error;

    console.log('✅ [AUDIT] Fetched', data?.length || 0, 'audit logs for user');
    return c.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('❌ [AUDIT] Error fetching user audit logs:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch user audit logs',
      error: error.message
    }, 500);
  }
});

/**
 * Get audit logs for a specific entity
 */
app.get('/make-server-70e1fc66/api/audit-logs/entity/:entityType/:entityId', async (c) => {
  try {
    const entityType = c.req.param('entityType');
    const entityId = c.req.param('entityId');
    const limit = c.req.query('limit');
    console.log('🔍 [AUDIT] getAuditLogsByEntity called for:', entityType, entityId);

    const supabase = getAdminClient();

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) throw error;

    console.log('✅ [AUDIT] Fetched', data?.length || 0, 'audit logs for entity');
    return c.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('❌ [AUDIT] Error fetching entity audit logs:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch entity audit logs',
      error: error.message
    }, 500);
  }
});

/**
 * Create a new audit log entry
 */
app.post('/make-server-70e1fc66/api/audit-logs', async (c) => {
  try {
    console.log('📝 [AUDIT] createAuditLog called');
    const body = await c.req.json();

    const supabase = getAdminClient();

    // Set default status if not provided
    const logData = {
      ...body,
      status: body.status || 'success',
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert([logData])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ [AUDIT] Audit log created:', data.id);
    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('❌ [AUDIT] Error creating audit log:', error);
    return c.json({
      success: false,
      message: 'Failed to create audit log',
      error: error.message
    }, 500);
  }
});

/**
 * Get audit log statistics
 */
app.get('/make-server-70e1fc66/api/audit-logs/statistics', async (c) => {
  try {
    console.log('📊 [AUDIT] getStatistics called');

    const supabase = getAdminClient();

    // Get total count
    const { count: total, error: countError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Get recent logs for aggregation
    const { data, error } = await supabase
      .from('audit_logs')
      .select('action, status, user_role')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    // Aggregate data
    const byAction: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byUserRole: Record<string, number> = {};

    data?.forEach((log) => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
      byUserRole[log.user_role] = (byUserRole[log.user_role] || 0) + 1;
    });

    console.log('✅ [AUDIT] Statistics calculated');
    return c.json({
      success: true,
      data: {
        total: total || 0,
        byAction,
        byStatus,
        byUserRole,
      }
    });
  } catch (error: any) {
    console.error('❌ [AUDIT] Error fetching statistics:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    }, 500);
  }
});

/**
 * Send inquiry email from contact form
 */
async function sendInquiryEmail(data: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  type: string;
}): Promise<boolean> {
  const { name, email, subject, message, type } = data;

  const businessEmail = 'info@supremobarber.com';

  // Determine recipient based on inquiry type
  let recipientEmail = businessEmail;
  if (type.toLowerCase().includes('privacy')) {
    recipientEmail = 'privacy@supremobarber.com';
  }

  // Email to business
  const businessHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #6E5A48;
            color: #FFC976;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .field {
            margin-bottom: 15px;
          }
          .label {
            font-weight: bold;
            color: #6E5A48;
            display: block;
            margin-bottom: 5px;
          }
          .value {
            background-color: white;
            padding: 10px;
            border-left: 3px solid #DB9D47;
            border-radius: 3px;
          }
          .message-box {
            background-color: white;
            padding: 15px;
            border-left: 3px solid #DB9D47;
            border-radius: 3px;
            white-space: pre-wrap;
            min-height: 100px;
          }
          .footer {
            text-align: center;
            padding: 15px;
            font-size: 12px;
            color: #7A6854;
            border-top: 1px solid #ddd;
          }
          .badge {
            display: inline-block;
            background-color: #DB9D47;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✉️ New Customer Inquiry</h1>
        </div>
        <div class="content">
          <div class="field">
            <span class="label">Inquiry Type:</span>
            <div class="value">
              ${type}
              <span class="badge">ACTION REQUIRED</span>
            </div>
          </div>
          
          <div class="field">
            <span class="label">From:</span>
            <div class="value">${name}</div>
          </div>
          
          <div class="field">
            <span class="label">Email:</span>
            <div class="value">
              <a href="mailto:${email}" style="color: #DB9D47; text-decoration: none;">
                ${email}
              </a>
            </div>
          </div>
          
          ${subject ? `
          <div class="field">
            <span class="label">Subject:</span>
            <div class="value">${subject}</div>
          </div>
          ` : ''}
          
          <div class="field">
            <span class="label">Message:</span>
            <div class="message-box">${message}</div>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #E8F4FD; border-left: 3px solid #3B82F6; border-radius: 3px;">
            <strong style="color: #1E40AF;">⏰ Response Time:</strong><br>
            ${type.toLowerCase().includes('privacy') ?
      'Please respond within 48 hours as per Privacy Policy commitment.' :
      'Please respond within 24 hours as per Terms & Conditions commitment.'}
          </div>
        </div>
        <div class="footer">
          <p>
            This email was sent from the Supremo Barber contact form.<br>
            Reply-To: ${email}
          </p>
        </div>
      </body>
    </html>
  `;

  // Confirmation email to customer
  const customerHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #6E5A48;
            color: #FFC976;
            padding: 30px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #7A6854;
            border-top: 1px solid #ddd;
          }
          .info-box {
            background-color: #E8F4FD;
            border-left: 4px solid #3B82F6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 3px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Thank You for Contacting Us!</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          
          <p>
            We've successfully received your inquiry regarding our <strong>${type.replace('Inquiry', '').trim()}</strong>. 
            Our team will review your message and get back to you shortly.
          </p>
          
          <div class="info-box">
            <strong>⏰ Expected Response Time:</strong><br>
            We typically respond to ${type.toLowerCase().includes('privacy') ? 'privacy inquiries within 48 hours' : 'inquiries within 24 hours'}.
          </div>
          
          <p><strong>Your Message:</strong></p>
          <div style="background-color: white; padding: 15px; border-left: 3px solid #DB9D47; border-radius: 3px; white-space: pre-wrap;">
${message}
          </div>
          
          <p style="margin-top: 25px;">
            In the meantime, feel free to explore our services or book an appointment through our website.
          </p>
          
          <div style="text-align: center;">
            <p style="margin-top: 15px; color: #7A6854;">
              <strong>Contact Us:</strong><br>
              📧 ${recipientEmail}<br>
              📱 +63 912 345 6789
            </p>
          </div>
        </div>
        <div class="footer">
          <p>
            <strong>Supremo Barber</strong><br>
            Premium Barbering Services<br>
            <a href="mailto:info@supremobarber.com" style="color: #DB9D47;">info@supremobarber.com</a>
          </p>
          <p style="margin-top: 10px; font-size: 11px; color: #999;">
            This is an automated confirmation email. Please do not reply directly to this email.
          </p>
        </div>
      </body>
    </html>
  `;

  try {
    // Send email to business
    console.log(`📧 Sending inquiry email to ${recipientEmail}...`);
    const businessSuccess = await sendEmail(
      recipientEmail,
      `[${type}] ${subject || 'New Inquiry from ' + name}`,
      businessHtml
    );

    if (businessSuccess) {
      console.log(`✅ Business notification sent successfully to ${recipientEmail}`);
    } else {
      console.warn(`⚠️ Failed to send business notification to ${recipientEmail}`);
    }

    // Send confirmation email to customer
    console.log(`📧 Sending confirmation email to customer: ${email}...`);
    const customerSuccess = await sendEmail(
      email,
      `We've received your inquiry - Supremo Barber`,
      customerHtml
    );

    if (customerSuccess) {
      console.log(`✅ Customer confirmation sent successfully to ${email}`);
    } else {
      console.warn(`⚠️ Failed to send customer confirmation to ${email}`);
    }

    // Return true if at least one email was sent
    return businessSuccess || customerSuccess;
  } catch (error) {
    console.error('❌ Error sending inquiry emails:', error);
    return false;
  }
}

// ==================== CONTACT & INQUIRY ====================

app.post('/make-server-70e1fc66/api/send-inquiry', async (c) => {
  try {
    const { name, email, subject, message, type } = await c.req.json();

    console.log('📧 Inquiry email request:', { name, email, type });

    // Validate required fields
    if (!name || !email || !message || !type) {
      return c.json({
        success: false,
        error: 'Missing required fields: name, email, message, and type are required'
      }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({
        success: false,
        error: 'Invalid email format'
      }, 400);
    }

    // Send inquiry email
    const emailSent = await sendInquiryEmail({
      name,
      email,
      subject,
      message,
      type
    });

    if (!emailSent) {
      console.warn('⚠️ Emails may not have been sent (SMTP not configured)');
    }

    console.log('✅ Inquiry processed successfully');

    return c.json({
      success: true,
      message: 'Your inquiry has been sent successfully. We will get back to you soon.'
    });

  } catch (error: any) {
    console.error('❌ Error processing inquiry:', error);
    return c.json({
      success: false,
      error: 'Failed to send inquiry. Please try again or contact us directly at info@supremobarber.com'
    }, 500);
  }
});

// ==================== OTP / 2FA AUTHENTICATION ====================

/**
 * Hash OTP for secure storage in JWT
 */
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a simple JWT token using Web Crypto API
 */
async function createOTPToken(email: string, otpHash: string, purpose: string): Promise<string> {
  const jwtSecret = Deno.env.get('JWT_SECRET') || 'supremo-barber-default-secret-change-in-production';
  const encoder = new TextEncoder();

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    email: email.toLowerCase(),
    otpHash: otpHash,
    purpose: purpose,
    exp: Math.floor(Date.now() / 1000) + (10 * 60), // 10 minutes
    iat: Math.floor(Date.now() / 1000)
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${data}.${encodedSignature}`;
}

/**
 * Verify JWT token using Web Crypto API
 */
async function verifyOTPToken(token: string): Promise<any> {
  const jwtSecret = Deno.env.get('JWT_SECRET') || 'supremo-barber-default-secret-change-in-production';
  const encoder = new TextEncoder();

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  // Verify signature
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signature = Uint8Array.from(
    atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );

  const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));

  if (!isValid) {
    throw new Error('Invalid signature');
  }

  // Decode payload
  const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}

/**
 * Send OTP email for authentication
 */
async function sendOTPEmail(email: string, otp: string, purpose: string): Promise<boolean> {
  const subject = purpose === 'signup'
    ? '🔐 Your Verification Code - Supremo Barber'
    : '🔐 Your Login Code - Supremo Barber';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #DB9D47 0%, #C88D3F 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; }
        .otp-box { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 3px solid #DB9D47; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 42px; font-weight: bold; color: #6E5A48; letter-spacing: 8px; font-family: 'Courier New', monospace; }
        .expiry-text { color: #e74c3c; font-size: 14px; margin-top: 15px; font-weight: 600; }
        .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { background-color: #6E5A48; color: white; padding: 30px; text-align: center; font-size: 14px; }
        .footer a { color: #DB9D47; text-decoration: none; }
        .security-tips { background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .security-tips h3 { margin-top: 0; color: #1976D2; }
        .security-tips ul { margin: 10px 0; padding-left: 20px; }
        .security-tips li { margin: 5px 0; color: #555; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✂️ Supremo Barber</h1>
        </div>
        
        <div class="content">
          <h2 style="color: #6E5A48; margin-top: 0;">
            ${purpose === 'signup' ? 'Welcome! Verify Your Email' : 'Login Verification'}
          </h2>
          
          <p style="color: #5C4A3A; font-size: 16px; line-height: 1.6;">
            ${purpose === 'signup'
      ? 'Thank you for signing up! Please use the verification code below to complete your registration.'
      : 'We received a login request for your account. Please use the code below to continue.'}
          </p>
          
          <div class="otp-box">
            <p style="margin: 0 0 10px 0; color: #7A6854; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
              Your Verification Code
            </p>
            <div class="otp-code">${otp}</div>
            <p class="expiry-text">⏱️ Expires in 10 minutes</p>
          </div>
          
          <div class="info-box">
            <strong>📱 Enter this code in the verification screen to proceed.</strong><br>
            <span style="color: #856404;">This code is valid for 10 minutes and can be used only once.</span>
          </div>
          
          <div class="security-tips">
            <h3>🔒 Security Tips</h3>
            <ul>
              <li>Never share this code with anyone, including Supremo Barber staff</li>
              <li>Our team will never ask for your verification code</li>
              <li>If you didn't request this code, please ignore this email</li>
              <li>You have 3 attempts to enter the correct code</li>
            </ul>
          </div>
          
          <p style="color: #7A6854; font-size: 14px; margin-top: 30px;">
            Didn't request this code? You can safely ignore this email. Your account remains secure.
          </p>
        </div>
        
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            <strong>Supremo Barber Management System</strong>
          </p>
          <p style="margin: 0; opacity: 0.9;">
            Premium Grooming Services<br>
            📧 info@supremobarber.com | 📞 +63 912 345 6789
          </p>
          <p style="margin: 15px 0 0 0; font-size: 12px; opacity: 0.7;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, html);
}

/**
 * POST /api/auth/send-otp
 * Send OTP to user's email for signup or login
 */
app.post('/make-server-70e1fc66/api/auth/send-otp', async (c) => {
  try {
    const { email, purpose } = await c.req.json();

    console.log('📧 OTP request:', { email, purpose });

    // Validate required fields
    if (!email || !purpose) {
      return c.json({
        success: false,
        error: 'Email and purpose are required'
      }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({
        success: false,
        error: 'Invalid email format'
      }, 400);
    }

    // Validate purpose
    if (!['signup', 'login'].includes(purpose)) {
      return c.json({
        success: false,
        error: 'Invalid purpose. Must be "signup" or "login"'
      }, 400);
    }

    // For signup, check if email already exists
    if (purpose === 'signup') {
      const supabase = getAdminClient();
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        return c.json({
          success: false,
          error: 'Email already registered. Please login instead.'
        }, 400);
      }
    }

    // For login, verify email exists
    if (purpose === 'login') {
      const supabase = getAdminClient();
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.toLowerCase())
        .single();

      if (!existingUser) {
        return c.json({
          success: false,
          error: 'Email not found. Please sign up first.'
        }, 400);
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create JWT token with OTP hash
    const otpHash = await hashOTP(otp);
    const token = await createOTPToken(email.toLowerCase(), otpHash, purpose);

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, purpose);

    if (!emailSent) {
      console.warn('⚠️ OTP email may not have been sent (SMTP not configured)');
      // For development, still return success with the OTP in console
      console.log(`🔐 DEV MODE - OTP for ${email}: ${otp}`);
    }

    console.log(`✅ OTP sent to ${email} (expires in 10 minutes)`);

    return c.json({
      success: true,
      message: 'Verification code sent to your email',
      token: token, // Client must send this back with OTP for verification
      // In development, include OTP for testing (remove in production)
      ...(Deno.env.get('ENVIRONMENT') === 'development' && { dev_otp: otp })
    });

  } catch (error: any) {
    console.error('❌ Error sending OTP:', error);
    return c.json({
      success: false,
      error: 'Failed to send verification code. Please try again.'
    }, 500);
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP code
 */
app.post('/make-server-70e1fc66/api/auth/verify-otp', async (c) => {
  try {
    const { email, otp, token } = await c.req.json();

    console.log('🔐 OTP verification request:', { email, otp });

    // Validate required fields
    if (!email || !otp || !token) {
      return c.json({
        success: false,
        error: 'Email, OTP, and token are required'
      }, 400);
    }

    // Verify JWT token
    let payload: any;
    try {
      payload = await verifyOTPToken(token);
    } catch (err) {
      console.warn('❌ Invalid or expired token:', err);
      return c.json({
        success: false,
        error: 'Verification code expired or invalid. Please request a new code.'
      }, 400);
    }

    // Verify email matches
    if (payload.email !== email.toLowerCase()) {
      return c.json({
        success: false,
        error: 'Invalid verification request.'
      }, 400);
    }

    // Verify OTP hash matches
    const otpHash = await hashOTP(otp);
    if (payload.otpHash !== otpHash) {
      return c.json({
        success: false,
        error: 'Invalid verification code.'
      }, 400);
    }

    console.log(`✅ OTP verified successfully for ${email}`);

    return c.json({
      success: true,
      message: 'Verification code verified successfully!'
    });

  } catch (error: any) {
    console.error('❌ Error verifying OTP:', error);
    return c.json({
      success: false,
      error: 'Failed to verify code. Please try again.'
    }, 500);
  }
});

// Serve the app
Deno.serve(app.fetch);
