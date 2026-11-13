import { Pool, neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";
import { betterAuth } from "better-auth";

neonConfig.webSocketConstructor = WebSocket;

const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "APP_URL", "RESEND_API_KEY", "EMAIL_FROM"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

async function sendTransactionalEmail({ to, subject, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Transactional email provider rejected a message:", response.status, detail.slice(0, 500));
    throw new Error("We could not send the account email. Please try again later.");
  }
}

async function sendAccountLink({ user, url, subject, heading, explanation }) {
  const safeName = escapeHtml(user.name || "Customer");
  const safeUrl = escapeHtml(url);
  await sendTransactionalEmail({
    to: user.email,
    subject,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#222;line-height:1.6"><h2>${heading}</h2><p>Hello ${safeName},</p><p>${explanation}</p><p><a href="${safeUrl}" style="display:inline-block;background:#2874ed;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px">Continue</a></p><p>If you did not request this, you can ignore this email.</p></body></html>`
  });
}

export const auth = betterAuth({
  appName: "Flipkart Store",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  trustedOrigins: [process.env.APP_URL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => sendAccountLink({
      user, url,
      subject: "Reset your store password",
      heading: "Password reset",
      explanation: "We received a request to reset your store account password. This link expires after one hour."
    })
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => sendAccountLink({
      user, url,
      subject: "Verify your store email",
      heading: "Verify your email address",
      explanation: "Please verify your email address to activate your customer account. This link expires after one hour."
    })
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10
  },
  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: {
      httpOnly: true,
      secure: true,
      sameSite: "lax"
    }
  }
});
