// ==================== EMAIL NOTIFICATION FUNCTIONS ====================
// Updated to support SMTP (Gmail, Amazon SES, or any SMTP server)
// This is a drop-in replacement for the Resend version

/**
 * Send email using SMTP with simple implementation
 * Works with: Gmail, Amazon SES, Mailgun, SendGrid, or any SMTP server
 * 
 * Required Supabase Secrets:
 * - SMTP_HOST (e.g., smtp.gmail.com or email-smtp.us-east-1.amazonaws.com)
 * - SMTP_PORT (usually 587)
 * - SMTP_USER (your email or SMTP username)
 * - SMTP_PASS (app password or SMTP password)
 * - SMTP_FROM (e.g., "Supremo Barber <noreply@supremobarber.com>")
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const smtpFrom = Deno.env.get('SMTP_FROM') || 'Supremo Barber <noreply@supremobarber.com>';
    const smtpSecure = Deno.env.get('SMTP_SECURE') === 'true'; // true for port 465, false for other ports

    // Validate configuration
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('⚠️ SMTP not configured - email not sent');
      console.warn('Required secrets: SMTP_HOST, SMTP_USER, SMTP_PASS');
      console.warn('Optional: SMTP_PORT (default 587), SMTP_FROM, SMTP_SECURE');
      return false;
    }

    console.log(`📧 Attempting to send email to ${to} via ${smtpHost}:${smtpPort}`);

    // Use deno-smtp library approach (simplified)
    const message = createEmailMessage(smtpFrom, to, subject, html);
    
    const success = await sendSMTP(
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      to,
      message,
      smtpSecure
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
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36)}`;
  const date = new Date().toUTCString();
  
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
    stripHtml(html), // Plain text version
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
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Send email via SMTP
 */
async function sendSMTP(
  host: string,
  port: number,
  user: string,
  pass: string,
  from: string,
  to: string,
  message: string,
  secure: boolean = false
): Promise<boolean> {
  let conn: Deno.Conn | Deno.TlsConn | null = null;
  
  try {
    // Connect to SMTP server
    if (secure && port === 465) {
      // Direct TLS connection for port 465
      conn = await Deno.connectTls({ hostname: host, port });
    } else {
      // Plain connection first, then upgrade to TLS (STARTTLS)
      const plainConn = await Deno.connect({ hostname: host, port });
      conn = await Deno.startTls(plainConn, { hostname: host });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper functions
    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(4096);
      const n = await conn!.read(buffer);
      const response = decoder.decode(buffer.subarray(0, n || 0));
      console.log('SMTP <<', response.trim());
      return response;
    };

    const sendCommand = async (command: string): Promise<string> => {
      console.log('SMTP >>', command.trim());
      await conn!.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    // SMTP conversation
    await readResponse(); // Read server greeting (220)

    await sendCommand(`EHLO ${host}`);
    await sendCommand('AUTH LOGIN');
    await sendCommand(btoa(user));
    const authResp = await sendCommand(btoa(pass));
    
    if (!authResp.startsWith('235')) {
      console.error('❌ SMTP authentication failed');
      return false;
    }

    await sendCommand(`MAIL FROM:<${extractEmail(from)}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand('DATA');
    
    // Send message body
    await conn.write(encoder.encode(message + '\r\n.\r\n'));
    const dataResp = await readResponse();
    
    if (!dataResp.startsWith('250')) {
      console.error('❌ SMTP message send failed');
      return false;
    }

    await sendCommand('QUIT');
    
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
 * Extract email address from "Name <email@domain.com>" format
 */
function extractEmail(address: string): string {
  const match = address.match(/<(.+?)>/);
  return match ? match[1] : address;
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

// ==================== HOW TO USE ====================
/*

SETUP (Supabase Edge Function Secrets):

For Gmail:
- SMTP_HOST: smtp.gmail.com
- SMTP_PORT: 587
- SMTP_USER: your-gmail@gmail.com
- SMTP_PASS: your-16-char-app-password
- SMTP_FROM: Supremo Barber <your-gmail@gmail.com>

For Amazon SES:
- SMTP_HOST: email-smtp.us-east-1.amazonaws.com
- SMTP_PORT: 587
- SMTP_USER: your-ses-smtp-username
- SMTP_PASS: your-ses-smtp-password
- SMTP_FROM: Supremo Barber <noreply@verified-domain.com>

USAGE:
- Just replace the sendEmail() function in your existing code
- Keep the sendAppointmentApprovalEmail() and sendAppointmentReminderEmail() functions
- Everything else works the same!

*/
