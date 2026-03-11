const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "200kb" }));

const PORT = Number(process.env.PORT || 3000);
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "true") === "true";
const SMTP_USER = (process.env.SMTP_USER || "").trim();
const SMTP_PASS = (process.env.SMTP_PASS || "").replace(/\s+/g, "").trim();
const MAIL_FROM = (process.env.MAIL_FROM || "").trim() || SMTP_USER;

function required(name, value) {
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[char] || char;
  });
}

function buildTransferMessage(data) {
  return [
    "Cher client,",
    "",
    `Nous vous informons qu'un virement de ${data.amount} a ete credite sur votre compte le ${data.transfer_date} a ${data.transfer_time}.`,
    "",
    `Emetteur : ${data.sender_name}`,
    `RIB de l'emetteur : ${data.sender_rib}`,
    "",
    `Reference : ${data.reference}`,
    "",
    "Merci de votre confiance.",
    "LCL-BANQUE"
  ].join("\n");
}

function buildTransferHtml(data) {
  const amount = escapeHtml(data.amount);
  const transferDate = escapeHtml(data.transfer_date);
  const transferTime = escapeHtml(data.transfer_time);
  const senderName = escapeHtml(data.sender_name);
  const senderRib = escapeHtml(data.sender_rib);
  const reference = escapeHtml(data.reference);

  return `
  <!doctype html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Notification de virement</title>
    </head>
    <body style="margin:0;padding:0;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f3f7fb;padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #dbe3ee;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="background:#0f3d8a;padding:18px 24px;color:#ffffff;">
                  <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.88;">LCL-BANQUE</div>
                  <div style="font-size:22px;line-height:1.25;font-weight:700;margin-top:6px;">Notification de virement credite</div>
                </td>
              </tr>

              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;">Cher client,</p>
                  <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;">
                    Nous vous informons qu'un virement de
                    <strong style="color:#0f3d8a;">${amount}</strong>
                    a ete credite sur votre compte le
                    <strong>${transferDate}</strong>
                    a
                    <strong>${transferTime}</strong>.
                  </p>

                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8fbff;border:1px solid #d7e4f5;border-radius:10px;">
                    <tr>
                      <td style="padding:14px 16px 8px 16px;font-size:12px;color:#5b6b86;text-transform:uppercase;letter-spacing:.06em;">Details de l'operation</td>
                    </tr>
                    <tr>
                      <td style="padding:0 16px 16px 16px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="padding:6px 0;font-size:14px;color:#5b6b86;width:38%;">Emetteur</td>
                            <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${senderName}</td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;font-size:14px;color:#5b6b86;">RIB de l'emetteur</td>
                            <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${senderRib}</td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;font-size:14px;color:#5b6b86;">Reference</td>
                            <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:700;">${reference}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:22px 0 0 0;font-size:15px;line-height:1.6;">Merci de votre confiance.</p>
                  <p style="margin:4px 0 0 0;font-size:15px;line-height:1.6;font-weight:700;color:#0f3d8a;">LCL-BANQUE</p>
                </td>
              </tr>

              <tr>
                <td style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e5eaf1;font-size:12px;color:#6b7280;line-height:1.5;">
                  Ceci est un message automatique. Merci de ne pas y repondre.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function createTransporter() {
  required("SMTP_HOST", SMTP_HOST);
  required("SMTP_USER", SMTP_USER);
  required("SMTP_PASS", SMTP_PASS);

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

app.get("/health", (req, res) => {
  res.json({ success: true, service: "mailer", port: PORT });
});

app.post("/api/transfer-notify", async (req, res) => {
  try {
    const {
      to_email,
      amount,
      transfer_date,
      transfer_time,
      sender_name,
      sender_rib,
      reference
    } = req.body || {};

    if (!to_email || !amount || !transfer_date || !transfer_time || !sender_name || !sender_rib || !reference) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const transporter = createTransporter();
    const text = buildTransferMessage({
      amount,
      transfer_date,
      transfer_time,
      sender_name,
      sender_rib,
      reference
    });
    const html = buildTransferHtml({
      amount,
      transfer_date,
      transfer_time,
      sender_name,
      sender_rib,
      reference
    });

    const info = await transporter.sendMail({
      // Gmail is stricter when From differs from authenticated account.
      from: MAIL_FROM,
      to: to_email,
      subject: `Notification de virement ${reference}`,
      text,
      html
    });

    return res.json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error("Transfer email error:", error);
    return res.status(500).json({
      success: false,
      message: error && error.message ? error.message : "Email send failed"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Mailer API running on http://localhost:${PORT}`);
});
