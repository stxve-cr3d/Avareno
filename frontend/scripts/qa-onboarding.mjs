/* First-product activation QA against a production build.
 *
 * Expected services:
 *   API:      http://127.0.0.1:4010
 *   Frontend: http://127.0.0.1:4174
 *
 * Build with:
 *   VITE_AUTH_PROVIDER=mock VITE_API_ORIGIN=http://127.0.0.1:4010 npm run build -w frontend
 * Then start a fresh backend DB and `vite preview` before running this file.
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

async function visible(locator, timeout = 5000) {
  try {
    await locator.waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function noHorizontalOverflow(page, name) {
  const sizes = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  check(`no horizontal overflow @ ${name}`, sizes.scroll <= sizes.client, `scroll=${sizes.scroll} client=${sizes.client}`);
}

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await context.newPage();
  const productRequests = [];
  const documentRequests = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url() === `${API}/api/items`) productRequests.push(request.url());
    if (request.method() === "POST" && request.url() === `${API}/api/documents/upload`) documentRequests.push(request.url());
  });

  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.waitForURL("**/login");
  check("invite-only signup redirects to login", page.url().endsWith("/login"));
  await page.evaluate(() => {
    localStorage.removeItem("avareno-dev-auth-profile");
    localStorage.removeItem("avareno-mock-auth-profile");
    localStorage.setItem("avareno-language", "de");
  });
  await page.reload({ waitUntil: "networkidle" });

  await page.getByPlaceholder("du@example.com").fill("qa-onboarding@example.com");
  await page.getByPlaceholder("Mindestens 6 Zeichen").fill("secure123");
  await page.getByRole("button", { name: "Einloggen" }).click();
  await page.waitForURL("**/onboarding");

  check("provisioned beta login reaches onboarding", page.url().endsWith("/onboarding"));
  check("German onboarding title is exact", await visible(page.getByRole("heading", { name: "Lege deine erste Produktakte an." })));
  check("German primary action is exact", await visible(page.getByRole("button", { name: "Erstes Produkt hinzufügen" })));
  await page.screenshot({ path: `${OUT}/22-onboarding.png`, fullPage: true });

  await page.getByRole("button", { name: "Zunächst zur Übersicht" }).click();
  await page.waitForURL("**/app");
  check("skip reaches empty overview", await visible(page.getByRole("heading", { name: "Noch keine Produkte gespeichert" })));
  await page.reload({ waitUntil: "networkidle" });
  check("skip persists after reload", new URL(page.url()).pathname === "/app");

  await page.goto(`${BASE}/onboarding?resume=1`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Sprache auf Englisch wechseln" }).click();
  check("English onboarding title is exact", await visible(page.getByRole("heading", { name: "Create your first product dossier." })));
  await page.getByRole("button", { name: "Add first product" }).click();
  await page.waitForURL("**/app/capture/item?onboarding=1");
  check("English capture title is visible", await visible(page.getByRole("heading", { name: "Create your first product record." })));

  await page.getByRole("button", { name: "Save product" }).click();
  check("name validation is inline", await page.getByText("Enter a product name.").isVisible());
  check("category validation is inline", await page.getByText("Select a category.").isVisible());

  await page.getByLabel("Product name").fill("QA Akku-Bohrschrauber");
  await page.getByLabel("Category").selectOption("Elektronik");
  await page.getByText("Add more details").click();
  await page.getByLabel("Manufacturer").fill("Bosch");
  await page.getByLabel("Model").fill("QA-18V");
  await page.getByLabel("Serial number").fill("QA-SN-001");
  await page.getByRole("button", { name: "Save product" }).dblclick();
  await page.waitForURL(/\/app\/capture\/item\/success\/[^/]+$/);
  check("duplicate double click creates one request", productRequests.length === 1, `${productRequests.length} POST requests`);
  check("success title is exact", await visible(page.getByRole("heading", { name: "Your product is saved." })));
  check("success shows real product", await visible(page.getByText("QA Akku-Bohrschrauber")));
  await page.screenshot({ path: `${OUT}/qa-product-success-en.png`, fullPage: true });

  const productId = new URL(page.url()).pathname.split("/").pop();
  const activationA = await (await fetch(`${API}/api/me/activation`)).json();
  check("activation A is server-side true", activationA.activationA === true);
  check("activation A has one product", activationA.itemCount === 1, `itemCount=${activationA.itemCount}`);

  await page.reload({ waitUntil: "networkidle" });
  check("success survives reload", await page.getByText("QA Akku-Bohrschrauber").isVisible());

  await page.getByRole("link", { name: "Add receipt or document" }).click();
  await page.waitForURL(/\/app\/capture\/receipt\?itemId=/);
  check("document flow retains product context", await visible(page.getByText("QA Akku-Bohrschrauber")));
  check("document flow states no automatic analysis", await visible(page.getByText("No automatic analysis takes place.")));

  await page.locator("#document-file").setInputFiles({
    name: "qa-receipt.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 QA receipt\n")
  });
  await page.route(`${API}/api/documents/upload`, (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Save document" }).click();
  check("upload network error is friendly", await visible(page.getByText("The connection failed. Check your internet connection and try again.")));
  check("failed upload keeps product context", await page.getByText("QA Akku-Bohrschrauber").isVisible());
  const beforeSuccessfulUpload = await (await fetch(`${API}/api/me/activation`)).json();
  check("failed upload creates no document", beforeSuccessfulUpload.linkedDocumentCount === 0, `linkedDocumentCount=${beforeSuccessfulUpload.linkedDocumentCount}`);
  await page.unroute(`${API}/api/documents/upload`);
  await page.getByRole("button", { name: "Save document" }).dblclick();
  await page.waitForURL(`**/app/dinge/${productId}`);
  check("document retry double click sends one new request", documentRequests.length === 2, `${documentRequests.length} total requests incl. failed attempt`);
  check("document success notice is visible", await visible(page.getByText("Document saved.")));
  check("detail shows uploaded filename", await visible(page.getByText("qa-receipt.pdf")));
  await page.screenshot({ path: `${OUT}/26-product-detail.png`, fullPage: true });

  const activationB = await (await fetch(`${API}/api/me/activation`)).json();
  check("activation B is server-side true", activationB.activationB === true);
  check("activation B has one linked document", activationB.linkedDocumentCount === 1, `linkedDocumentCount=${activationB.linkedDocumentCount}`);
  check("first product detail open is recorded", Boolean(activationB.firstProductDetailOpenedAt));

  await page.reload({ waitUntil: "networkidle" });
  check("uploaded document survives reload", await page.getByText("qa-receipt.pdf").isVisible());

  await page.goto(`${BASE}/app/search`, { waitUntil: "networkidle" });
  await page.getByPlaceholder(/Wonach suchst du/).fill("QA Akku");
  await page.waitForTimeout(500);
  check("new product is immediately searchable", await page.getByText("QA Akku-Bohrschrauber").isVisible());

  await page.evaluate(() => localStorage.removeItem("avareno-dev-auth-profile"));
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("du@example.com").fill("qa-onboarding@example.com");
  await page.getByPlaceholder("Mindestens 6 Zeichen").fill("secure123");
  await page.getByRole("button", { name: "Einloggen" }).click();
  await page.waitForURL("**/app");
  check("existing login skips onboarding", new URL(page.url()).pathname === "/app");

  await page.route(`${API}/api/items`, (route) => route.abort("failed"));
  await page.goto(`${BASE}/app/capture/item`, { waitUntil: "networkidle" });
  await page.getByLabel("Product name").fill("Network-safe product");
  await page.getByLabel("Category").selectOption("Sonstiges");
  await page.getByRole("button", { name: "Save product" }).click();
  check("product network error is friendly", await visible(page.getByText("The connection failed. Check your internet connection and try again.")));
  check("product name survives failed save", (await page.getByLabel("Product name").inputValue()) === "Network-safe product");
  check("category survives failed save", (await page.getByLabel("Category").inputValue()) === "Sonstiges");
  await page.unroute(`${API}/api/items`);
  const afterFailedProduct = await (await fetch(`${API}/api/me/activation`)).json();
  check("failed product save creates no duplicate", afterFailedProduct.itemCount === 1, `itemCount=${afterFailedProduct.itemCount}`);

  for (const [name, width, height, path] of [
    ["mobile-320", 320, 568, `/app/capture/item`],
    ["mobile-375", 375, 812, `/app/capture/receipt?itemId=${productId}`],
    ["tablet-768", 768, 1024, `/app/dinge/${productId}`]
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await noHorizontalOverflow(page, name);
    await page.screenshot({ path: `${OUT}/responsive-${name}.png`, fullPage: true });
  }

  await browser.close();
  if (failures.length) {
    console.error(`\n${failures.length} onboarding QA failure(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log("\nAll onboarding QA checks passed.");
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    /* Teardown is explicit (browser.close above) and the process normally
       exits on its own. This unref'd watchdog only fires if a stray handle
       (observed once: wedged Chromium child on macOS) keeps the loop alive;
       it then reports the culprit handles and exits with the recorded code
       so a hang can never mask the real results. */
    const watchdog = setTimeout(() => {
      console.error(
        "WARN qa-onboarding: event loop still alive 15s after teardown; open handles:",
        process.getActiveResourcesInfo()
      );
      process.exit(process.exitCode ?? 0);
    }, 15000);
    watchdog.unref();
  });
