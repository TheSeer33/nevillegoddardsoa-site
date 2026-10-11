import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function cleanText(value, max = 250) {
  return String(value || "").trim().slice(0, max);
}

function cleanEmail(value) {
  return cleanText(value, 320).toLowerCase();
}

function stripeSecret() {
  return globalThis.Netlify?.env?.get?.("STRIPE_SECRET_KEY") || process.env.STRIPE_SECRET_KEY || "";
}

function satsProtocolCheckoutEnabled() {
  return (globalThis.Netlify?.env?.get?.("SATS_PROTOCOL_CHECKOUT_ENABLED") || process.env.SATS_PROTOCOL_CHECKOUT_ENABLED || "") === "true";
}

function originFromRequest(req) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function products() {
  return [
    {
      id: "sats-protocol-guide",
      title: "SATS Protocol Guide",
      category: "Neville SOA",
      audience: "Neville Goddard students who need a simple nightly practice",
      price: 27,
      promise: "A clear SATS protocol for choosing a scene, relaxing the body, and making nightly practice repeatable.",
      filename: "sats-protocol-guide.pdf",
      requireExactDelivery: true,
    },
    {
      id: "sats-30-day-workbook-bundle",
      title: "SATS + 30-Day Workbook Bundle",
      category: "Neville SOA",
      audience: "Students who want a daily practice system instead of restarting every week",
      price: 47,
      promise: "A structured 30-day practice path for assumption, revision, self-concept, and SATS consistency.",
      filename: "30-day-self-concept-operating-system.pdf",
    },
    {
      id: "manifest-money-now",
      title: "Manifest Money Now",
      category: "Neville SOA",
      audience: "Neville Goddard students who need a grounded money-assumption routine",
      price: 37,
      promise: "A calmer money-state practice that reduces urgency and supports responsible next actions.",
      filename: "money-panic-reset.pdf",
    },
    {
      id: "sats-tonight",
      title: "SATS Tonight",
      category: "Neville SOA",
      audience: "Neville Goddard students who want a simple before-sleep practice without overthinking",
      price: 7,
      promise: "Use a 20-minute reset to choose one scene, relax the body, and enter sleep with a calmer assumption tonight.",
      filename: "sats-tonight.pdf",
    },
    {
      id: "stop-checking",
      title: "Stop Checking",
      category: "Neville SOA",
      audience: "Manifestation students who keep checking the outside world and feeding the old story",
      price: 7,
      promise: "Run a 24-hour no-checking practice that redirects attention from proof hunting back to the chosen state.",
      filename: "stop-checking.pdf",
    },
    {
      id: "self-concept-first-aid",
      title: "Self-Concept First Aid",
      category: "Neville SOA",
      audience: "People who feel triggered, rejected, behind, or pulled back into an old identity",
      price: 9,
      promise: "Reset the inner conversation with a fast identity repair worksheet, calming prompts, and a next-action script.",
      filename: "self-concept-first-aid.pdf",
    },
    {
      id: "money-panic-reset",
      title: "Money Panic Reset",
      category: "Neville SOA",
      audience: "Neville Goddard students who spiral around bills, urgency, comparison, or financial fear",
      price: 9,
      promise: "Calm the body, name the assumption underneath the panic, return to a cleaner money identity, and choose one responsible next action.",
      filename: "money-panic-reset.pdf",
    },
    {
      id: "self-concept-reset-os",
      title: "Self-Concept Reset OS",
      category: "Neville SOA",
      audience: "Students who need self-concept translated into daily identity repair",
      price: 47,
      promise: "A structured 7-day identity reset and 30-day maintenance system.",
      deliveryFile: "delivery/self-concept-reset-os.html",
    },
    {
      id: "30-day-assumption-practice-system",
      title: "30-Day Assumption Practice System",
      category: "Neville SOA",
      audience: "Students who get inspired but lose daily consistency",
      price: 47,
      promise: "A day-by-day implementation plan for assumption, revision, SATS, and self-concept.",
      deliveryFile: "delivery/30-day-assumption-practice-system.html",
    },
    {
      id: "sats-night-practice-experience-pack",
      title: "SATS Night Practice Experience Pack",
      category: "Neville SOA",
      audience: "Students who want guided scripts and night-practice structure",
      price: 37,
      promise: "Seven guided night-practice scripts and production notes for audio or video practice.",
      deliveryFile: "delivery/sats-night-practice-experience-pack.html",
    },
    {
      id: "money-assumption-visualization-pack",
      title: "Money Assumption Visualization Pack",
      category: "Neville SOA",
      audience: "Students who want grounded visualization scripts for money-state practice",
      price: 37,
      promise: "Five money visualization scripts plus journal prompts for a calmer money identity.",
      deliveryFile: "delivery/money-assumption-visualization-pack.html",
    },
    {
      id: "neville-practice-vault",
      title: "Neville Practice Vault",
      category: "Neville SOA",
      audience: "Students who want the complete Neville SOA practice library",
      price: 97,
      promise: "The complete current Neville SOA practice library in one structured path.",
      deliveryFile: "delivery/neville-practice-vault.html",
    },
  ];
}

