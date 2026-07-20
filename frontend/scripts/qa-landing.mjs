/* Landing-page QA against the production build (vite preview on :4173).
 *
 * Uses the repo's existing `playwright` devDependency — no test framework.
 * Run:  npx vite preview --port 4173  (in frontend/), then
 *       node frontend/scripts/qa-landing.mjs
 *
 * Covers: viewport/overflow sweep, hero states (initial / converging /
 * converged / back-scrolled), reduced motion, pause button (mouse +
 * keyboard + aria-pressed + focus ring), CTAs and anchors incl. sticky-nav
 * clearance, DE/EN switch, dead-link scan, heading order, LCP/CLS/longtask
 * metrics, and screenshots into docs/design/qa-milky-archive-final/.
 */
import { chromium, firefox, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://localhost:4173";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/design/qa-milky-archive-final");
mkdirSync(OUT, { recursive: true });

const results = [];
const failures = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const VIEWPORTS = [
  ["desktop-1280x720", 1280, 720],
  ["desktop-1440x900", 1440, 900],
  ["desktop-1920x1080", 1920, 1080],
  ["tablet-768x1024", 768, 1024],
  ["tablet-1024x768", 1024, 768],
  ["mobile-320x568", 320, 568],
  ["mobile-375x812", 375, 812],
  ["mobile-390x844", 390, 844],
  ["mobile-430x932", 430, 932]
];

async function overflowInfo(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return { clientW: doc.clientWidth, scrollW: doc.scrollWidth, overflow: doc.scrollWidth > doc.clientWidth };
  });
}

async function settle(page, ms = 600) {
  await page.waitForTimeout(ms);
}

