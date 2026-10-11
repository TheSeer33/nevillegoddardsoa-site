import fs from "node:fs";
import net from "node:net";
import tls from "node:tls";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  });
}

function clean(value, max = 250) {
  return String(value || "").trim().slice(0, max);
}

function cleanEmail(value) {
  return clean(value, 320).toLowerCase();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

const GUIDES = {
  money: {
    title: "Money SATS Reset",
    subtitle: "A calm nightly practice for urgency, bills, comparison, and financial fear.",
    paidStep: "Manifest Money Now",
    paidUrl: "https://buy.stripe.com/aFa7sLgrT87HfXU8lH8IU08",
    steps: [
      "Name the money fear without making it your identity.",
      "Choose one scene that implies financial steadiness, not fantasy pressure.",
      "Relax the body before repeating the scene.",
      "Fall asleep as the version of you who handles money calmly and responsibly.",
      "Take one grounded next action tomorrow without checking for proof.",
    ],
  },
  relationships: {
    title: "Relationships and Specific Person SATS Reset",
    subtitle: "A self-respecting practice for love, connection, and inner stability.",
    paidStep: "Neville Practice Vault",
    paidUrl: "https://buy.stripe.com/00w4gz7Vnds18vs7hD8IU25",
    steps: [
      "Begin with your self-concept, not control of another person.",
      "Choose a scene that implies mutual respect, warmth, and emotional safety.",
      "Keep the scene short and natural.",
      "Release the urge to monitor, chase, or force reassurance.",
      "Return to being chosen, calm, and whole during the day.",
    ],
  },
  health: {
    title: "Health and Perfect Body SATS Reset",
    subtitle: "A gentle Neville-inspired routine for body trust, identity, and daily care.",
    paidStep: "30-Day Assumption Practice System",
    paidUrl: "https://buy.stripe.com/7sY7sL3F7ew5dPM59v8IU27",
    steps: [
      "Choose an identity of care, steadiness, and respect for the body.",
      "Use a scene that implies confidence and daily consistency.",
      "Avoid fighting the body or making fear the center of the practice.",
      "Pair assumption with responsible real-world care.",
      "Repeat nightly without turning the practice into pressure.",
    ],
  },
  selfConcept: {
    title: "Self-Concept SATS Reset",
    subtitle: "A fast identity reset for feeling behind, rejected, triggered, or unseen.",
    paidStep: "Self-Concept Reset OS",
    paidUrl: "https://buy.stripe.com/eVqaEX3F79bL3b81Xj8IU26",
    steps: [
      "Write the old identity in one honest sentence.",
      "Write the chosen identity in one simple sentence.",
      "Build one ordinary scene where that identity is already normal.",
      "Enter SATS gently and repeat the scene without forcing emotion.",
      "Practice from the new identity in one small action tomorrow.",
    ],
  },
};

function guideHtml(guide, name = "") {
  const firstName = clean(name, 80).split(/\s+/)[0] || "Friend";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(guide.title)}</title>
  <style>
    body{font:16px/1.65 Inter,Arial,sans-serif;color:#151515;max-width:820px;margin:0 auto;padding:44px 24px;background:#fffaf0}
    header{border-bottom:4px solid #d9a441;margin-bottom:28px;padding-bottom:22px}
    h1{font:42px/1 Georgia,serif;margin:0 0 10px} h2{font-size:22px;margin-top:28px}
    li{margin:10px 0}.box{background:#fff;border:1px solid #ead9b7;padding:18px;margin:22px 0}
    a{color:#704b00;font-weight:800}@media print{body{background:#fff;padding:0}}
  </style>
</head>
<body>
  <header>
    <p>NEVILLE GODDARD SOA / FREE SATS GUIDE</p>
    <h1>${escapeHtml(guide.title)}</h1>
    <p>${escapeHtml(guide.subtitle)}</p>
  </header>
  <p>${escapeHtml(firstName)}, use this tonight. Keep it simple. The win is not intensity; the win is returning to the chosen state with less effort.</p>
  <h2>Five-step SATS practice</h2>
  <ol>${guide.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
  <div class="box">
    <h2>Tonight's one-scene builder</h2>
    <p>After this desire is already normal, what ordinary moment would happen?</p>
    <p>Who would you be? What would you hear? What would feel settled?</p>
    <p>Write one sentence. Repeat only that scene before sleep.</p>
  </div>
  <h2>Next step</h2>
  <p>If this helped and you want the deeper paid system, continue with <a href="${guide.paidUrl}">${escapeHtml(guide.paidStep)}</a>.</p>
  <p><small>Educational reflection material only. No financial, medical, legal, relationship, psychological, or personal outcome is guaranteed.</small></p>
</body>
</html>`;
}

function smtpConfig() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || "nevillegoddard22@gmail.com";
  return {
    host: process.env.SMTP_HOST || (user.endsWith("@gmail.com") ? "smtp.gmail.com" : "mail.privateemail.com"),
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") !== "false",
    user,
    pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "",
    from: process.env.FROM_EMAIL || user,
    notify: process.env.LEAD_NOTIFY_EMAIL || user,
  };
}

function encodeAddress(email, label = "") {
  const safeEmail = cleanEmail(email);
  const safeLabel = clean(label, 80).replace(/[\\r\\n"]/g, "");
  return safeLabel ? `"${safeLabel}" <${safeEmail}>` : safeEmail;
}

function readLine(socket) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.trimEnd().split(/\r?\n/);
      const last = lines[lines.length - 1] || "";
      if (!/^\d{3}\s/.test(last)) return;
      socket.off("data", onData);
      resolve(last);
    };
    socket.on("data", onData);
    socket.once("error", reject);
  });
}

async function command(socket, line, accepted = ["2", "3"]) {
  if (line) socket.write(`${line}\r\n`);
  const response = await readLine(socket);
  if (!accepted.some((code) => response.startsWith(code))) throw new Error(`SMTP rejected ${line || "connect"}`);
  return response;
}

async function sendSmtp({ to, subject, html, text }) {
  const cfg = smtpConfig();
  if (!cfg.pass) return { sent: false, reason: "smtp_not_configured" };

  const socket = cfg.secure
    ? tls.connect({ host: cfg.host, port: cfg.port, servername: cfg.host })
    : net.connect({ host: cfg.host, port: cfg.port });

  await command(socket, "");
  await command(socket, `EHLO ${cfg.host}`);
  if (!cfg.secure) {
    await command(socket, "STARTTLS");
    throw new Error("STARTTLS SMTP is not supported by this lightweight sender. Use SMTP_SECURE=true on port 465.");
  }
  await command(socket, "AUTH LOGIN", ["3"]);
  await command(socket, Buffer.from(cfg.user).toString("base64"), ["3"]);
  await command(socket, Buffer.from(cfg.pass).toString("base64"));
  await command(socket, `MAIL FROM:<${cfg.from}>`);
  await command(socket, `RCPT TO:<${to}>`);
  await command(socket, "DATA", ["3"]);

  const message = [
    `From: ${encodeAddress(cfg.from, "Neville Goddard SOA")}`,
    `To: ${encodeAddress(to)}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "List-Unsubscribe: <mailto:nevillegoddard22@gmail.com?subject=unsubscribe>",
    "",
    html || `<pre>${escapeHtml(text)}</pre>`,
  ].join("\r\n");
  socket.write(`${message}\r\n.\r\n`);
  await command(socket, "");
  await command(socket, "QUIT");
  socket.end();
  return { sent: true };
}

function linksForOrigin(origin, name = "") {
  const encodedName = encodeURIComponent(name);
  return Object.entries(GUIDES).map(([id, guide]) => ({
    id,
    title: guide.title,
    url: `${origin}/api/free-sats-guide?guide=${encodeURIComponent(id)}&name=${encodedName}`,
  }));
}

function selectedLinkForOrigin(origin, guideId, name = "") {
  const id = GUIDES[guideId] ? guideId : "selfConcept";
  const encodedName = encodeURIComponent(name);
  return {
    id,
    title: GUIDES[id].title,
    url: `${origin}/api/free-sats-guide?guide=${encodeURIComponent(id)}&name=${encodedName}`,
  };
}

async function notifyLead({ name, email, origin, selectedGuide }) {
  const cfg = smtpConfig();
  if (!cfg.pass) return { sent: false, reason: "smtp_not_configured" };
  const html = `<p>New Neville SOA free SATS guide request.</p>
  <ul>
    <li>Name: ${escapeHtml(name)}</li>
    <li>Email: ${escapeHtml(email)}</li>
    <li>Selected guide: ${escapeHtml(selectedGuide)}</li>
    <li>Source: ${escapeHtml(origin)}</li>
  </ul>`;
  return sendSmtp({ to: cfg.notify, subject: "New Neville SOA free SATS guide lead", html });
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const origin = `${url.protocol}//${url.host}`;

    if (req.method === "GET") {
      const guideId = clean(url.searchParams.get("guide"), 40) || "selfConcept";
      const guide = GUIDES[guideId] || GUIDES.selfConcept;
      return new Response(guideHtml(guide, url.searchParams.get("name")), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${guideId}-free-sats-guide.html"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (req.method !== "POST") return json(405, { error: "Method not allowed." });
    const body = await req.json().catch(() => ({}));
    const name = clean(body.name, 120);
    const email = cleanEmail(body.email);
    const selectedGuide = clean(body.guide, 40) || "selfConcept";
    const consent = Boolean(body.consent);

    if (!name || !email.includes("@")) return json(400, { error: "Name and valid email are required." });
    if (!consent) return json(400, { error: "Consent is required so we can send the guide." });

    const link = selectedLinkForOrigin(origin, selectedGuide, name);
    const html = `<p>${escapeHtml(name)}, here is your free Neville Goddard SOA SATS guide.</p>
      <p>Use this tonight. Keep the practice simple and repeatable.</p>
      <p><a href="${link.url}">${escapeHtml(link.title)}</a></p>
      <p>When you are ready for the deeper paid system, start here: <a href="https://amzn.to/4yCD7ae">Neville Goddard SOA books and resources</a>.</p>
      <p><small>Educational reflection material only. No outcome is guaranteed.</small></p>`;

    const emailDelivery = await sendSmtp({ to: email, subject: `Your free ${link.title} guide`, html });
    const leadNotice = await notifyLead({ name, email, origin, selectedGuide });

    return json(200, {
      ok: true,
      emailDelivery,
      leadNotice,
      downloads: [link],
      message: emailDelivery.sent
        ? "Your guide is on its way and ready below."
        : "Your guide is ready below.",
    });
  } catch (error) {
    return json(500, { error: error.message || "Guide delivery failed." });
  }
}

export const config = {
  path: "/api/free-sats-guide",
};
