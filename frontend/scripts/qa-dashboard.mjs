/* Dashboard readability and state QA against a production Vite preview.
 *
 * Expected frontend: http://127.0.0.1:4176
 * Build with:
 *   VITE_AUTH_PROVIDER=mock VITE_API_ORIGIN=http://127.0.0.1:4012 npm run build -w frontend
 *
 * Product fixtures are intercepted in the browser and exist only for visual
 * regression. They never enter the application database or production UI.
 */
import { chromium, firefox, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:4176";
const API = process.env.QA_API ?? "http://127.0.0.1:4012";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/design/qa-dashboard-readability-final");
mkdirSync(OUT, { recursive: true });

const failures = [];
const consoleErrors = [];

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const qaProfile = {
  id: "dashboard_qa_user",
  authUserId: "dashboard_qa_user",
  displayName: "Stefan QA",
  email: "dashboard-qa@example.com",
  authProvider: "email",
  createdAt: "2026-07-18T08:00:00.000Z",
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

const qaUser = {
  id: "dashboard_qa_user",
  name: "Stefan QA",
  email: "dashboard-qa@example.com",
  xp: 0,
  level: 1
};

const activation = {
  onboardingCompletedAt: "2026-07-18T08:00:00.000Z",
  onboardingDismissedAt: null,
  activationA: true,
  activationB: true,
  itemCount: 4,
  linkedDocumentCount: 4,
  nextPath: "/app"
};

const productImage = `data:image/svg+xml;base64,${Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dfe8d8"/><stop offset="1" stop-color="#f6efe0"/></linearGradient></defs>
    <rect width="240" height="240" rx="28" fill="url(#g)"/>
    <rect x="57" y="46" width="126" height="130" rx="20" fill="#313a34"/>
    <rect x="72" y="61" width="96" height="45" rx="10" fill="#f9f7ed"/>
    <circle cx="95" cy="83" r="9" fill="#59c749"/>
    <rect x="113" y="76" width="39" height="14" rx="7" fill="#88928c"/>
    <path d="M88 124h64v31a22 22 0 0 1-22 22h-20a22 22 0 0 1-22-22z" fill="#f9f7ed"/>
    <path d="M152 134h12a15 15 0 0 1 0 30h-12" fill="none" stroke="#f9f7ed" stroke-width="9"/>
    <rect x="43" y="176" width="154" height="13" rx="6.5" fill="#657169"/>
  </svg>
`).toString("base64")}`;

function document(id, type, fileName, size, createdAt = "2026-07-16T10:30:00.000Z") {
  return {
    id,
    type,
    fileName,
    filePath: `/uploads/${fileName}`,
    mimeType: "application/pdf",
    fileSize: size,
    createdAt,
    updatedAt: createdAt
  };
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
    purchaseDate: overrides.purchaseDate ?? null,
    merchant: overrides.merchant ?? null,
    price: overrides.price ?? null,
    currency: "EUR",
    imageUrl: overrides.imageUrl ?? null,
    warrantyUntil: overrides.warrantyUntil ?? null,
    location: overrides.location ?? null,
    completenessScore: overrides.completenessScore ?? 0,
    status: "ACTIVE",
    documents: overrides.documents ?? [],
    missingFields: overrides.missingFields ?? []
  };
}

const standardItems = [
  item({
    id: "coffee-pro",
    name: "Philips LatteGo 5400",
    category: "Kaffeemaschine",
    manufacturer: "Philips",
    model: "EP5447/90",
    serialNumber: null,
    purchaseDate: "2025-08-03T10:00:00.000Z",
    merchant: "MediaMarkt",
    price: 679,
    imageUrl: productImage,
    warrantyUntil: "2026-08-08T10:00:00.000Z",
    location: "Küche",
    completenessScore: 82,
    documents: [
      document("coffee-receipt", "RECEIPT", "rechnung-philips-lattego.pdf", 348220, "2026-07-17T12:00:00.000Z"),
      document("coffee-warranty", "WARRANTY", "garantie-lattego.pdf", 184320, "2026-07-15T09:00:00.000Z")
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
    documents: [document("oled-manual", "MANUAL", "bedienungsanleitung-lg-oled.pdf", 2841020, "2026-07-14T08:00:00.000Z")],
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
    warrantyUntil: null,
    location: "Werkstatt",
    completenessScore: 58,
    documents: [document("drill-receipt", "RECEIPT", "bauhaus-beleg-bohrschrauber.pdf", 98240, "2026-07-12T08:00:00.000Z")],
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

const manyItems = Array.from({ length: 18 }, (_, index) => {
  const source = standardItems[index % standardItems.length];
  return {
    ...source,
    id: `many-${index + 1}`,
    name: index < standardItems.length ? source.name : `${source.name} ${index + 1}`,
    documents: (source.documents ?? []).map((entry) => ({ ...entry, id: `${entry.id}-${index + 1}` }))
  };
});

const longNameItems = [
  item({
    ...standardItems[0],
    id: "long-product",
    name: "Kaffeevollautomat mit besonders langem Produktnamen für die gemeinsame Küche im oberen Stockwerk",
    manufacturer: "Philips Domestic Appliances International",
    model: "LatteGo Premium Series EP5447/90 Sonderedition",
    imageUrl: productImage,
    documents: standardItems[0].documents,
    missingFields: ["serial number"]
  })
];

const completeItems = [
  item({
    id: "complete-coffee",
    name: "Philips LatteGo 5400",
    category: "Kaffeemaschine",
    manufacturer: "Philips",
    model: "EP5447/90",
    serialNumber: "PH-QA-5400",
    purchaseDate: "2026-01-03T10:00:00.000Z",
    merchant: "MediaMarkt",
    price: 679,
    imageUrl: productImage,
    warrantyUntil: "2028-01-03T10:00:00.000Z",
    location: "Küche",
    completenessScore: 100,
    documents: [
      document("complete-receipt", "RECEIPT", "rechnung-lattego-vollstaendig.pdf", 448220),
      document("complete-manual", "MANUAL", "anleitung-lattego.pdf", 1712840)
    ],
    missingFields: []
  }),
  item({
    id: "complete-tv",
    name: "LG OLED C3",
    itemType: "ELECTRONIC",
    category: "Fernseher",
    manufacturer: "LG",
    model: "OLED55C39LC",
    serialNumber: "LG-COMPLETE-1",
    purchaseDate: "2026-02-04T10:00:00.000Z",
    merchant: "Saturn",
    price: 1299,
    warrantyUntil: "2028-02-04T10:00:00.000Z",
    location: "Wohnzimmer",
    completenessScore: 100,
    documents: [document("complete-tv-receipt", "RECEIPT", "rechnung-lg-oled.pdf", 218400)],
    missingFields: []
  })
];

async function installDashboardRoutes(page, state) {
  await page.route(`${API}/api/items`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(state.items) }));
  await page.route(`${API}/api/me`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaUser) }));
  await page.route(new RegExp(`${API.replace(/[/\\.:]/g, "\\$&")}/api/me/activity.*`), (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ rangeDays: 90, days: [], totalActions: 0, activeDays: 0, currentStreakDays: 0, longestStreakDays: 0, byType: { productsCreated: 0, documentsSaved: 0, remindersCompleted: 0, detailsAdded: 0 } })
  }));
  await page.route(`${API}/api/me/activation`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...activation, itemCount: state.items.length }) }));
}

async function preparePage(page, state) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await installDashboardRoutes(page, state);
  await page.addInitScript(({ profile }) => {
    localStorage.setItem("avareno-dev-auth-profile", JSON.stringify(profile));
    localStorage.setItem("avareno-language", "de");
    if (!localStorage.getItem("avareno-theme")) localStorage.setItem("avareno-theme", "light");
  }, { profile: qaProfile });
}

async function waitForDashboard(page) {
  /* The summary/score block is intentionally absent in the empty state,
     so the stable anchor is the dashboard greeting itself. */
  await page.waitForSelector(".mem-dashboard", { state: "visible" });
  await page.getByRole("heading", { name: "Guten Morgen, Stefan" }).waitFor({ state: "visible" });
}

async function renderState(page, state, items, theme = "light") {
  state.items = items;
  await page.evaluate((nextTheme) => localStorage.setItem("avareno-theme", nextTheme), theme);
  await page.reload({ waitUntil: "networkidle" });
  await waitForDashboard(page);
}

async function inspectLayout(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const main = document.querySelector(".mem-dashboard");
    const factRows = [...document.querySelectorAll(".mem-fact-list li")].map((row) => {
      const rect = row.getBoundingClientRect();
      return { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width) };
    });
    const productGrid = document.querySelector(".mem-product-grid");
    const primary = document.querySelector(".mem-home-head-actions .av-btn-primary");
    const nestedInteractive = document.querySelectorAll(".mem-object-card a, .mem-object-card button").length;
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      mainWidth: main ? Math.round(main.getBoundingClientRect().width) : 0,
      facts: factRows,
      productColumns: productGrid ? getComputedStyle(productGrid).gridTemplateColumns.split(" ").length : 0,
      productCards: document.querySelectorAll(".mem-object-card").length,
      taskRows: document.querySelectorAll(".mem-task-row").length,
      primaryButtons: document.querySelectorAll(".mem-dashboard .av-btn-primary").length,
      primaryHeight: primary ? Math.round(primary.getBoundingClientRect().height) : 0,
      nestedInteractive
    };
  });
}

async function captureViewport(page, state, name, width, height, items = standardItems) {
  await page.setViewportSize({ width, height });
  await renderState(page, state, items);
  const layout = await inspectLayout(page);
  check(`no horizontal overflow @ ${width}x${height}`, layout.scrollWidth <= layout.clientWidth, `scroll=${layout.scrollWidth} client=${layout.clientWidth}`);
  check(`at most three product previews @ ${width}x${height}`, layout.productCards <= 3, `cards=${layout.productCards}`);
  check(`at most three next tasks @ ${width}x${height}`, layout.taskRows <= 3, `tasks=${layout.taskRows}`);
  check(`one dashboard primary CTA @ ${width}x${height}`, layout.primaryButtons === 1, `primary=${layout.primaryButtons}`);
  check(`primary CTA touch height @ ${width}x${height}`, layout.primaryHeight >= 44, `height=${layout.primaryHeight}`);
  check(`product cards contain no nested interactions @ ${width}x${height}`, layout.nestedInteractive === 0, `nested=${layout.nestedInteractive}`);

  /* The KPI-card row became a quiet fact list: three stacked rows, no card wall. */
  check(`three summary facts @ ${width}x${height}`, layout.facts.length === 3, `facts=${layout.facts.length}`);
  const factColumns = new Set(layout.facts.map((row) => row.left)).size;
  check(`summary facts form one quiet column @ ${width}x${height}`, factColumns === 1, `columns=${factColumns}`);

  const expectedProductColumns = width <= 760 ? 1 : width <= 1080 ? 2 : 3;
  check(`product grid columns @ ${width}x${height}`, layout.productColumns === expectedProductColumns, `columns=${layout.productColumns}`);

  if (width === 1920) {
    check("dashboard max width is 1520px", layout.mainWidth <= 1520, `main=${layout.mainWidth}`);
    check("dashboard is not narrow on 1920px", layout.mainWidth >= 1480, `main=${layout.mainWidth}`);
  }
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
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

async function runChromiumSuite() {
  /* try/finally: a throwing assertion must never leave the browser (and its
     Chromium children) alive — that exact leak produced hour-old zombie
     processes when a selector regressed. */
  const browser = await chromium.launch();
  try {
    await runChromiumChecks(browser);
  } finally {
    await browser.close();
  }
}

async function runChromiumChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const state = { items: standardItems };
  await preparePage(page, state);
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await waitForDashboard(page);

  check("dashboard has one h1", (await page.locator(".mem-dashboard h1").count()) === 1);
  check("dashboard has three summary facts", (await page.locator(".mem-fact-list li").count()) === 3);
  check("dashboard shows the archive score ring", await page.locator(".mem-score-card .mem-score-ring").isVisible());
  check("archive score explains its calculation", await page.getByText("Berechnet aus der Vollständigkeit", { exact: false }).isVisible());
  check("product image has useful alt text", await page.locator('.mem-object-card img[alt="Produktbild von Philips LatteGo 5400"]').isVisible());
  check("summary uses real derived values", await page.getByText("4 Produkte brauchen noch wichtige Angaben", { exact: false }).isVisible());

  const colors = await page.evaluate(() => {
    const fact = getComputedStyle(document.querySelector(".mem-fact-list li span"));
    const number = getComputedStyle(document.querySelector(".mem-fact-list li strong"));
    const background = getComputedStyle(document.body);
    return { fact: fact.color, number: number.color, background: background.backgroundColor };
  });
  const background = parseRgb(colors.background);
  const factColor = parseRgb(colors.fact);
  const numberColor = parseRgb(colors.number);
  const factContrast = background && factColor ? contrast(factColor, background) : 0;
  const numberContrast = background && numberColor ? contrast(numberColor, background) : 0;
  check("summary fact contrast >= 4.5:1", factContrast >= 4.5, factContrast.toFixed(2));
  check("summary number contrast >= 4.5:1", numberContrast >= 4.5, numberContrast.toFixed(2));

  const primary = page.locator(".mem-home-head-actions .av-btn-primary");
  await primary.focus();
  const focus = await primary.evaluate((element) => {
    const style = getComputedStyle(element);
    return { focused: document.activeElement === element, width: parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  check("primary CTA has visible keyboard focus", focus.focused && focus.width >= 2 && focus.style !== "none", JSON.stringify(focus));

  const viewports = [
    ["dashboard-1440x900", 1440, 900],
    ["dashboard-1920x1080", 1920, 1080],
    ["dashboard-1280x720", 1280, 720],
    ["dashboard-768x1024", 768, 1024],
    ["dashboard-430x932", 430, 932],
    ["dashboard-390x844", 390, 844],
    ["dashboard-375x812", 375, 812],
    ["dashboard-320x568", 320, 568]
  ];
  for (const [name, width, height] of viewports) {
    await captureViewport(page, state, name, width, height);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await renderState(page, state, standardItems);
  const cards = page.locator(".mem-object-card");
  check("three product preview cards for image regression", (await cards.count()) === 3);
  await cards.nth(0).screenshot({ path: `${OUT}/product-card-with-image.png` });
  await cards.nth(1).screenshot({ path: `${OUT}/product-card-without-image.png` });
  check("first product card uses an image", (await cards.nth(0).locator("img").count()) === 1);
  check("second product card uses category placeholder", (await cards.nth(1).locator("img").count()) === 0);

  await renderState(page, state, [], "light");
  check("empty dashboard explains the next action", await page.getByRole("heading", { name: "Noch keine Produkte gespeichert" }).isVisible());
  await page.screenshot({ path: `${OUT}/dashboard-empty-1440x900.png`, fullPage: true });

  await renderState(page, state, manyItems, "light");
  check("many-products summary uses all products", await page.getByText("18", { exact: true }).isVisible());
  check("many-products dashboard still previews three", (await page.locator(".mem-object-card").count()) === 3);
  await page.screenshot({ path: `${OUT}/dashboard-many-products-1440x900.png`, fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  await renderState(page, state, longNameItems, "light");
  const longLayout = await inspectLayout(page);
  check("long product name has no mobile overflow", longLayout.scrollWidth <= longLayout.clientWidth, `scroll=${longLayout.scrollWidth}`);
  await page.screenshot({ path: `${OUT}/dashboard-long-product-name-375x812.png`, fullPage: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await renderState(page, state, completeItems, "light");
  check("no-open-tasks state is explicit", await page.getByText("Alles Wichtige ist aktuell", { exact: true }).isVisible());
  check("no-open-tasks state contains no task rows", (await page.locator(".mem-task-row").count()) === 0);
  await page.screenshot({ path: `${OUT}/dashboard-no-open-tasks-1440x900.png`, fullPage: true });

  await renderState(page, state, standardItems, "dark");
  const darkSurface = await page.evaluate(() => getComputedStyle(document.querySelector(".mem-score-card")).backgroundColor);
  check("dark theme uses a dark summary surface", !darkSurface.includes("255, 255, 255"), darkSurface);
  await page.screenshot({ path: `${OUT}/dashboard-dark-1440x900.png`, fullPage: true });

  await context.close();

  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  const reducedState = { items: standardItems };
  await preparePage(reducedPage, reducedState);
  await reducedPage.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await waitForDashboard(reducedPage);
  const reducedTransition = await reducedPage.evaluate(() => getComputedStyle(document.querySelector(".mem-object-card")).transitionDuration);
  check("dashboard respects reduced motion", reducedTransition.split(",").every((duration) => parseFloat(duration) <= 0.001), reducedTransition);
  await reducedPage.screenshot({ path: `${OUT}/dashboard-reduced-motion-1440x900.png`, fullPage: true });
  await reducedContext.close();
}

async function runBrowserSmoke(browserType, name) {
  const browser = await browserType.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const state = { items: standardItems };
    await preparePage(page, state);
    await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await waitForDashboard(page);
    const layout = await inspectLayout(page);
    check(`${name} renders dashboard`, layout.productCards === 3 && layout.facts.length === 3, `products=${layout.productCards}`);
    check(`${name} has no horizontal overflow`, layout.scrollWidth <= layout.clientWidth, `scroll=${layout.scrollWidth}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await runChromiumSuite();
  await runBrowserSmoke(firefox, "Firefox");
  await runBrowserSmoke(webkit, "WebKit");

  check("browser console has no errors", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
  if (failures.length) {
    console.error(`\n${failures.length} dashboard QA failure(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log("\nAll dashboard readability QA checks passed.");
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    /* Teardown is explicit (try/finally around every launched browser). This
       unref'd watchdog only fires if a stray handle keeps the loop alive; it
       reports the culprits and exits with the recorded code so a hang can
       never mask the results. */
    const watchdog = setTimeout(() => {
      console.error(
        "WARN qa-dashboard: event loop still alive 15s after teardown; open handles:",
        process.getActiveResourcesInfo()
      );
      process.exit(process.exitCode ?? 0);
    }, 15000);
    watchdog.unref();
  });
