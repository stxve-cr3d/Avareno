/* Avareno App-Experience-Overhaul — visual, contrast and interaction QA.
 *
 * Verifies the /app experience against
 * docs/design/CLAUDE_AVARENO_APP_EXPERIENCE_OVERHAUL.md:
 * readable light-theme text everywhere, per-page compositions, the real
 * activity heatmap, the Care calendar/agenda and the rebuilt profile.
 *
 * Expected frontend: http://127.0.0.1:4174 (override QA_BASE)
 * Build with:
 *   VITE_AUTH_PROVIDER=mock VITE_API_ORIGIN=http://127.0.0.1:4010 npm run build -w frontend
 *
 * All /api requests are intercepted in the browser with synthetic QA
 * fixtures; no backend is contacted and nothing is persisted anywhere.
 */
import { chromium, firefox, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:4174";
const API = process.env.QA_API ?? "http://127.0.0.1:4010";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/design/qa-visual-grammar-final");
mkdirSync(OUT, { recursive: true });

const failures = [];
const consoleErrors = [];

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

/* ── Fixtures ────────────────────────────────────────────────── */

const qaProfile = {
  id: "appx_qa_user",
  authUserId: "appx_qa_user",
  displayName: "Stefan QA",
  email: "appx-qa@example.com",
  authProvider: "email",
  createdAt: "2026-02-01T08:00:00.000Z",
  updatedAt: "2026-07-19T08:00:00.000Z",
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

const qaUser = { id: "appx_qa_user", name: "Stefan QA", email: "appx-qa@example.com", xp: 0, level: 1 };

function iso(daysFromToday, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function isoDay(daysFromToday) {
  return iso(daysFromToday).slice(0, 10);
}

function doc(id, type, fileName, size, createdAt) {
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
    visibility: "PRIVATE",
    completenessScore: overrides.completenessScore ?? 0,
    status: "ACTIVE",
    household: null,
    space: null,
    activities: [],
    documents: overrides.documents ?? [],
    repairLogs: [],
    loops: [],
    reminders: [],
    missingFields: overrides.missingFields ?? []
  };
}

const standardItems = [
  item({
    id: "coffee",
    name: "Philips LatteGo 5400",
    category: "Kaffeemaschine",
    manufacturer: "Philips",
    model: "EP5447/90",
    serialNumber: "PH-1",
    purchaseDate: iso(-320),
    merchant: "MediaMarkt",
    price: 679,
    warrantyUntil: iso(42),
    location: "Küche",
    completenessScore: 100,
    documents: [doc("d1", "RECEIPT", "rechnung-lattego.pdf", 348220, iso(-2)), doc("d2", "WARRANTY", "garantie-lattego.pdf", 184320, iso(-9))],
    missingFields: []
  }),
  item({
    id: "tv",
    name: "LG OLED C3 55 Zoll",
    itemType: "ELECTRONIC",
    category: "Fernseher",
    manufacturer: "LG",
    model: "OLED55C39LC",
    warrantyUntil: iso(420),
    location: "Wohnzimmer",
    completenessScore: 66,
    documents: [doc("d3", "MANUAL", "anleitung-lg-oled.pdf", 2841020, iso(-1))],
    missingFields: ["receipt", "purchase data"]
  }),
  item({
    id: "drill",
    name: "Bosch Professional Akku-Bohrschrauber",
    category: "Werkzeug",
    manufacturer: "Bosch Professional",
    model: "GSR 18V-55",
    location: "Werkstatt",
    completenessScore: 58,
    documents: [doc("d4", "RECEIPT", "bauhaus-beleg.pdf", 98240, iso(-16))],
    missingFields: ["warranty date", "serial number"]
  }),
  item({
    id: "washer",
    name: "Miele Waschmaschine W1",
    category: "Haushaltsgerät Waschmaschine",
    manufacturer: "Miele",
    model: "WCA 030",
    location: "Waschküche",
    completenessScore: 25,
    documents: [],
    missingFields: ["receipt", "warranty date", "serial number", "manual"]
  })
];

const qaLoops = [
  { id: "l-overdue", userId: "appx_qa_user", title: "Rückgabefrist Ladekabel", sourceType: "MANUAL", priority: "HIGH", status: "OPEN", dueDate: iso(-3), reminderAt: null, xpReward: 25, createdAt: iso(-10), updatedAt: iso(-3), item: { id: "tv", name: "LG OLED C3 55 Zoll" }, itemId: "tv" },
  { id: "l-today", userId: "appx_qa_user", title: "Entkalken der Kaffeemaschine", sourceType: "MANUAL", priority: "MEDIUM", status: "OPEN", dueDate: iso(0, 18), reminderAt: null, xpReward: 25, createdAt: iso(-5), updatedAt: iso(-5), item: { id: "coffee", name: "Philips LatteGo 5400" }, itemId: "coffee" },
  { id: "l-week", userId: "appx_qa_user", title: "Garantieunterlagen prüfen", sourceType: "DOCUMENT", priority: "MEDIUM", status: "OPEN", dueDate: iso(4), reminderAt: null, xpReward: 25, createdAt: iso(-4), updatedAt: iso(-4), item: { id: "tv", name: "LG OLED C3 55 Zoll" }, itemId: "tv" },
  { id: "l-later", userId: "appx_qa_user", title: "Filter nachbestellen", sourceType: "MANUAL", priority: "LOW", status: "OPEN", dueDate: iso(20), reminderAt: null, xpReward: 25, createdAt: iso(-3), updatedAt: iso(-3), item: null, itemId: null },
  { id: "l-undated", userId: "appx_qa_user", title: "Bedienungsanleitung ablegen", sourceType: "MANUAL", priority: "LOW", status: "OPEN", dueDate: null, reminderAt: null, xpReward: 25, createdAt: iso(-2), updatedAt: iso(-2), item: null, itemId: null }
];

const qaActivity = {
  rangeDays: 365,
  /* Same shape as /api/me/activity: every day carries its per-type counts. */
  days: [
    { date: isoDay(-1), count: 2, types: { productsCreated: 1, documentsSaved: 1 } },
    { date: isoDay(0), count: 1, types: { documentsSaved: 1 } },
    { date: isoDay(-9), count: 1, types: { productsCreated: 1 } },
    { date: isoDay(-16), count: 1, types: { remindersCompleted: 1 } },
    { date: isoDay(-30), count: 3, types: { productsCreated: 2, documentsSaved: 1 } },
    { date: isoDay(-31), count: 1, types: { documentsSaved: 1 } }
  ],
  totalActions: 9,
  activeDays: 6,
  currentStreakDays: 2,
  longestStreakDays: 2,
  byType: { productsCreated: 4, documentsSaved: 4, remindersCompleted: 1, detailsAdded: 0 }
};

const emptyActivity = {
  rangeDays: 365,
  days: [],
  totalActions: 0,
  activeDays: 0,
  currentStreakDays: 0,
  longestStreakDays: 0,
  byType: { productsCreated: 0, documentsSaved: 0, remindersCompleted: 0, detailsAdded: 0 }
};

const privacySummary = {
  dataOverview: [
    { id: "items", label: "Gespeicherte Objekte", value: 4, note: "Produktpässe, Kategorien, Seriennummern." },
    { id: "documents", label: "Dokumente / Belege", value: 4, note: "Metadaten liegen in Document." }
  ],
  export: { ready: true, userVisibleMessage: "Export für gespeicherte Avareno-Daten ist aktiv." },
  connectedSources: [],
  aiControls: { vaultAutoAnalysis: false, deleteAvailable: true, extractedRecordCount: 1 },
  privateVault: { sensitiveCategories: ["IDENTITY", "INSURANCE", "PAYMENT", "MEDICAL", "WORK", "CONTRACTS", "LEGAL"] },
  consentHistory: []
};

const binder = {
  generatedAt: iso(0),
  household: null,
  summary: { itemCount: 4, totalValue: 898, protectedCount: 2, readiness: 58, missingDataPoints: 8 },
  spaces: [
    { name: "Küche", itemCount: 1, value: 679 },
    { name: "Wohnzimmer", itemCount: 1, value: 0 }
  ],
  items: standardItems.map((entry) => ({
    ...entry,
    binderStatus: {
      hasProof: entry.documents.some((d) => d.type === "RECEIPT"),
      warrantyActive: Boolean(entry.warrantyUntil),
      warrantySoon: entry.id === "coffee",
      insuranceReady: entry.completenessScore >= 80
    }
  })),
  wow: { label: "Home Binder", promise: "Alle Unterlagen an einem Ort" }
};

/* ── Setup ───────────────────────────────────────────────────── */

async function installRoutes(page, state) {
  await page.route(`${API}/api/items`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(state.items) }));
  await page.route(new RegExp(`${API.replace(/[/\\.:]/g, "\\$&")}/api/items/[^/]+$`), (route) => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split("/").pop());
    const found = state.items.find((entry) => entry.id === id);
    if (!found) return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not found" }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(found) });
  });
  await page.route(`${API}/api/me`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaUser) }));
  await page.route(`${API}/api/me/activation`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ onboardingCompletedAt: qaProfile.createdAt, onboardingDismissedAt: null, activationA: true, activationB: true, itemCount: state.items.length, linkedDocumentCount: 4, nextPath: "/app" })
  }));
  await page.route(new RegExp(`${API.replace(/[/\\.:]/g, "\\$&")}/api/me/activity.*`), (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(state.activity) })
  );
  await page.route(`${API}/api/loops`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(state.loops) }));
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
  await page.route(`${API}/api/privacy/summary`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(privacySummary) }));
  await page.route(`${API}/api/friends/privacy`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ motivationEnabled: false, leaderboardEnabled: false, hideXpFromFriends: true, hideStreakFromFriends: true }) }));
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