function findProduct(id) {
  return products().find((product) => product.id === id);
}

function isCheckoutEnabled(product) {
  return product.id !== "sats-protocol-guide" || satsProtocolCheckoutEnabled();
}

function methodNotAllowed() {
  return json(405, { error: "Method not allowed." });
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

function fallbackWorkbook(product) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(product.title)}</title>
  <style>
    body{font:16px/1.65 Inter,Arial,sans-serif;color:#111;max-width:840px;margin:0 auto;padding:48px 24px}
    header{border-bottom:4px solid #c8a97e;margin-bottom:30px;padding-bottom:20px}
    h1{font-size:40px;line-height:1.05;margin:0 0 12px} h2{font-size:22px;margin-top:30px}
    li{margin:8px 0}.note{background:#fff7e8;border-left:4px solid #c8a97e;padding:16px;margin-top:28px}
    @media print{body{padding:0}}
  </style>
</head>
<body>
  <header>
    <p>NEVILLE GODDARD SOA / INSTANT DOWNLOAD</p>
    <h1>${escapeHtml(product.title)}</h1>
    <p>${escapeHtml(product.promise)}</p>
  </header>
  <h2>Start Tonight</h2>
  <ul>
    <li>Choose one desire and one short scene that implies it is already natural.</li>
    <li>Relax the body before trying to impress the state.</li>
    <li>Make the scene ordinary, not theatrical.</li>
    <li>Stop checking for proof for the next 24 hours.</li>
    <li>Return to the chosen identity when the old reaction appears.</li>
  </ul>
  <h2>Seven-Day Practice</h2>
  <ul>
    <li>Day 1: write the old assumption and the chosen assumption.</li>
    <li>Day 2: build the scene in one sentence.</li>
    <li>Day 3: practice before sleep without forcing intensity.</li>
    <li>Day 4: revise one reaction from the day.</li>
    <li>Day 5: notice where you keep looking for proof.</li>
    <li>Day 6: return to the feeling of normalcy.</li>
    <li>Day 7: review what changed in your reactions and repeat.</li>
  </ul>
  <div class="note">Educational reflection material. No financial, medical, legal, relationship, or personal outcome is guaranteed.</div>
</body>
</html>`;
}

function pdfSearchPaths(filename) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return [
    path.join(here, "../../entry-ebooks/pdf", filename),
    path.join(here, "../../../entry-ebooks/pdf", filename),
    path.join(process.cwd(), "entry-ebooks/pdf", filename),
    path.join(process.cwd(), "neville-soa-launch/entry-ebooks/pdf", filename),
    path.join("/var/task/entry-ebooks/pdf", filename),
  ];
}

function deliverySearchPaths(filename) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return [
    path.join(here, "../..", filename),
    path.join(here, "../../..", filename),
    path.join(process.cwd(), filename),
    path.join(process.cwd(), "neville-soa-launch", filename),
    path.join("/var/task", filename),
  ];
}

function deliverProduct(product) {
  if (product.deliveryFile) {
    for (const candidate of deliverySearchPaths(product.deliveryFile)) {
      if (fs.existsSync(candidate)) {
        return new Response(fs.readFileSync(candidate), {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="${product.id}.html"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }
  }

  for (const candidate of pdfSearchPaths(product.filename)) {
    if (fs.existsSync(candidate)) {
      return new Response(fs.readFileSync(candidate), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${product.filename}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  }

  if (product.requireExactDelivery) {
    return new Response("This product is temporarily unavailable while its delivery file is being verified.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return new Response(fallbackWorkbook(product), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${product.id}-workbook.html"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function getPaidSession(sessionId) {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${stripeSecret()}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Stripe session could not be verified.");
  return data;
}

async function createCheckoutSession(req, product, email, returnPath) {
  const origin = originFromRequest(req);
  const cancelPath = returnPath && returnPath.startsWith("/") ? returnPath : "/";
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${origin}${cancelPath}?checkout=cancelled&product=${encodeURIComponent(product.id)}`);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(product.price * 100));
  params.set("line_items[0][price_data][product_data][name]", product.title);
  params.set("line_items[0][price_data][product_data][description]", product.promise);
  params.set("metadata[product_id]", product.id);
  params.set("metadata[product]", product.id);
  params.set("metadata[source]", "neville_soa_instant_ebook");
  params.set("allow_promotion_codes", "true");
  params.set("billing_address_collection", "auto");
  if (email) params.set("customer_email", email);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecret()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Stripe checkout session could not be created.");
  return data;
}

