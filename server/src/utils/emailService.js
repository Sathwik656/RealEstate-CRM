'use strict';
const nodemailer = require('nodemailer');

/**
 * Creates and returns a Nodemailer transporter configured for Gmail SMTP.
 * Uses App Password authentication (not plain password).
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
};

/**
 * Sends a reminder email to the user's registered email address.
 *
 * @param {string} toEmail   - Recipient email address
 * @param {string} title     - Reminder title
 * @param {string} note      - Reminder description / note
 * @param {Date}   dateTime  - The scheduled reminder date & time
 * @returns {Promise<void>}
 */
const sendReminderEmail = async (toEmail, title, note, dateTime) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('[EmailService] EMAIL_USER or EMAIL_APP_PASSWORD not set — skipping email.');
    return;
  }

  const formattedDateTime = new Date(dateTime).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const transporter = createTransporter();

  const mailOptions = {
    from: `"Real Estate CRM" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Reminder: ${title}`,
    text: [
      'Reminder Details:',
      `Title: ${title}`,
      `Description: ${note || 'No description provided'}`,
      `Date & Time: ${formattedDateTime}`,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                  border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1e40af; padding: 20px 24px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 18px;">🔔 Reminder Alert</h2>
        </div>
        <div style="padding: 24px;">
          <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">${title}</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #475569;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #1e293b; width: 120px;">Title</td>
              <td style="padding: 8px 0;">${title}</td>
            </tr>
            <tr style="border-top: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">Description</td>
              <td style="padding: 8px 0;">${note || '<em>No description provided</em>'}</td>
            </tr>
            <tr style="border-top: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">Date &amp; Time</td>
              <td style="padding: 8px 0;">${formattedDateTime}</td>
            </tr>
          </table>
        </div>
        <div style="background: #f8fafc; padding: 12px 24px; font-size: 12px; color: #94a3b8;
                    border-top: 1px solid #e2e8f0;">
          This is an automated reminder from your Real Estate CRM.
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[EmailService] Reminder email sent to ${toEmail} — "${title}"`);
};

module.exports = { sendReminderEmail };