async function run() {
  const browser = await chromium.launch();

  /* ── metrics context: LCP / CLS / longtasks on a cold load ── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__vitals = { lcp: 0, cls: 0, longtasks: 0, tbt: 0 };
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__vitals.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          window.__vitals.longtasks += 1;
          window.__vitals.tbt += Math.max(0, e.duration - 50);
        }
      }).observe({ type: "longtask", buffered: true });
    });
    const requests = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(BASE, { waitUntil: "networkidle" });
    await settle(page, 1500);
    const vitals = await page.evaluate(() => window.__vitals);
    const initialRequests = requests.length;
    console.log(`METRIC LCP=${vitals.lcp.toFixed(0)}ms CLS=${vitals.cls.toFixed(4)} longtasks=${vitals.longtasks} TBT~=${vitals.tbt.toFixed(0)}ms requests=${initialRequests}`);
    check("LCP < 2500ms (localhost)", vitals.lcp < 2500, `${vitals.lcp.toFixed(0)}ms`);
    check("CLS < 0.1", vitals.cls < 0.1, vitals.cls.toFixed(4));
    await ctx.close();
  }

  /* ── viewport sweep: overflow + hero screenshot ── */
  for (const [name, width, height] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await settle(page);
    const o = await overflowInfo(page);
    check(`no horizontal overflow @ ${name}`, !o.overflow, `scrollW=${o.scrollW} clientW=${o.clientW}`);
    await page.screenshot({ path: `${OUT}/${name}-hero.png` });
    await ctx.close();
  }

  /* ── hero states, motion, anchors, CTAs (1440x900) ── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await settle(page, 900);

    // 1. initial
    await page.screenshot({ path: `${OUT}/01-navigation-top.png`, fullPage: false });
    await page.screenshot({ path: `${OUT}/03-hero-start.png`, fullPage: false });
    const p0 = await page.evaluate(() => document.querySelector(".ma-world-stage")?.style.getPropertyValue("--p") || "0");
    check("hero --p starts at ~0", parseFloat(p0 || "0") < 0.05, `--p=${p0}`);

    // scene distinctness: product illustration + dossier + chips all present
    const scene = await page.evaluate(() => ({
      product: !!document.querySelector(".ma-product-svg"),
      label: document.querySelector(".ma-world-product")?.textContent || "",
      chips: document.querySelectorAll(".ma-world-chip").length,
      dossier: !!document.querySelector(".ma-world-record")
    }));
    check("scene has product svg + 5 chips + dossier", scene.product && scene.chips === 5 && scene.dossier, JSON.stringify(scene));

    // chips must not overlap the dossier or the product at rest
    const overlaps = await page.evaluate(() => {
      const rects = (sel) => [...document.querySelectorAll(sel)].map((el) => el.getBoundingClientRect());
      const inter = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
      const dossier = document.querySelector(".ma-world-record").getBoundingClientRect();
      const product = document.querySelector(".ma-product-svg").getBoundingClientRect();
      const bad = [];
      rects(".ma-world-chip > span").forEach((r, i) => {
        if (inter(r, dossier)) bad.push(`chip${i}-dossier`);
        if (inter(r, product)) bad.push(`chip${i}-product`);
      });
      return bad;
    });
    check("no chip overlaps dossier/product at rest", overlaps.length === 0, overlaps.join(","));

    // 2/3. Convergence follows the hero's own scroll range. Drive that
    // range directly so this check stays aligned with the component logic.
    const scrollHeroTo = async (progress) => {
      await page.evaluate((p) => {
        const hero = document.querySelector(".ma-hero");
        const travel = Math.max(hero.offsetHeight - window.innerHeight * 0.82, window.innerHeight * 0.45);
        window.scrollTo({ top: hero.offsetTop + travel * p, behavior: "instant" });
      }, progress);
      await page.mouse.wheel(0, 1); // nudge to fire the scroll listener
      await page.waitForTimeout(700);
      return parseFloat(await page.evaluate(() => document.querySelector(".ma-world-stage").style.getPropertyValue("--p") || "0"));
    };

    const pMid = await scrollHeroTo(0.5);
    check("scroll drives convergence (--p rises)", pMid > 0.1 && pMid < 0.9, `--p=${pMid}`);
    await page.screenshot({ path: `${OUT}/02-navigation-scrolled.png` });
    await page.screenshot({ path: `${OUT}/04-hero-transform.png` });

    const pEnd = await scrollHeroTo(1);
    check("convergence completes (--p ≥ 0.9)", pEnd >= 0.9, `--p=${pEnd}`);
    await page.screenshot({ path: `${OUT}/05-hero-end.png` });

    // back-scroll restores the scattered state
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await settle(page, 700);
    const pBack = parseFloat(await page.evaluate(() => document.querySelector(".ma-world-stage").style.getPropertyValue("--p") || "0"));
    check("back-scroll restores --p to ~0", pBack < 0.05, `--p=${pBack}`);

    // resize keeps a sane state
    await page.setViewportSize({ width: 1024, height: 768 });
    await settle(page, 500);
    const oAfterResize = await overflowInfo(page);
    check("no overflow after resize to 1024x768", !oAfterResize.overflow, `scrollW=${oAfterResize.scrollW}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await settle(page, 500);

    // float animation actually running (rAF/animation real here)
    const floatState = await page.evaluate(() => {
      const el = document.querySelector(".ma-world-chip > span");
      const cs = getComputedStyle(el);
      return { name: cs.animationName, state: cs.animationPlayState, duration: cs.animationDuration };
    });
    check("float animation active (8s)", floatState.name.includes("ma-chip-float") && floatState.state.split(",").every((state) => state.trim() === "running") && floatState.duration.includes("8s"), JSON.stringify(floatState));

    // 4. pause button: mouse
    const pause = page.locator(".ma-world-pause");
    await pause.scrollIntoViewIfNeeded();
    check("pause aria-pressed=false initially", (await pause.getAttribute("aria-pressed")) === "false");
    await pause.click();
    await settle(page, 300);
    check("pause aria-pressed=true after click", (await pause.getAttribute("aria-pressed")) === "true");
    const pausedAnim = await page.evaluate(() => getComputedStyle(document.querySelector(".ma-world-chip > span")).animationPlayState);
    check("float paused after click", pausedAnim.split(",").every((state) => state.trim() === "paused"), pausedAnim);
    // keyboard: reach the button via Tab so :focus-visible applies
    await page.evaluate(() => {
      const el = document.querySelector(".ma-world-pause");
      const prev = el.previousElementSibling ?? el;
      prev.scrollIntoView({ block: "center", behavior: "instant" });
    });
    await pause.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab"); // keyboard-driven focus → :focus-visible
    const focusState = await page.evaluate(() => {
      const el = document.querySelector(".ma-world-pause");
      const cs = getComputedStyle(el);
      return {
        focused: document.activeElement === el,
        focusVisible: el.matches(":focus-visible"),
        outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0
      };
    });
    check("pause reachable by keyboard + visible focus ring", focusState.focused && focusState.focusVisible && focusState.outline, JSON.stringify(focusState));
    await page.keyboard.press("Enter");
    await settle(page, 300);
    check("keyboard Enter resumes (aria-pressed=false)", (await pause.getAttribute("aria-pressed")) === "false");

    // 5. anchors: secondary CTA → #how-it-works, title not hidden under nav
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('a[href="#how-it-works"]');
    await settle(page, 900);
    const anchor = await page.evaluate(() => {
      const nav = document.querySelector(".ma-nav")?.getBoundingClientRect();
      const title = document.getElementById("ma-how-title")?.getBoundingClientRect();
      return { hash: location.hash, navBottom: nav?.bottom ?? 0, titleTop: title?.top ?? -1 };
    });
    check("secondary CTA jumps to #how-it-works", anchor.hash === "#how-it-works", anchor.hash);
    check("steps title clears sticky nav", anchor.titleTop > anchor.navBottom - 4, `titleTop=${anchor.titleTop.toFixed(0)} navBottom=${anchor.navBottom.toFixed(0)}`);

    // direct hash load
    await page.goto(`${BASE}/#produktakte`, { waitUntil: "networkidle" });
    await settle(page, 1000);
    const hashLoad = await page.evaluate(() => {
      const nav = document.querySelector(".ma-nav")?.getBoundingClientRect();
      const title = document.getElementById("ma-record-title")?.getBoundingClientRect();
      return { navBottom: nav?.bottom ?? 0, titleTop: title?.top ?? -1 };
    });
    check("direct /#produktakte shows title below nav", hashLoad.titleTop > hashLoad.navBottom - 4, `titleTop=${hashLoad.titleTop.toFixed(0)}`);

    // 6/7/8. section screenshots
    for (const [id, file] of [["problem", "06-problem"], ["transformation", "07-transformation"], ["how-it-works", "08-three-steps"], ["produktakte", "09-product-record"], ["documents", "10-documents"], ["warranty", "11-warranty"], ["use-cases", "12-use-cases"], ["security", "13-trust"], ["pricing", "14-beta-pricing"], ["faq", "15-faq"], ["ma-final-title", "16-final-cta"]]) {
      await page.evaluate((elId) => document.getElementById(elId)?.scrollIntoView({ block: "start", behavior: "instant" }), id);
      await settle(page, 700);
      await page.screenshot({ path: `${OUT}/${file}.png` });
    }
    await page.evaluate(() => document.querySelector(".ma-footer")?.scrollIntoView({ block: "end", behavior: "instant" }));
    await settle(page, 500);
    await page.screenshot({ path: `${OUT}/17-footer.png` });

    // CTA targets (SPA route changes)
    await page.goto(BASE, { waitUntil: "networkidle" });
    await settle(page);
    await page.click(".ma-hero-actions a.ma-primary-button");
    await settle(page, 600);
    check("primary CTA → /login in invite-only mode", (await page.evaluate(() => location.pathname)) === "/login");
    await page.goBack();
    await settle(page);
    await page.evaluate(() => document.getElementById("ma-final-title")?.scrollIntoView({ behavior: "instant" }));
    await settle(page, 500);
    await page.click(".ma-final a.ma-primary-button");
    await settle(page, 600);
    check("closing CTA → /login in invite-only mode", (await page.evaluate(() => location.pathname)) === "/login");
    await page.goBack();
    await settle(page);

    // dead-link scan (visible <a> on the landing page)
    const links = await page.evaluate(() =>
      [...document.querySelectorAll("a[href]")]
        .filter((a) => a.offsetParent !== null)
        .map((a) => a.getAttribute("href"))
    );
    const dead = links.filter((h) => h === "#" || h === "" || h == null);
    check("no placeholder '#' links", dead.length === 0, `${links.length} links scanned`);

    // heading order: exactly one h1, h2s follow
    const headings = await page.evaluate(() => [...document.querySelectorAll("h1, h2, h3")].map((h) => h.tagName));
    check("exactly one h1", headings.filter((t) => t === "H1").length === 1);
    check("first heading is h1", headings[0] === "H1");

    // aria-hidden stage contains no focusable elements
    const hiddenFocusable = await page.evaluate(() =>
      document.querySelectorAll('.ma-world-stage a, .ma-world-stage button, .ma-world-stage [tabindex]').length
    );
    check("no interactive elements inside aria-hidden stage", hiddenFocusable === 0, String(hiddenFocusable));

    // DE/EN switch
    await page.click(".ma-nav [aria-label*='English'], .ma-nav button:has-text('English')").catch(() => {});
    await settle(page, 600);
    const enHero = await page.evaluate(() => document.querySelector("#ma-hero-title")?.textContent || "");
    check("EN switch shows English hero", /Everything that belongs/.test(enHero), enHero.slice(0, 60));
    const enLang = await page.evaluate(() => document.documentElement.lang);
    check("html lang switches to en", enLang === "en", enLang);
    const enOverflow = await overflowInfo(page);
    check("EN copy causes no overflow", !enOverflow.overflow);
    await page.screenshot({ path: `${OUT}/qa-language-switch-en.png` });

    await ctx.close();
  }

  /* ── reduced motion (fresh context) ── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await settle(page, 800);
    const rm = await page.evaluate(() => {
      const chip = document.querySelector(".ma-world-chip > span");
      const stage = document.querySelector(".ma-world-stage");
      const reveals = [...document.querySelectorAll(".site-reveal")];
      const hiddenReveals = reveals.filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.9).length;
      return {
        anim: getComputedStyle(chip).animationName,
        pauseVisible: !!document.querySelector(".ma-world-pause") && getComputedStyle(document.querySelector(".ma-world-pause")).display !== "none",
        p: stage.style.getPropertyValue("--p"),
        bar: getComputedStyle(document.querySelector(".ma-world-progress i")).width,
        hiddenReveals
      };
    });
    check("reduced motion: no float animation", rm.anim === "none", rm.anim);
    check("reduced motion: no scroll listener started (--p unset)", rm.p === "" || rm.p === "0", `p='${rm.p}'`);
    check("reduced motion: no invisible reveal content", rm.hiddenReveals === 0, `${rm.hiddenReveals} hidden`);
    await page.mouse.wheel(0, 500);
    await settle(page, 600);
    const pAfter = await page.evaluate(() => document.querySelector(".ma-world-stage").style.getPropertyValue("--p"));
    check("reduced motion: scrolling does not converge", pAfter === "" || pAfter === "0", `p='${pAfter}'`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page, 400);
    await page.screenshot({ path: `${OUT}/20-reduced-motion.png` });

    // live OS-setting change: reduce → no-preference resumes motion
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await settle(page, 500);
    const resumed = await page.evaluate(() => getComputedStyle(document.querySelector(".ma-world-chip > span")).animationName);
    check("live switch to no-preference resumes float", resumed.includes("ma-chip-float"), resumed);
    // and back: motion stops again, --p resets
    await page.emulateMedia({ reducedMotion: "reduce" });
    await settle(page, 500);
    const stoppedAgain = await page.evaluate(() => ({
      anim: getComputedStyle(document.querySelector(".ma-world-chip > span")).animationName,
      p: document.querySelector(".ma-world-stage").style.getPropertyValue("--p")
    }));
    check("live switch back to reduce stops motion (--p=0)", stoppedAgain.anim === "none" && stoppedAgain.p === "0", JSON.stringify(stoppedAgain));
    await ctx.close();
  }

  /* ── mobile static composition (375, fresh) ── */
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await settle(page, 800);
    const mobile = await page.evaluate(() => {
      const chip = document.querySelector(".ma-world-chip");
      const cs = getComputedStyle(chip);
      const inner = getComputedStyle(document.querySelector(".ma-world-chip > span"));
      return { position: cs.position, transform: cs.transform, anim: inner.animationName, productW: document.querySelector(".ma-product-svg")?.getBoundingClientRect().width };
    });
    check("mobile: chips static (no 3D)", mobile.position === "static" && mobile.transform === "none", JSON.stringify(mobile));
    check("mobile: no float animation", mobile.anim === "none", mobile.anim);
    await page.screenshot({ path: `${OUT}/18-mobile-hero.png` });
    const menuToggle = page.locator(".ma-menu-toggle");
    await menuToggle.click();
    await settle(page, 300);
    check("mobile navigation opens with aria-expanded=true", (await menuToggle.getAttribute("aria-expanded")) === "true");
    await page.screenshot({ path: `${OUT}/19-mobile-navigation.png` });
    await menuToggle.click();
    await page.evaluate(() => document.querySelector(".ma-world")?.scrollIntoView({ block: "center", behavior: "instant" }));
    await settle(page, 500);
    await page.screenshot({ path: `${OUT}/qa-mobile-spatial-world.png` });
    await ctx.close();
  }

  await browser.close();

  /* ── cross-browser smoke: firefox + webkit ── */
  for (const [engineName, engine] of [["firefox", firefox], ["webkit", webkit]]) {
    try {
      const b = await engine.launch();
      const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
      await page.goto(BASE, { waitUntil: "load" });
      await settle(page, 1200);
      const smoke = await page.evaluate(() => ({
        title: document.querySelector("#ma-hero-title")?.textContent?.slice(0, 30) || "",
        chips: document.querySelectorAll(".ma-world-chip").length,
        product: !!document.querySelector(".ma-product-svg"),
        navSticky: getComputedStyle(document.querySelector(".ma-nav")).position,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      }));
      check(`${engineName}: hero renders (title, 5 chips, product)`, smoke.title.length > 5 && smoke.chips === 5 && smoke.product, JSON.stringify(smoke));
      check(`${engineName}: no horizontal overflow`, !smoke.overflow);
      await page.evaluate(() => {
        const hero = document.querySelector(".ma-hero");
        const travel = Math.max(hero.offsetHeight - window.innerHeight * 0.82, window.innerHeight * 0.45);
        window.scrollTo({ top: hero.offsetTop + travel * 0.5, behavior: "instant" });
      });
      await page.mouse.wheel(0, 1).catch(() => {});
      await settle(page, 700);
      const pMid = parseFloat(await page.evaluate(() => document.querySelector(".ma-world-stage").style.getPropertyValue("--p") || "0"));
      check(`${engineName}: scroll convergence works`, pMid > 0.05, `--p=${pMid}`);
      await page.screenshot({ path: `${OUT}/browser-${engineName}-hero.png` });
      await b.close();
    } catch (error) {
      check(`${engineName}: smoke test ran`, false, String(error).slice(0, 120));
    }
  }

  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
  if (failures.length) {
    console.log("FAILURES:\n" + failures.map((f) => `  - ${f}`).join("\n"));
    process.exitCode = 1;
  }
}

run();