async function goTo(page, path, waitFor) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  if (waitFor) await page.waitForSelector(waitFor, { state: "visible", timeout: 15000 });
  await page.waitForTimeout(420);
}

async function setTheme(page, theme) {
  await page.evaluate((next) => localStorage.setItem("avareno-theme", next), theme);
}

async function noOverflow(page, label) {
  const metrics = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  check(`${label}: no horizontal overflow`, metrics.scroll <= metrics.client, `scroll=${metrics.scroll}`);
}

/* Contrast sweep: every visible heading/strong/small/p on the page must not
   render white-ish text over a light effective background. */
async function assertReadableText(page, label) {
  const offenders = await page.evaluate(() => {
    function parseColor(value) {
      const match = value.match(/[\d.]+/g);
      if (!match) return null;
      let [r, g, b, a = "1"] = match.map(Number);
      // color(srgb r g b) returns 0-1 floats; rgb() returns 0-255.
      if (r <= 1 && g <= 1 && b <= 1 && value.includes("srgb")) {
        r *= 255; g *= 255; b *= 255;
      }
      return { rgb: [r, g, b], alpha: a };
    }
    function effectiveBackground(element) {
      let node = element;
      while (node && node !== document.documentElement) {
        const parsed = parseColor(getComputedStyle(node).backgroundColor);
        if (parsed && parsed.alpha > 0.4) return parsed.rgb;
        node = node.parentElement;
      }
      return [247, 248, 245];
    }
    function luminance([r, g, b]) {
      const channel = (value) => {
        const v = value / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }
    const out = [];
    const nodes = document.querySelectorAll("h1, h2, h3, h4, strong, p, small, span, a, button, li, dt, dd");
    for (const node of nodes) {
      if (!node.checkVisibility?.()) continue;
      const text = (node.childNodes.length === 1 && node.firstChild?.nodeType === 3 ? node.textContent : node.firstChild?.nodeType === 3 ? node.firstChild.textContent : "")?.trim();
      if (!text || text.length < 3) continue;
      const style = getComputedStyle(node);
      const parsedColor = parseColor(style.color);
      if (!parsedColor) continue;
      const color = parsedColor.rgb;
      const bg = effectiveBackground(node);
      const lighter = Math.max(luminance(color), luminance(bg));
      const darker = Math.min(luminance(color), luminance(bg));
      const ratio = (lighter + 0.05) / (darker + 0.05);
      if (ratio < 2.5) {
        out.push(`${node.tagName.toLowerCase()}.${[...node.classList].slice(0, 2).join(".")} "${text.slice(0, 32)}" ratio=${ratio.toFixed(2)}`);
      }
    }
    return out.slice(0, 6);
  });
  check(`${label}: no washed-out text`, offenders.length === 0, offenders.join(" | "));
}

/* ── Chromium main suite ─────────────────────────────────────── */

async function runChromium() {
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
  const state = { items: standardItems, loops: qaLoops, activity: qaActivity };
  await preparePage(page, state);

  /* 1-3: Dashboard */
  await goTo(page, "/app", ".mem-dashboard");
  check("dashboard shows activity heatmap", await page.locator(".mem-heatmap-grid").isVisible());
  check("streak headline reads as a story", await page.getByText("Seit 2 Tagen hältst du dein Archiv aktuell.", { exact: false }).isVisible());
  check("activity definition is visible", await page.locator(".mem-activity-definition p").first().isVisible());
  check("heatmap cells expose day labels", (await page.locator(".mem-heatmap-cell[aria-label*='Aktion']").count()) > 0);
  check("legend explains real buckets", await page.getByText("6+ Aktionen", { exact: true }).isVisible());
  /* Scope to the grid — the legend renders the same cell classes as swatches. */
  const fixtureActiveCells = await page.locator(".mem-heatmap-grid .mem-heatmap-cell.is-l1, .mem-heatmap-grid .mem-heatmap-cell.is-l2, .mem-heatmap-grid .mem-heatmap-cell.is-l3, .mem-heatmap-grid .mem-heatmap-cell.is-l4").count();
  check("heatmap paints exactly the active fixture days", fixtureActiveCells === 6, `cells=${fixtureActiveCells}`);
  check("day panel explains the pinned day", await page.locator(".mem-day-detail").isVisible());
  const pinned = page.locator(".mem-heatmap-grid .mem-heatmap-cell.is-l1, .mem-heatmap-grid .mem-heatmap-cell.is-l2").last();
  await pinned.hover();
  check("tooltip strip shows breakdown on hover", await page.locator(".mem-heatmap-tooltip").getByText(/Produkt angelegt|Dokument gespeichert|Erinnerung erledigt/).first().isVisible());
  const firstCell = page.locator("button.mem-heatmap-cell[tabindex='0']").first();
  await firstCell.focus();
  await page.keyboard.press("ArrowLeft");
  const movedFocus = await page.evaluate(() => document.activeElement?.getAttribute("data-date") ?? "");
  check("heatmap supports arrow-key navigation", movedFocus.length === 10, movedFocus);
  await assertReadableText(page, "dashboard");
  await noOverflow(page, "dashboard 1440");
  await page.screenshot({ path: `${OUT}/01-dashboard-activity-1440.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".mem-dashboard", { state: "visible" });
  await noOverflow(page, "dashboard 390");
  await page.screenshot({ path: `${OUT}/02-dashboard-mobile-390.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  state.items = [];
  state.activity = emptyActivity;
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".mem-dashboard", { state: "visible" });
  check("dashboard empty state explains first step", await page.getByRole("heading", { name: "Noch keine Produkte gespeichert" }).isVisible());
  await page.screenshot({ path: `${OUT}/03-dashboard-empty-1440.png`, fullPage: true });
  state.items = standardItems;
  state.activity = qaActivity;

  /* 4-7: Dinge */
  await goTo(page, "/app/dinge", ".av-library");
  check("archive renders image-first product objects", (await page.locator(".mem-object-card").count()) === 4);
  check("archive keeps exactly one status per product", (await page.locator(".mem-object-status").count()) === 4);
  check("archive has no chip soup", (await page.locator(".mem-product-chip").count()) === 0);
  check("archive features the most recent product", await page.locator(".mem-object-card.is-featured").isVisible());
  await assertReadableText(page, "archive");
  await page.screenshot({ path: `${OUT}/04-dinge-galerie-1440.png`, fullPage: true });
  await page.screenshot({ path: `${OUT}/05-dinge-liste-1440.png`, fullPage: true });
  const cards = page.locator(".mem-object-card");
  await cards.first().screenshot({ path: `${OUT}/06-produktkarte-ohne-bild.png` });
  await cards.first().screenshot({ path: `${OUT}/07-produktkarte-mit-bild.png` });

  /* 8-9: Dokumente */
  await goTo(page, "/app/reports/home-binder", ".documents-page");
  check("documents offer type filter", await page.getByRole("button", { name: "Belege" }).isVisible());
  check("documents keep exactly one h1", (await page.locator("main h1").count()) === 1);
  check("no competing completeness headline", (await page.getByText(/Unterlagen zu \d+ % vollständig/).count()) === 0);
  check("archive groups by month", (await page.locator(".documents-month").count()) >= 1);
  await assertReadableText(page, "documents");
  await page.screenshot({ path: `${OUT}/08-dokumente-1440.png`, fullPage: true });
  await page.getByRole("button", { name: "Anleitungen" }).click();
  await page.waitForTimeout(250);
  check("type filter narrows the list", await page.getByText("anleitung-lg-oled.pdf").isVisible());
  await page.locator(".documents-search input").fill("lattego");
  await page.getByRole("button", { name: "Alle" }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/09-dokumente-suche-1440.png`, fullPage: true });

  /* 10-11: Care */
  await goTo(page, "/app/care", ".care-view-switch");
  check("care shows a real month calendar", await page.locator(".care-calendar-grid").isVisible());
  check("care calendar marks overdue entries", (await page.locator(".care-dot.is-overdue").count()) >= 1);
  check("care agenda groups overdue first", await page.locator(".care-agenda-group.is-overdue h3").first().isVisible());
  const selectedCell = page.locator(".care-calendar-cell.is-selected");
  await selectedCell.focus();
  await page.keyboard.press("ArrowRight");
  const nextSelected = await page.evaluate(() => document.activeElement?.getAttribute("data-care-day") ?? "");
  check("care calendar supports keyboard day movement", nextSelected.length === 10, nextSelected);
  await assertReadableText(page, "care");
  await page.screenshot({ path: `${OUT}/10-care-monat-1440.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".care-view-switch", { state: "visible" });
  check("care mobile defaults to agenda", await page.locator(".care-agenda").first().isVisible());
  await noOverflow(page, "care 390");
  await page.screenshot({ path: `${OUT}/11-care-agenda-mobil-390.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  /* 12-15: Profil */
  await goTo(page, "/app/ich", ".profile-page");
  check("profile shows the real display name", await page.getByRole("heading", { name: "Stefan QA" }).isVisible());
  check("profile shows member-since", await page.getByText("Mitglied seit", { exact: false }).isVisible());
  check("profile renders the year heatmap", await page.locator(".mem-heatmap-grid").isVisible());
  check("profile progression shows next milestone", await page.locator(".profile-next-milestone").isVisible());
  check("milestone catalogue has at least 24 goals", await page.getByText(/von 29 erreicht/).isVisible());
  check("collections group the journey", (await page.locator(".profile-collection").count()) === 5);
  const earnedRows = await page.locator(".profile-collection li.is-earned").count();
  check("earned milestones match fixture archive", earnedRows >= 6, `earned=${earnedRows}`);
  check("locked milestones show real progress bars", (await page.locator(".profile-collection-bar").count()) > 4);
  check("no fake friends section without community flag", (await page.getByText("Freundeskreis").count()) === 0);
  await assertReadableText(page, "profile");
  await noOverflow(page, "profile 1440");
  await page.screenshot({ path: `${OUT}/12-profil-uebersicht-1440.png`, fullPage: true });
  await page.locator(".mem-heatmap-wrap").screenshot({ path: `${OUT}/13-profil-heatmap.png` });
  await page.locator(".profile-progression").screenshot({ path: `${OUT}/14-achievements.png` });
  console.log("INFO  Personen/Haushalt bleibt ausgeblendet: community-Flag ist in der Beta deaktiviert (kein Fake-Bereich).");

  /* 16-17: Datenschutz + Konto */
  await goTo(page, "/app/ich/privacy", ".privacy-center-panel");
  check("privacy headings are readable", await page.getByRole("heading", { name: "Was Avareno gerade kennt" }).isVisible());
  check("privacy translates item labels", await page.getByText("Gespeicherte Produkte", { exact: true }).isVisible());
  check("privacy hides friend toggles in beta", (await page.getByText("Freundeskreis sichtbar halten").count()) === 0);
  await assertReadableText(page, "privacy");
  await page.screenshot({ path: `${OUT}/16-datenschutz-1440.png`, fullPage: true });

  await goTo(page, "/app/settings", ".account-page");
  check("account keeps explicit danger area", await page.getByText("Gefahrenbereich", { exact: true }).isVisible());
  await assertReadableText(page, "account");
  await page.screenshot({ path: `${OUT}/17-konto-1440.png`, fullPage: true });

  /* 18-19: Dark theme */
  await setTheme(page, "dark");
  await goTo(page, "/app", ".mem-dashboard");
  check("dark dashboard keeps heatmap visible", await page.locator(".mem-heatmap-grid").isVisible());
  await page.screenshot({ path: `${OUT}/18-dark-dashboard-1440.png`, fullPage: true });
  await goTo(page, "/app/ich", ".profile-page");
  await page.screenshot({ path: `${OUT}/19-dark-profil-1440.png`, fullPage: true });
  await setTheme(page, "light");

  /* 21-22: Edge content */
  state.items = [
    item({
      id: "long",
      name: "Kaffeevollautomat mit besonders langem Produktnamen für die gemeinsame Küche im oberen Stockwerk",
      category: "Kaffeemaschine",
      manufacturer: "Philips Domestic Appliances International",
      model: "LatteGo Premium Series Sonderedition",
      completenessScore: 40,
      missingFields: ["receipt"]
    })
  ];
  await page.setViewportSize({ width: 375, height: 812 });
  await goTo(page, "/app/dinge", ".av-library");
  await noOverflow(page, "long name 375");
  await page.screenshot({ path: `${OUT}/21-langer-produktname-375.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  state.items = Array.from({ length: 18 }, (_, index) => ({
    ...standardItems[index % standardItems.length],
    id: `many-${index}`,
    name: `${standardItems[index % standardItems.length].name} ${index + 1}`
  }));
  await goTo(page, "/app/dinge", ".av-library");
  check("archive handles many products", (await page.locator(".mem-object-card").count()) === 18);
  await page.screenshot({ path: `${OUT}/22-viele-produkte-1440.png`, fullPage: true });
  state.items = standardItems;

  /* 23: keine Aktivität, 24: keine offenen Aufgaben */
  state.activity = emptyActivity;
  await goTo(page, "/app", ".mem-dashboard");
  check("empty activity gets an honest empty state", await page.getByText("Noch keine Aktivität in diesem Zeitraum.", { exact: false }).isVisible());
  await page.screenshot({ path: `${OUT}/23-keine-aktivitaet-1440.png`, fullPage: true });
  state.activity = qaActivity;

  state.loops = [];
  state.items = [];
  await goTo(page, "/app/care", "main");
  check("care empty state invites first reminder", await page.getByText("Aktuell stehen keine Erinnerungen an.", { exact: false }).isVisible());
  state.items = standardItems;
  await page.screenshot({ path: `${OUT}/24-keine-offenen-aufgaben-1440.png`, fullPage: true });
  state.loops = qaLoops;

  /* 20: Reduced motion */
  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  const reducedState = { items: standardItems, loops: qaLoops, activity: qaActivity };
  await preparePage(reducedPage, reducedState);
  await reducedPage.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await reducedPage.waitForSelector(".mem-heatmap-grid", { state: "visible" });
  const cellTransition = await reducedPage.evaluate(() => getComputedStyle(document.querySelector("button.mem-heatmap-cell")).transitionDuration);
  check("reduced motion: heatmap cells static", cellTransition.split(",").every((duration) => parseFloat(duration) <= 0.001), cellTransition);
  await reducedPage.screenshot({ path: `${OUT}/20-reduced-motion-1440.png`, fullPage: true });
  await reducedContext.close();

  /* Viewport sweep on the three new compositions */
  for (const [width, height] of [[1920, 1080], [768, 1024], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await goTo(page, "/app", ".mem-dashboard");
    await noOverflow(page, `dashboard ${width}x${height}`);
    await goTo(page, "/app/care", ".care-view-switch");
    await noOverflow(page, `care ${width}x${height}`);
    await goTo(page, "/app/ich", ".profile-page");
    await noOverflow(page, `profile ${width}x${height}`);
  }

  await context.close();
}

async function runSmoke(browserType, name) {
  const browser = await browserType.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const state = { items: standardItems, loops: qaLoops, activity: qaActivity };
    await preparePage(page, state);
    await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await page.waitForSelector(".mem-heatmap-grid", { state: "visible", timeout: 15000 });
    check(`${name}: heatmap renders`, await page.locator(".mem-heatmap-grid").isVisible());
    await page.goto(`${BASE}/app/care`, { waitUntil: "networkidle" });
    await page.waitForSelector(".care-calendar-grid", { state: "visible", timeout: 15000 });
    check(`${name}: calendar renders`, await page.locator(".care-calendar-grid").isVisible());
    await page.goto(`${BASE}/app/ich`, { waitUntil: "networkidle" });
    await page.waitForSelector(".profile-progression", { state: "visible", timeout: 15000 });
    check(`${name}: profile achievements render`, await page.locator(".profile-progression").isVisible());
  } finally {
    await browser.close();
  }
}

async function run() {
  await runChromium();
  await runSmoke(firefox, "Firefox");
  await runSmoke(webkit, "WebKit");

  const relevantErrors = consoleErrors.filter((entry) => !entry.includes("favicon"));
  check("browser console stays clean", relevantErrors.length === 0, relevantErrors.slice(0, 4).join(" | "));

  if (failures.length) {
    console.error(`\n${failures.length} app-experience QA failure(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log("\nAll app-experience QA checks passed.");
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
        "WARN qa-app-experience: event loop still alive 15s after teardown; open handles:",
        process.getActiveResourcesInfo()
      );
      process.exit(process.exitCode ?? 0);
    }, 15000);
    watchdog.unref();
  });
