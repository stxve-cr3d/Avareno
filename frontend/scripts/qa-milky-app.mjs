/* Milky Archive application visual regression QA.
 *
 * Expected services:
 *   API:      http://127.0.0.1:4010
 *   Frontend: http://127.0.0.1:4174
 *
 * Run after qa-onboarding.mjs so the isolated QA database contains one
 * product and one linked document. All screenshots use mock authentication
 * and synthetic QA data only.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.QA_BASE ?? "http://127.0.0.1:4174";
const API = process.env.QA_API ?? "http://127.0.0.1:4010";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/design/qa-milky-archive-final");
mkdirSync(OUT, { recursive: true });

const failures = [];
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

async function settle(page, ms = 650) {
  await page.waitForTimeout(ms);
}

async function overflow(page) {
  return page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
}

async function checkOverflow(page, name) {
  const widths = await overflow(page);
  check(`no horizontal overflow @ ${name}`, widths.scroll <= widths.client, `scroll=${widths.scroll} client=${widths.client}`);
}

async function capture(page, route, file, name, fullPage = true) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await settle(page);
  await checkOverflow(page, name);
  await page.screenshot({ path: `${OUT}/${file}`, fullPage });
}

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("avareno-dev-auth-profile");
    localStorage.removeItem("avareno-mock-auth-profile");
    localStorage.setItem("avareno-language", "de");
    localStorage.setItem("avareno-theme", "light");
  });
  await page.reload({ waitUntil: "networkidle" });
  await settle(page);
  check("login renders in light theme", (await page.locator("html").getAttribute("data-theme")) === "light");
  await checkOverflow(page, "login-desktop");
  await page.screenshot({ path: `${OUT}/21-login.png`, fullPage: true });

  await page.getByPlaceholder("du@example.com").fill("qa-onboarding@example.com");
  await page.getByPlaceholder("Mindestens 6 Zeichen").fill("secure123");
  await page.getByRole("button", { name: "Einloggen" }).click();
  await page.waitForURL("**/app");
  await settle(page);

  const itemsResponse = await fetch(`${API}/api/items`);
  const items = await itemsResponse.json();
  const productId = items[0]?.id;
  check("QA product is available for visual regression", Boolean(productId), productId ?? "missing");

  await capture(page, "/app", "23-dashboard-desktop.png", "dashboard-desktop");
  const appTheme = await page.evaluate(() => {
    const shell = getComputedStyle(document.querySelector(".avareno-app-shell"));
    const topbar = getComputedStyle(document.querySelector(".avareno-app-topbar"));
    const active = getComputedStyle(document.querySelector(".avareno-app-nav .is-active"));
    return { theme: document.documentElement.dataset.theme, shell: shell.backgroundColor, topbar: topbar.backgroundColor, active: active.backgroundColor };
  });
  check("app shell uses light Milky default", appTheme.theme === "light" && appTheme.shell !== "rgb(20, 20, 20)", JSON.stringify(appTheme));

  await capture(page, "/app/dinge", "25-product-list.png", "product-list");
  check("product list contains the QA product", await page.getByText("QA Akku-Bohrschrauber").first().isVisible());
  await capture(page, `/app/dinge/${productId}`, "26-product-detail.png", "product-detail");
  await capture(page, "/app/reports/home-binder", "27-document-archive.png", "document-archive");
  check("document archive contains linked receipt", await page.getByText("qa-receipt.pdf").isVisible());
  check("document overview keeps one title and no stat-card row", (await page.locator(".documents-stat").count()) === 0 && (await page.locator(".documents-page h1").count()) === 1);
  const documentSearch = page.getByPlaceholder("Datei, Dokumenttyp oder Produkt suchen");
  await documentSearch.fill("nicht vorhanden");
  check("document search has an accessible empty result", await page.getByText("Keine passenden Dokumente.").isVisible());
  await documentSearch.fill("QA Akku");
  check("document search finds by linked product", await page.getByText("qa-receipt.pdf").isVisible());
  await capture(page, "/app/capture/item", "28-product-capture.png", "product-capture");
  await capture(page, "/app/ich/settings", "29-settings.png", "settings");

  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await settle(page);
  await page.locator(".avareno-app-capture").click();
  const dialog = page.getByRole("dialog", { name: "Was möchtest du erfassen?" });
  check("capture dialog opens and is named", await dialog.isVisible());
  await page.screenshot({ path: `${OUT}/30-dialog.png`, fullPage: false });
  await page.keyboard.press("Escape");
  check("capture dialog closes with Escape", !(await dialog.isVisible()));

  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "/app", "24-dashboard-mobile.png", "dashboard-mobile", false);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload({ waitUntil: "networkidle" });
  await settle(page, 450);
  await checkOverflow(page, "dashboard-orientation-landscape");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("avareno-theme", "dark"));
  await page.reload({ waitUntil: "networkidle" });
  await settle(page);
  const darkState = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    shell: getComputedStyle(document.querySelector(".avareno-app-shell")).backgroundColor,
    text: getComputedStyle(document.querySelector(".avareno-app-shell")).color
  }));
  check("dark theme regression resolves to dark", darkState.theme === "dark", JSON.stringify(darkState));
  check("dark theme retains a dark app surface", !/rgb\((24[0-9]|25[0-5])/.test(darkState.shell), darkState.shell);
  await checkOverflow(page, "dashboard-dark");
  await page.screenshot({ path: `${OUT}/31-dark-theme-regression.png`, fullPage: true });

  await page.evaluate(() => localStorage.setItem("avareno-theme", "light"));
  await page.setViewportSize({ width: 720, height: 900 });
  await page.reload({ waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await settle(page, 450);
  await checkOverflow(page, "dashboard-200%-text");

  check("app browser console has no errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  await browser.close();

  if (failures.length) {
    console.error(`\n${failures.length} Milky app QA failure(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log("\nAll Milky app QA checks passed.");
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
