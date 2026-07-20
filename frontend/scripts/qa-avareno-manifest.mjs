/* Avareno Design-Manifest V1 — visual + accessibility QA.
 *
 * Verifies the final Soft White + Mantis + Graphite product design against
 * docs/design/AVARENO_DESIGN_MANIFESTO_V1.md on a production preview.
 *
 * Expected frontend: http://127.0.0.1:4174 (override QA_BASE)
 * Build with:
 *   VITE_AUTH_PROVIDER=mock VITE_API_ORIGIN=http://127.0.0.1:4010 npm run build -w frontend
 *
 * All /api requests are intercepted in the browser with synthetic fixtures;
 * no backend is contacted and no data is written anywhere.
 */
import { chromium, firefox, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:4174";
const API = process.env.QA_API ?? "http://127.0.0.1:4010";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/design/qa-avareno-manifest-v1");
mkdirSync(OUT, { recursive: true });

const failures = [];
const consoleErrors = [];

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

/* ── Fixtures (synthetic, browser-side only) ─────────────────── */

const qaProfile = {
  id: "manifest_qa_user",
  authUserId: "manifest_qa_user",
  displayName: "Stefan QA",
  email: "manifest-qa@example.com",
  authProvider: "email",
  createdAt: "2026-06-01T08:00:00.000Z",
  updatedAt: "2026-07-18T08:00:00.000Z",
  emailVerified: true,
  onboardingCompleted: true,
  motivationEnabled: false,
  leaderboardEnabled: false,
  privateProfile: true,
  onboardingInterests: [],
  weeklyXp: 0,
  totalXp: 0,
  currentStreakDays: 0,
  longestStreakDays: 0,
  freezeDaysAvailable: 0
};

const qaUser = { id: "manifest_qa_user", name: "Stefan QA", email: "manifest-qa@example.com", xp: 0, level: 1 };
const activation = {
  onboardingCompletedAt: "2026-06-01T08:00:00.000Z",
  onboardingDismissedAt: null,
  activationA: true,
  activationB: true,
  itemCount: 4,
  linkedDocumentCount: 4,
  nextPath: "/app"
};

const productImage = `data:image/svg+xml;base64,${Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e2e8dd"/><stop offset="1" stop-color="#f4f6f1"/></linearGradient></defs>
    <rect width="240" height="240" rx="28" fill="url(#g)"/>
    <rect x="57" y="46" width="126" height="130" rx="20" fill="#313a34"/>
    <rect x="72" y="61" width="96" height="45" rx="10" fill="#f9f9f2"/>
    <circle cx="95" cy="83" r="9" fill="#59c749"/>
    <path d="M88 124h64v31a22 22 0 0 1-22 22h-20a22 22 0 0 1-22-22z" fill="#f9f9f2"/>
    <rect x="43" y="176" width="154" height="13" rx="6.5" fill="#657169"/>
  </svg>
`).toString("base64")}`;

function doc(id, type, fileName, size, createdAt = "2026-07-16T10:30:00.000Z") {
  return { id, type, fileName, filePath: `/uploads/${fileName}`, mimeType: "application/pdf", fileSize: size, createdAt, updatedAt: createdAt };
}

function item(overrides) {
  return {
    id: overrides.id,
    name: overrides.name,
    itemType: overrides.itemType ?? "THING",
    category: overrides.category ?? "Sonstiges",
    manufacturer: overrides.manufacturer ?? null,
    model: overrides.model ?? null,
    serialNumber: overrides.serialNumber ?? null,
    barcode: null,
    purchaseDate: overrides.purchaseDate ?? null,
    merchant: overrides.merchant ?? null,
    price: overrides.price ?? null,
    currency: "EUR",
    imageUrl: overrides.imageUrl ?? null,
    warrantyUntil: overrides.warrantyUntil ?? null,
    location: overrides.location ?? null,
    notes: null,
    manualUrl: null,
    driverUrl: null,
    softwareUrl: null,
    supportUrl: null,
    supportContact: null,
    visibility: "PRIVATE",
    completenessScore: overrides.completenessScore ?? 0,
    status: "ACTIVE",
    household: null,
    space: null,
    activities: overrides.activities ?? [],
    documents: overrides.documents ?? [],
    repairLogs: [],
    loops: [],
    reminders: [],
    missingFields: overrides.missingFields ?? []
  };
}

const inSixWeeks = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString();

const standardItems = [
  item({
    id: "coffee-pro",
    name: "Philips LatteGo 5400",
    category: "Kaffeemaschine",
    manufacturer: "Philips",
    model: "EP5447/90",
    purchaseDate: "2025-08-03T10:00:00.000Z",
    merchant: "MediaMarkt",
    price: 679,
    imageUrl: productImage,
    warrantyUntil: inSixWeeks,
    location: "Küche",
    completenessScore: 82,
    documents: [
      doc("coffee-receipt", "RECEIPT", "rechnung-philips-lattego.pdf", 348220, "2026-07-17T12:00:00.000Z"),
      doc("coffee-warranty", "WARRANTY", "garantie-lattego.pdf", 184320, "2026-07-15T09:00:00.000Z")
    ],
    missingFields: ["serial number"]
  }),
  item({
    id: "oled-tv",
    name: "LG OLED C3 55 Zoll",
    itemType: "ELECTRONIC",
    category: "Fernseher",
    manufacturer: "LG",
    model: "OLED55C39LC",
    serialNumber: "LG-QA-5519",
    warrantyUntil: "2028-04-12T10:00:00.000Z",
    location: "Wohnzimmer",
    completenessScore: 66,
    documents: [doc("oled-manual", "MANUAL", "bedienungsanleitung-lg-oled.pdf", 2841020, "2026-07-14T08:00:00.000Z")],
    missingFields: ["receipt", "purchase data", "support contact"]
  }),
  item({
    id: "bosch-drill",
    name: "Bosch Professional Akku-Bohrschrauber",
    category: "Werkzeug",
    manufacturer: "Bosch Professional",
    model: "GSR 18V-55",
    purchaseDate: "2026-03-02T10:00:00.000Z",
    merchant: "Bauhaus",
    price: 219,
    location: "Werkstatt",
    completenessScore: 58,
    documents: [doc("drill-receipt", "RECEIPT", "bauhaus-beleg-bohrschrauber.pdf", 98240, "2026-07-12T08:00:00.000Z")],
    missingFields: ["warranty date", "serial number", "manual"]
  }),
  item({
    id: "washer",
    name: "Miele Waschmaschine W1",
    category: "Haushaltsgerät Waschmaschine",
    manufacturer: "Miele",
    model: "WCA 030 WCS",
    location: "Waschküche",
    completenessScore: 25,
    documents: [],
    missingFields: ["receipt", "warranty date", "serial number", "manual", "purchase data"]
  })
];

const detailItem = {
  ...standardItems[0],
  activities: [{ id: "act-1", type: "CREATED", message: "Item profile created.", createdAt: "2026-06-04T10:00:00.000Z" }]
};

const longNameItems = [
  item({
    ...standardItems[0],
    id: "long-product",
    name: "Kaffeevollautomat mit besonders langem Produktnamen für die gemeinsame Küche im oberen Stockwerk",
    manufacturer: "Philips Domestic Appliances International",
    model: "LatteGo Premium Series EP5447/90 Sonderedition",
    documents: standardItems[0].documents,
    missingFields: ["serial number"]
  })
];

const manyItems = Array.from({ length: 18 }, (_, index) => {
  const source = standardItems[index % standardItems.length];
  return {
    ...source,
    id: `many-${index + 1}`,
    name: index < standardItems.length ? source.name : `${source.name} ${index + 1}`,
    documents: (source.documents ?? []).map((entry) => ({ ...entry, id: `${entry.id}-${index + 1}` }))
  };
});

const binder = {
  generatedAt: "2026-07-18T09:00:00.000Z",
  household: null,
  summary: { itemCount: 4, totalValue: 898, protectedCount: 2, readiness: 58, missingDataPoints: 9 },
  spaces: [
    { name: "Küche", itemCount: 1, value: 679 },
    { name: "Wohnzimmer", itemCount: 1, value: 0 },
    { name: "Werkstatt", itemCount: 1, value: 219 }
  ],
  items: standardItems.map((entry) => ({
    ...entry,
    binderStatus: {
      hasProof: entry.documents.some((d) => d.type === "RECEIPT"),
      warrantyActive: Boolean(entry.warrantyUntil),
      warrantySoon: entry.id === "coffee-pro",
      insuranceReady: entry.completenessScore >= 80
    }
  })),
  wow: { label: "Home Binder", promise: "Alle Unterlagen an einem Ort" }
};

/* ── Setup helpers ───────────────────────────────────────────── */

async function installRoutes(page, state) {
  await page.route(`${API}/api/items`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(state.items) }));
  await page.route(new RegExp(`${API.replace(/[/\\.:]/g, "\\$&")}/api/items/[^/]+$`), (route) => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split("/").pop());
    const found = state.items.find((entry) => entry.id === id) ?? (detailItem.id === id ? detailItem : null);
    if (!found) return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(id === detailItem.id ? detailItem : found) });
  });
  await page.route(`${API}/api/me`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaUser) }));
  await page.route(new RegExp(`${API.replace(/[/\\.:]/g, "\\$&")}/api/me/activity.*`), (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ rangeDays: 90, days: [], totalActions: 0, activeDays: 0, currentStreakDays: 0, longestStreakDays: 0, byType: { productsCreated: 0, documentsSaved: 0, remindersCompleted: 0, detailsAdded: 0 } })
  }));
  await page.route(`${API}/api/me/activation`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...activation, itemCount: state.items.length }) }));
  await page.route(`${API}/api/structure`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      household: null, spaces: [], members: [], plan: null,
      usage: { items: state.items.length, itemLimit: 50, isLimitReached: false },
      itemTypes: [], captureMethods: [], premiumFeatures: [], wowFeatures: [],
      affiliateProgram: { status: "off", partners: [], rules: [] },
      sharing: { status: "off", roles: [], defaultVisibility: "PRIVATE" },
      smartHome: { status: "off", providers: [] }
    })
  }));
  await page.route(`${API}/api/reports/home-binder`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(binder) }));
  await page.route(`${API}/api/loops`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }));
}

async function preparePage(page, state) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await installRoutes(page, state);
  await page.addInitScript(({ profile }) => {
    localStorage.setItem("avareno-dev-auth-profile", JSON.stringify(profile));
    localStorage.setItem("avareno-language", "de");
    if (!localStorage.getItem("avareno-theme")) localStorage.setItem("avareno-theme", "light");
  }, { profile: qaProfile });
}

async function setTheme(page, theme) {
  await page.evaluate((next) => localStorage.setItem("avareno-theme", next), theme);
}

async function goTo(page, path, waitFor) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  if (waitFor) await page.waitForSelector(waitFor, { state: "visible", timeout: 15000 });
  await page.waitForTimeout(450);
}

async function noOverflow(page, label) {
  const metrics = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  check(`${label}: no horizontal overflow`, metrics.scroll <= metrics.client, `scroll=${metrics.scroll} client=${metrics.client}`);
}

function parseRgb(value) {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  return channels?.length === 3 ? channels : null;
}

function luminance(rgb) {
  const channels = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const high = Math.max(luminance(a), luminance(b));
  const low = Math.min(luminance(a), luminance(b));
  return (high + 0.05) / (low + 0.05);
}

/* ── Main suite (Chromium) ───────────────────────────────────── */

async function runChromium() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const state = { items: standardItems };
  await preparePage(page, state);

  /* Landing (logged-out surface still renders with profile present; hero only) */
  await goTo(page, "/", ".ma-hero");
  const landingBg = await page.evaluate(() => getComputedStyle(document.querySelector(".avareno-landing-main")).backgroundColor);
  check("landing uses soft-white base (no cream)", landingBg === "rgb(247, 248, 245)", landingBg);
  await page.screenshot({ path: `${OUT}/landing-hero-1440.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await noOverflow(page, "landing mobile");
  await page.screenshot({ path: `${OUT}/landing-hero-390.png` });
  await page.setViewportSize({ width: 1440, height: 900 });

  /* Dashboard with data */
  await goTo(page, "/app", ".mem-dashboard");
  check("dashboard greets with one h1", (await page.locator(".mem-dashboard h1").count()) === 1);
  check("archive score ring is visible", await page.locator(".mem-score-card .mem-score-ring").isVisible());
  check("score has explanation text", await page.getByText("Berechnet aus der Vollständigkeit", { exact: false }).isVisible());
  check("warranty overview lists real deadline", await page.locator(".mem-warranty-row").first().isVisible());
  check("no naked percent in summary facts", (await page.locator(".mem-fact-list li").filter({ hasText: /^\d+%$/ }).count()) === 0);
  check("product objects use natural status language", await page.getByText(/wichtige Angaben? fehl|Garantie (bis|endet)|Produktakte vollständig/).first().isVisible());
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check("app light base is soft white", bodyBg === "rgb(247, 248, 245)", bodyBg);

  const summaryColors = await page.evaluate(() => {
    const fact = getComputedStyle(document.querySelector(".mem-fact-list li span"));
    const body = getComputedStyle(document.body);
    const scoreText = getComputedStyle(document.querySelector(".mem-score-copy p"));
    const scoreCard = getComputedStyle(document.querySelector(".mem-score-card"));
    return { fact: fact.color, background: body.backgroundColor, scoreText: scoreText.color, scoreCard: scoreCard.backgroundColor };
  });
  const factContrast = contrast(parseRgb(summaryColors.fact), parseRgb(summaryColors.background));
  const scoreContrast = contrast(parseRgb(summaryColors.scoreText), parseRgb(summaryColors.scoreCard));
  check("summary fact contrast >= 4.5:1", factContrast >= 4.5, factContrast.toFixed(2));
  check("score copy contrast >= 4.5:1", scoreContrast >= 4.5, scoreContrast.toFixed(2));

  const primary = page.locator(".mem-home-head-actions .av-btn-primary");
  await primary.focus();
  const focus = await primary.evaluate((element) => {
    const style = getComputedStyle(element);
    return { focused: document.activeElement === element, width: parseFloat(style.outlineWidth), style: style.outlineStyle, height: Math.round(element.getBoundingClientRect().height) };
  });
  check("primary CTA keyboard focus visible", focus.focused && focus.width >= 2 && focus.style !== "none", JSON.stringify(focus));
  check("primary CTA touch target >= 44px", focus.height >= 44, `height=${focus.height}`);
  await page.screenshot({ path: `${OUT}/dashboard-data-1440.png`, fullPage: true });

  /* Dashboard dark */
  await setTheme(page, "dark");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".mem-dashboard", { state: "visible" });
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check("dark theme base matches manifest", darkBg === "rgb(16, 19, 17)", darkBg);
  await page.screenshot({ path: `${OUT}/dashboard-dark-1440.png`, fullPage: true });
  await setTheme(page, "light");

  /* Dashboard empty state */
  state.items = [];
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".mem-dashboard", { state: "visible" });
  check("empty dashboard explains first action", await page.getByRole("heading", { name: "Noch keine Produkte gespeichert" }).isVisible());
  check("empty dashboard hides score ring", (await page.locator(".mem-score-card").count()) === 0);
  await page.screenshot({ path: `${OUT}/dashboard-empty-1440.png`, fullPage: true });
  state.items = standardItems;

  /* Archive */
  await goTo(page, "/app/dinge", ".av-library");
  check("archive shows product objects (no av-thing tables)", (await page.locator(".av-thing-card").count()) === 0 && (await page.locator(".mem-object-card").count()) === 4);
  check("archive has no naked percent badges", (await page.locator(".mem-object-card").filter({ hasText: /\b\d+%\b/ }).count()) === 0);
  check("archive product image renders", (await page.locator('.mem-object-card img[alt^="Produktbild"]').count()) >= 1);
  await page.screenshot({ path: `${OUT}/archive-1440.png`, fullPage: true });

  const productCardShots = page.locator(".mem-object-card");
  await productCardShots.first().screenshot({ path: `${OUT}/product-object-with-image.png` });
  await productCardShots.nth(1).screenshot({ path: `${OUT}/product-object-placeholder.png` });

  /* Keyboard order on archive */
  await page.keyboard.press("Tab");
  const firstFocus = await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40) ?? "");
  check("archive keyboard focus starts in header area", firstFocus.length > 0, firstFocus);

  /* Product detail */
  await goTo(page, `/app/dinge/${detailItem.id}`, ".av-profile-hero");
  check("detail explains completeness in words", await page.getByText(/Zu \d+ % vollständig/).first().isVisible());
  check("detail has no 'Punkte offen' language", (await page.getByText(/offene? Punkte?/i).count()) === 0);
  check("detail pending values are neutral", await page.getByText("Noch nicht angegeben").first().isVisible());
  check("detail activity is translated", await page.getByText("Produktakte angelegt.", { exact: true }).isVisible());
  check("delete action speaks product language", await page.getByRole("button", { name: /Produktakte löschen/ }).isVisible());
  await page.screenshot({ path: `${OUT}/product-detail-1440.png`, fullPage: true });

  /* Dialog state: delete confirmation (first click only, then cancel) */
  await page.getByRole("button", { name: /Produktakte löschen…/ }).click();
  await page.waitForTimeout(250);
  check("delete confirm offers explicit cancel", await page.getByRole("button", { name: "Abbrechen" }).isVisible());
  await page.screenshot({ path: `${OUT}/dialog-delete-confirm.png`, fullPage: false });
  await page.getByRole("button", { name: "Abbrechen" }).click();

  /* Documents */
  await goTo(page, "/app/reports/home-binder", ".documents-page");
  check("documents keep one dominant title", (await page.locator("main h1").count()) === 1);
  check("documents completeness stays a compact line", await page.getByText(/von \d+ Produkten (besitzt|besitzen) einen Beleg/).isVisible());
  await page.screenshot({ path: `${OUT}/documents-1440.png`, fullPage: true });

  /* Capture */
  await goTo(page, "/app/capture/item", "form, main");
  check("capture keeps a single primary action", (await page.getByRole("button", { name: "Produkt speichern" }).count()) === 1);
  await page.screenshot({ path: `${OUT}/capture-item-1440.png`, fullPage: true });
  await goTo(page, "/app/capture/receipt", "main");
  await page.screenshot({ path: `${OUT}/capture-receipt-1440.png`, fullPage: true });

  /* Settings */
  await goTo(page, "/app/settings", ".account-page");
  check("settings show explicit danger area", await page.getByText("Gefahrenbereich", { exact: true }).isVisible());
  check("settings hide unconfigured providers in beta", (await page.getByText("SMS-Login").count()) === 0);
  await page.screenshot({ path: `${OUT}/settings-1440.png`, fullPage: true });

  /* Login (fresh context without profile) */
  const anonContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const anonPage = await anonContext.newPage();
  await anonPage.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await anonPage.waitForTimeout(400);
  check("login speaks product-record language", await anonPage.getByText("Dein privates Archiv für Produkte, Belege und Garantien.", { exact: false }).isVisible());
  await anonPage.screenshot({ path: `${OUT}/login-1440.png`, fullPage: true });
  await anonContext.close();

  /* Long names, few and many products */
  state.items = longNameItems;
  await page.setViewportSize({ width: 375, height: 812 });
  await goTo(page, "/app", ".mem-dashboard");
  await noOverflow(page, "long product name 375px");
  await page.screenshot({ path: `${OUT}/long-name-375.png`, fullPage: true });

  state.items = manyItems;
  await page.setViewportSize({ width: 1440, height: 900 });
  await goTo(page, "/app/dinge", ".av-library");
  check("archive handles many products", (await page.locator(".mem-object-card").count()) === 18);
  await page.screenshot({ path: `${OUT}/archive-many-1440.png`, fullPage: true });

  state.items = [standardItems[0]];
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check("archive handles a single product", (await page.locator(".mem-object-card").count()) === 1);
  await page.screenshot({ path: `${OUT}/archive-single-1440.png`, fullPage: true });
  state.items = standardItems;

  /* Viewport sweep on dashboard + archive */
  const viewports = [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [1024, 768],
    [768, 1024],
    [430, 932],
    [390, 844],
    [375, 812],
    [320, 568]
  ];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await goTo(page, "/app", ".mem-dashboard");
    await noOverflow(page, `dashboard ${width}x${height}`);
    if ([1920, 768, 390, 320].includes(width)) {
      await page.screenshot({ path: `${OUT}/dashboard-${width}x${height}.png`, fullPage: true });
    }
    await goTo(page, "/app/dinge", ".av-library");
    await noOverflow(page, `archive ${width}x${height}`);
    if ([768, 390].includes(width)) {
      await page.screenshot({ path: `${OUT}/archive-${width}x${height}.png`, fullPage: true });
    }
  }

  /* 200% zoom approximation: halved viewport at 2x device scale */
  const zoomContext = await browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 });
  const zoomPage = await zoomContext.newPage();
  const zoomState = { items: standardItems };
  await preparePage(zoomPage, zoomState);
  await zoomPage.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await zoomPage.waitForSelector(".mem-dashboard", { state: "visible" });
  const zoomMetrics = await zoomPage.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  check("dashboard readable at 200% zoom footprint", zoomMetrics.scroll <= zoomMetrics.client, JSON.stringify(zoomMetrics));
  await zoomContext.close();

  /* Reduced motion */
  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  const reducedState = { items: standardItems };
  await preparePage(reducedPage, reducedState);
  await reducedPage.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await reducedPage.waitForSelector(".mem-dashboard", { state: "visible" });
  const reducedTransition = await reducedPage.evaluate(() => getComputedStyle(document.querySelector(".mem-object-card")).transitionDuration);
  check("reduced motion: product cards static", reducedTransition.split(",").every((duration) => parseFloat(duration) <= 0.001), reducedTransition);
  const ringTransition = await reducedPage.evaluate(() => getComputedStyle(document.querySelector(".mem-score-value")).transitionDuration);
  check("reduced motion: score ring does not animate", ringTransition.split(",").every((duration) => parseFloat(duration) <= 0.001), ringTransition);
  await reducedPage.screenshot({ path: `${OUT}/dashboard-reduced-motion.png`, fullPage: true });
  await reducedContext.close();

  await context.close();
  await browser.close();
}

async function runSmoke(browserType, name) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const state = { items: standardItems };
  await preparePage(page, state);
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.waitForSelector(".mem-dashboard", { state: "visible" });
  check(`${name}: score ring renders`, await page.locator(".mem-score-ring").isVisible());
  await noOverflow(page, `${name} dashboard`);
  await page.goto(`${BASE}/app/dinge`, { waitUntil: "networkidle" });
  await page.waitForSelector(".av-library", { state: "visible" });
  check(`${name}: archive product objects render`, (await page.locator(".mem-object-card").count()) === 4);
  await noOverflow(page, `${name} archive`);
  await context.close();
  await browser.close();
}

async function run() {
  await runChromium();
  await runSmoke(firefox, "Firefox");
  await runSmoke(webkit, "WebKit");

  const relevantErrors = consoleErrors.filter((entry) => !entry.includes("favicon"));
  check("browser console stays clean", relevantErrors.length === 0, relevantErrors.slice(0, 4).join(" | "));

  if (failures.length) {
    console.error(`\n${failures.length} manifest QA failure(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log("\nAll Avareno manifest QA checks passed.");
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
