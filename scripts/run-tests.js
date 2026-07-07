const puppeteer = require("puppeteer");
const path = require("path");

const TEST_FILES = [
  { file: "tests/test-scoring.html", label: "English" },
  { file: "tests/test-scoring-fr.html", label: "French" },
];

async function runTestFile(browser, { file, label }) {
  const filePath = path.resolve(__dirname, "..", file);
  const url = `file://${filePath}`;

  console.log(`\n--- ${label} tests (${file}) ---`);

  const page = await browser.newPage();
  let pageErrors = 0;

  page.on("pageerror", (err) => {
    pageErrors++;
    console.error(`  Page error: ${err.message}`);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error(`  Console error: ${msg.text()}`);
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#test-results h2", { timeout: 15000 });

  const results = await page.evaluate(() => {
    const h2 = document.querySelector("#test-results h2");
    const rows = document.querySelectorAll("#test-results table tbody tr");
    const tests = [];
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      tests.push({
        name: cells[1].textContent.trim(),
        passed: cells[0].classList.contains("interp-normal"),
      });
    });
    return { summary: h2 ? h2.textContent.trim() : "", tests };
  });

  console.log(`  ${results.summary}`);
  await page.close();

  // Cross-check the scraped rows against the rendered summary so markup drift
  // can never produce a false green (0 rows scraped = 0 failures detected).
  const parsed = results.summary.match(/(\d+) passed, (\d+) failed/);
  if (!parsed) {
    console.error("  ERROR: could not parse the results summary");
    return 1;
  }
  const declared = { passed: +parsed[1], failed: +parsed[2] };
  if (results.tests.length !== declared.passed + declared.failed) {
    console.error(`  ERROR: scraped ${results.tests.length} rows but summary declares ${declared.passed + declared.failed}`);
    return 1;
  }

  const failures = results.tests.filter((t) => !t.passed);
  failures.forEach((t) => console.log(`  FAIL: ${t.name}`));
  if (failures.length !== declared.failed) {
    console.error(`  ERROR: row status disagrees with summary (${failures.length} vs ${declared.failed} failed)`);
    return 1;
  }
  if (pageErrors > 0) {
    console.error(`  ERROR: ${pageErrors} uncaught page error(s)`);
    return failures.length + pageErrors;
  }
  return failures.length;
}

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    let totalFailed = 0;
    for (const testFile of TEST_FILES) {
      totalFailed += await runTestFile(browser, testFile);
    }

    await browser.close();

    console.log(
      totalFailed === 0
        ? "\nAll tests passed."
        : `\n${totalFailed} test(s) failed.`
    );
    process.exit(totalFailed === 0 ? 0 : 1);
  } catch (err) {
    console.error("Test runner error:", err.message);
    if (browser) await browser.close();
    process.exit(1);
  }
})();