function hasExactDelivery(product) {
  if (!product.requireExactDelivery) return true;
  return pdfSearchPaths(product.filename).some((candidate) => fs.existsSync(candidate));
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const sessionId = cleanText(url.searchParams.get("session_id"), 160);
      if (!sessionId) return json(200, { products: products().map(({ filename, ...product }) => product) });
      if (!sessionId.startsWith("cs_")) return json(400, { error: "Invalid session." });
      if (!stripeSecret()) return new Response("Delivery is not configured.", { status: 503 });

      const session = await getPaidSession(sessionId);
      const productId = cleanText(session.metadata?.product_id || session.metadata?.product, 100);
      const product = findProduct(productId);
      if (session.payment_status !== "paid" || !product) {
        return new Response("A completed payment could not be verified.", { status: 403 });
      }
      if (cleanText(url.searchParams.get("status"), 10) === "1") {
        return json(200, {
          paid: true,
          productId: product.id,
          title: product.title,
          amount: session.amount_total,
          currency: session.currency,
        });
      }
      return deliverProduct(product);
    }

    if (req.method !== "POST") return methodNotAllowed();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json(400, { error: "Request body must be valid JSON." });

    const productId = cleanText(body.productId, 100);
    const email = cleanEmail(body.email);
    const product = findProduct(productId);
    if (!product) return json(400, { error: "Unknown digital product." });
    if (!hasExactDelivery(product)) {
      return json(503, {
        error: "This product is temporarily unavailable while its delivery file is being verified.",
      });
    }
    if (!isCheckoutEnabled(product)) {
      return json(503, {
        error: "The SATS Protocol checkout remains disabled until genuine paid fulfillment is verified.",
      });
    }
    if (!stripeSecret()) return json(500, { error: "Stripe is not configured." });

    const session = await createCheckoutSession(req, product, email, cleanText(body.returnPath, 120));
    return json(200, { url: session.url, id: session.id });
  } catch (error) {
    return json(500, { error: error.message || "Checkout is unavailable." });
  }
}

export const config = {
  path: "/api/digital-product-checkout",
};
