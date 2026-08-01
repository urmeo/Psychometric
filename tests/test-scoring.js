// Psychometric Test Suite — unit tests
// Works with window.__TEST__ hook exposed by shared/app.js
(function () {
  "use strict";

  var passed = 0;
  var failed = 0;
  var results = [];

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push({ pass: true, msg: message });
    } else {
      failed++;
      results.push({ pass: false, msg: message });
    }
  }

  function approxEqual(a, b, eps) {
    return Math.abs(a - b) < (eps || 0.001);
  }

  function renderResults() {
    var container = document.getElementById("test-results");
    if (!container) return;
    var html = "<h2>Test Results: " + passed + " passed, " + failed + " failed</h2>";
    html += '<table class="table table-bordered"><thead><tr><th>Status</th><th>Test</th></tr></thead><tbody>';
    results.forEach(function (r) {
      var cls = r.pass ? "interp-normal" : "interp-abnormal";
      html += '<tr><td class="' + cls + '">' + (r.pass ? "PASS" : "FAIL") + "</td><td>" + r.msg + "</td></tr>";
    });
    html += "</tbody></table>";
    container.innerHTML = html;
  }

  // Wait for CONFIG and app.js to load
  function run() {
    var C = window.CONFIG;
    var T = window.__TEST__;

    if (!C || !T) {
      document.getElementById("test-results").innerHTML = "<p>ERROR: CONFIG or __TEST__ not found.</p>";
      return;
    }

    var state = T.state;
    var calcScores = T.calculateSummaryScores;
    var getInterp = T.getInterpretation;
    var csvEscape = T.csvEscape;

    // Helper to build mock answers for a test
    function mockAnswers(testName, scoreValue) {
      var test = C.tests.filter(function (t) { return t.name === testName; })[0];
      return test.questions.map(function (q, i) {
        return { test: testName, questionIndex: i + 1, question: q.q, answer: "", score: scoreValue, time: 1, questionStartTime: "", answerTime: "" };
      });
    }

    function mockAnswersPerItem(testName, scores) {
      var test = C.tests.filter(function (t) { return t.name === testName; })[0];
      return test.questions.map(function (q, i) {
        return { test: testName, questionIndex: i + 1, question: q.q, answer: "", score: scores[i], time: 1, questionStartTime: "", answerTime: "" };
      });
    }

    // ── HADS tests ──────────────────────────────────────────────────
    // All-zero
    state.tests = C.tests.filter(function (t) { return t.name === "HADS"; });
    state.answers = mockAnswers("HADS", 0);
    var s = calcScores();
    assert(s.HADS.Anxiety === 0, "HADS all-zero: Anxiety = 0");
    assert(s.HADS.Depression === 0, "HADS all-zero: Depression = 0");

    // All-max (score 3 for each item)
    state.answers = mockAnswers("HADS", 3);
    s = calcScores();
    assert(s.HADS.Anxiety === 21, "HADS all-3: Anxiety = 21");
    assert(s.HADS.Depression === 21, "HADS all-3: Depression = 21");

    // ── STAI-S tests ────────────────────────────────────────────────
    state.tests = C.tests.filter(function (t) { return t.name === "STAI-S"; });
    state.answers = mockAnswers("STAI-S", 1);
    s = calcScores();
    assert(s["STAI-S"] === 20, "STAI-S all-1: Total = 20");

    state.answers = mockAnswers("STAI-S", 4);
    s = calcScores();
    assert(s["STAI-S"] === 80, "STAI-S all-4: Total = 80");

    // ── STAI-T tests ────────────────────────────────────────────────
    state.tests = C.tests.filter(function (t) { return t.name === "STAI-T"; });
    state.answers = mockAnswers("STAI-T", 1);
    s = calcScores();
    assert(s["STAI-T"] === 20, "STAI-T all-1: Total = 20");

    state.answers = mockAnswers("STAI-T", 4);
    s = calcScores();
    assert(s["STAI-T"] === 80, "STAI-T all-4: Total = 80");

    // ── BFI tests ───────────────────────────────────────────────────
    state.tests = C.tests.filter(function (t) { return t.name === "BFI"; });
    state.answers = mockAnswers("BFI", 3);
    s = calcScores();
    assert(approxEqual(s.BFI.Openness, 3.0), "BFI all-3: Openness = 3.0");
    assert(approxEqual(s.BFI.Conscientiousness, 3.0), "BFI all-3: Conscientiousness = 3.0");
    assert(approxEqual(s.BFI.Extraversion, 3.0), "BFI all-3: Extraversion = 3.0");
    assert(approxEqual(s.BFI.Agreeableness, 3.0), "BFI all-3: Agreeableness = 3.0");
    assert(approxEqual(s.BFI.Neuroticism, 3.0), "BFI all-3: Neuroticism = 3.0");

    // ── FQ tests ────────────────────────────────────────────────────
    // Verify subscale item counts from scoring config
    var fqCfg = C.scoring.FQ.subscales;
    assert(fqCfg.Agoraphobia.length === 5, "FQ config: 5 Agoraphobia items");
    assert(fqCfg.BloodInjuryPhobia.length === 5, "FQ config: 5 BloodInjuryPhobia items");
    assert(fqCfg.SocialPhobia.length === 5, "FQ config: 5 SocialPhobia items");
    assert(fqCfg.TotalPhobia.length === 15, "FQ config: 15 TotalPhobia items");

    // FQ all-zero
    state.tests = C.tests.filter(function (t) { return t.name === "FQ"; });
    state.answers = mockAnswers("FQ", 0);
    s = calcScores();
    assert(s.FQ.Agoraphobia === 0, "FQ all-0: Agoraphobia = 0");
    assert(s.FQ.TotalPhobia === 0, "FQ all-0: TotalPhobia = 0");

    // FQ all-8 (max per item)
    state.answers = mockAnswers("FQ", 8);
    s = calcScores();
    assert(s.FQ.Agoraphobia === 40, "FQ all-8: Agoraphobia = 40");
    assert(s.FQ.BloodInjuryPhobia === 40, "FQ all-8: BloodInjuryPhobia = 40");
    assert(s.FQ.SocialPhobia === 40, "FQ all-8: SocialPhobia = 40");
    assert(s.FQ.TotalPhobia === 120, "FQ all-8: TotalPhobia = 120");

    // ── Interpretation threshold tests ──────────────────────────────
    // HADS
    assert(getInterp("HADS", "Anxiety", 0) !== "", "HADS interp: score 0 has label");
    assert(getInterp("HADS", "Anxiety", 7) === getInterp("HADS", "Anxiety", 0), "HADS interp: 7 same as 0 (Normal/Normal)");
    assert(getInterp("HADS", "Anxiety", 8) !== getInterp("HADS", "Anxiety", 7), "HADS interp: 8 differs from 7 (boundary)");
    assert(getInterp("HADS", "Anxiety", 11) !== getInterp("HADS", "Anxiety", 10), "HADS interp: 11 differs from 10 (boundary)");

    // STAI
    assert(getInterp("STAI-S", "Total", 20) !== "", "STAI-S interp: score 20 has label");
    assert(getInterp("STAI-S", "Total", 37) !== getInterp("STAI-S", "Total", 38), "STAI-S interp: 37 vs 38 boundary");
    assert(getInterp("STAI-S", "Total", 44) !== getInterp("STAI-S", "Total", 45), "STAI-S interp: 44 vs 45 boundary");

    // BFI
    assert(getInterp("BFI", "Openness", 1.5) !== "", "BFI interp: 1.5 has label");
    assert(getInterp("BFI", "Openness", 2) !== getInterp("BFI", "Openness", 3), "BFI interp: 2 vs 3 boundary");
    assert(T.interpClass(getInterp("BFI", "Openness", 5)) === "", "BFI: top of scale is not colored as clinical severity");

    // Boundary means 2.5 and 3.5 are equidistant from the midpoint and must land
    // in the same (middle) band.
    var bfiMid = C.thresholds.BFI._default.ranges[1][2];
    assert(getInterp("BFI", "Openness", 2.5) === bfiMid, "BFI interp: 2.5 -> middle band");
    assert(getInterp("BFI", "Openness", 3.5) === bfiMid, "BFI interp: 3.5 -> middle band");

    // Out-of-range scores must fail CLOSED (no label), never report the top band.
    assert(getInterp("HADS", "Anxiety", -1) === "", "HADS interp: below-min -> no label");
    assert(getInterp("HADS", "Anxiety", 99) === "", "HADS interp: above-max -> no label");
    assert(getInterp("STAI-S", "Total", 0) === "", "STAI-S interp: below-min -> no label");
    assert(getInterp("BFI", "Openness", 0.5) === "", "BFI interp: below-min -> no label");
    assert(getInterp("BFI", "Openness", 5.5) === "", "BFI interp: above-max -> no label");

    // FQ subscales
    assert(getInterp("FQ", "Agoraphobia", 5) !== "", "FQ Agoraphobia interp: 5 has label");
    assert(getInterp("FQ", "GlobalPhobiaRating", 1) !== "", "FQ GlobalPhobia interp: 1 has label");

    // ── Position-independence: scoring follows questionIndex, not order ──
    // Answers carrying correct questionIndex but shuffled in the array must still
    // route to the right subscale — proving scoring no longer keys off position.
    var hadsQs = C.tests.filter(function (t) { return t.name === "HADS"; })[0].questions;
    state.tests = C.tests.filter(function (t) { return t.name === "HADS"; });
    var built = hadsQs.map(function (q, i) {
      return { test: "HADS", questionIndex: i + 1, question: q.q, answer: "", score: i + 1, time: 1, questionStartTime: "", answerTime: "" };
    });
    state.answers = built.slice().reverse();
    s = calcScores();
    assert(s.HADS.Anxiety === (1 + 3 + 5 + 7 + 9 + 11 + 13), "HADS scoring follows questionIndex even when answers are shuffled");
    assert(s.HADS.Depression === (2 + 4 + 6 + 8 + 10 + 12 + 14), "HADS Depression follows questionIndex when shuffled");

    // ── Config integrity tests ──────────────────────────────────────
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    assert(T.validateConfig(C).length === 0, "validateConfig: live config has no structural problems");
    var badScores = clone(C); badScores.tests[0].questions[0].scores = [1, 2];
    assert(T.validateConfig(badScores).length > 0, "validateConfig: catches options/scores length mismatch");
    var badIndex = clone(C); badIndex.scoring.HADS.subscales.Anxiety.push(99);
    assert(T.validateConfig(badIndex).length > 0, "validateConfig: catches out-of-range item index");
    var badRange = clone(C); badRange.thresholds.HADS.Anxiety.ranges[0] = [10, 0, "Bad"];
    assert(T.validateConfig(badRange).length > 0, "validateConfig: catches lo > hi range");
    var badOverlap = clone(C); badOverlap.thresholds.HADS.Anxiety.ranges = [[0, 7, "A"], [7, 21, "B"]];
    assert(T.validateConfig(badOverlap).length > 0, "validateConfig: catches shared-boundary overlap");

    // ── CSV escape tests ────────────────────────────────────────────
    assert(csvEscape("hello") === "hello", "csvEscape: plain text unchanged");
    assert(csvEscape("hello,world") === '"hello,world"', "csvEscape: comma wrapped in quotes");
    assert(csvEscape('say "hi"') === '"say ""hi"""', "csvEscape: quotes doubled and wrapped");
    assert(csvEscape("line1\nline2") === '"line1\nline2"', "csvEscape: newline wrapped in quotes");

    // Spreadsheet formula injection must be neutralized with a leading quote.
    assert(csvEscape("=1+1") === "'=1+1", "csvEscape: = prefix neutralized");
    assert(csvEscape("+SUM(A1)") === "'+SUM(A1)", "csvEscape: + prefix neutralized");
    assert(csvEscape("-2") === "'-2", "csvEscape: - prefix neutralized");
    assert(csvEscape("@cmd") === "'@cmd", "csvEscape: @ prefix neutralized");
    assert(csvEscape("=a,b") === "\"'=a,b\"", "csvEscape: injection guard composes with quoting");

    // ── Score formatting (shared by table, CSV, PDF) ────────────────
    var fmt = T.formatScoreValue;
    assert(fmt(3) === "3", "formatScoreValue: integer unchanged");
    assert(fmt(4) === "4", "formatScoreValue: whole number gets no decimals");
    assert(fmt(3.33333) === "3.33", "formatScoreValue: non-integer rounded to 2 decimals");

    // ── Per-item mapping tests ──────────────────────────────────────
    // Uniform answers (all-0, all-3…) can't detect a mis-mapped item, since
    // every subscale sums to the same value. These use DISTINCT per-item
    // scores, so each subscale/trait must select exactly the right questions.

    // HADS: score anxiety items 1, depression items 0 → Anxiety isolated.
    var hadsAnx = C.scoring.HADS.subscales.Anxiety;
    state.tests = C.tests.filter(function (t) { return t.name === "HADS"; });
    var hadsScores = state.tests[0].questions.map(function (q, i) {
      return hadsAnx.indexOf(i + 1) !== -1 ? 1 : 0;
    });
    state.answers = mockAnswersPerItem("HADS", hadsScores);
    s = calcScores();
    assert(s.HADS.Anxiety === hadsAnx.length, "HADS mapping: Anxiety isolates its own items");
    assert(s.HADS.Depression === 0, "HADS mapping: Depression unaffected by Anxiety items");

    // BFI: distinct per-item scores prove each trait maps to the right items.
    state.tests = C.tests.filter(function (t) { return t.name === "BFI"; });
    state.answers = mockAnswersPerItem("BFI", [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
    s = calcScores();
    assert(approxEqual(s.BFI.Extraversion, 1.0), "BFI mapping: Extraversion = items 1,6");
    assert(approxEqual(s.BFI.Agreeableness, 2.0), "BFI mapping: Agreeableness = items 2,7");
    assert(approxEqual(s.BFI.Conscientiousness, 3.0), "BFI mapping: Conscientiousness = items 3,8");
    assert(approxEqual(s.BFI.Neuroticism, 4.0), "BFI mapping: Neuroticism = items 4,9");
    assert(approxEqual(s.BFI.Openness, 5.0), "BFI mapping: Openness = items 5,10");

    // FQ: score only Agoraphobia items → sibling subscales stay 0.
    var fqAgora = C.scoring.FQ.subscales.Agoraphobia;
    state.tests = C.tests.filter(function (t) { return t.name === "FQ"; });
    var fqScores = state.tests[0].questions.map(function (q, i) {
      return fqAgora.indexOf(i + 1) !== -1 ? 8 : 0;
    });
    state.answers = mockAnswersPerItem("FQ", fqScores);
    s = calcScores();
    assert(s.FQ.Agoraphobia === fqAgora.length * 8, "FQ mapping: Agoraphobia isolates its own items");
    assert(s.FQ.SocialPhobia === 0, "FQ mapping: SocialPhobia unaffected");
    assert(s.FQ.BloodInjuryPhobia === 0, "FQ mapping: BloodInjuryPhobia unaffected");
    assert(s.FQ.TotalPhobia === fqAgora.length * 8, "FQ mapping: TotalPhobia includes Agoraphobia items");

    // ── Reverse-scoring keying (English option order) ─────────────────
    // Agreeing with a reverse-worded item must land on the LOW end of its
    // construct. Option order is locale-specific, so guard to English.
    if (C.lang === "en") {
      var bfi = C.tests.filter(function (t) { return t.name === "BFI"; })[0].questions;
      assert(bfi[0].scores[0] === 1, "BFI keying: 'reserved' + strongly agree -> low Extraversion");
      assert(bfi[5].scores[0] === 5, "BFI keying: 'outgoing' + strongly agree -> high Extraversion");
      assert(bfi[3].scores[0] === 1, "BFI keying: 'handles stress well' + strongly agree -> low Neuroticism");
      assert(bfi[8].scores[0] === 5, "BFI keying: 'nervous easily' + strongly agree -> high Neuroticism");

      var staiS = C.tests.filter(function (t) { return t.name === "STAI-S"; })[0].questions;
      assert(staiS[0].scores[0] === 4, "STAI-S keying: 'I feel calm' reverse-scored (not at all -> 4)");
      assert(staiS[2].scores[0] === 1, "STAI-S keying: 'I am tense' direct-scored (not at all -> 1)");
    }

    // ── FQ EN/FR divergence point (GlobalPhobiaRating vs AnxietyDepression) ──
    // These two subscales sit at different item indices in EN vs FR. Pin each
    // language's own mapping AND isolate the items, so a mis-map or an accidental
    // EN=FR alignment fails loudly instead of silently mis-scoring phobia severity.
    var fqSub = C.scoring.FQ.subscales;
    var expectedFq = C.lang === "fr"
      ? { GlobalPhobiaRating: [24], AnxietyDepression: [18, 19, 20, 21, 22] }
      : { GlobalPhobiaRating: [18], AnxietyDepression: [19, 20, 21, 22, 23] };
    assert(JSON.stringify(fqSub.GlobalPhobiaRating) === JSON.stringify(expectedFq.GlobalPhobiaRating), "FQ config: GlobalPhobiaRating indices match this language's form");
    assert(JSON.stringify(fqSub.AnxietyDepression) === JSON.stringify(expectedFq.AnxietyDepression), "FQ config: AnxietyDepression indices match this language's form");

    state.tests = C.tests.filter(function (t) { return t.name === "FQ"; });
    var gItems = fqSub.GlobalPhobiaRating;
    var gScores = state.tests[0].questions.map(function (q, i) { return gItems.indexOf(i + 1) !== -1 ? 8 : 0; });
    state.answers = mockAnswersPerItem("FQ", gScores);
    s = calcScores();
    assert(s.FQ.GlobalPhobiaRating === gItems.length * 8, "FQ mapping: GlobalPhobiaRating isolates its own item(s)");
    assert(s.FQ.AnxietyDepression === 0, "FQ mapping: AnxietyDepression unaffected by GlobalPhobiaRating");

    var adItems = fqSub.AnxietyDepression;
    var adScores = state.tests[0].questions.map(function (q, i) { return adItems.indexOf(i + 1) !== -1 ? 8 : 0; });
    state.answers = mockAnswersPerItem("FQ", adScores);
    s = calcScores();
    assert(s.FQ.AnxietyDepression === adItems.length * 8, "FQ mapping: AnxietyDepression isolates its own items");
    assert(s.FQ.GlobalPhobiaRating === 0, "FQ mapping: GlobalPhobiaRating unaffected by AnxietyDepression");
    assert(s.FQ.TotalPhobia === 0, "FQ mapping: TotalPhobia excludes AnxietyDepression items");

    // ── STAI reverse-key sets (both languages, read from option order) ──
    // A reverse-keyed item scores the "anxiety-absent" answer high (scores[0] === 4).
    // Uniform-answer totals can't catch a broken reverse map; this can.
    function reverseSet(name) {
      var qs = C.tests.filter(function (t) { return t.name === name; })[0].questions;
      var out = [];
      qs.forEach(function (q, i) { if (q.scores[0] === 4) out.push(i + 1); });
      return out;
    }
    assert(JSON.stringify(reverseSet("STAI-S")) === JSON.stringify([1, 2, 5, 8, 10, 11, 15, 16, 19, 20]), "STAI-S reverse set matches Form Y");
    var expectedT = C.lang === "fr" ? [1, 3, 6, 7, 10, 13, 14, 16, 19] : [1, 6, 7, 10, 13, 16, 19];
    assert(JSON.stringify(reverseSet("STAI-T")) === JSON.stringify(expectedT), "STAI-T reverse set matches this language's form");

    var staiTQs = C.tests.filter(function (t) { return t.name === "STAI-T"; })[0].questions;
    var cleanKeying = staiTQs.every(function (q) {
      var k = JSON.stringify(q.scores);
      return k === "[4,3,2,1]" || k === "[1,2,3,4]";
    });
    assert(cleanKeying, "STAI-T: every item is a clean reverse (4..1) or direct (1..4) keying");

    // Non-uniform answers: total scoring must sum exactly, with no dropped or
    // duplicated items. (Reverse-keying itself is guarded by the reverseSet
    // assertions above — it is applied at capture, not at summation.)
    state.tests = C.tests.filter(function (t) { return t.name === "STAI-T"; });
    var mixT = staiTQs.map(function (q, i) { return q.scores[i % 4]; });
    state.answers = mockAnswersPerItem("STAI-T", mixT);
    s = calcScores();
    assert(s["STAI-T"] === mixT.reduce(function (a, b) { return a + b; }, 0), "STAI-T mixed answers total correctly");

    // ── Threshold band labels (read expected label from CONFIG) ────────
    // Stronger than "differs from neighbour": assert each boundary score
    // returns its OWN band's label. Reading the label from CONFIG keeps this
    // language-agnostic.
    var hadsR = C.thresholds.HADS.Anxiety.ranges;
    assert(getInterp("HADS", "Anxiety", 7) === hadsR[0][2], "HADS band: 7 -> band 1");
    assert(getInterp("HADS", "Anxiety", 8) === hadsR[1][2], "HADS band: 8 -> band 2");
    assert(getInterp("HADS", "Anxiety", 10) === hadsR[1][2], "HADS band: 10 -> band 2");
    assert(getInterp("HADS", "Anxiety", 11) === hadsR[2][2], "HADS band: 11 -> band 3");

    var staiR = C.thresholds["STAI-S"].Total.ranges;
    assert(getInterp("STAI-S", "Total", 37) === staiR[0][2], "STAI-S band: 37 -> band 1");
    assert(getInterp("STAI-S", "Total", 38) === staiR[1][2], "STAI-S band: 38 -> band 2");
    assert(getInterp("STAI-S", "Total", 44) === staiR[1][2], "STAI-S band: 44 -> band 2");
    assert(getInterp("STAI-S", "Total", 45) === staiR[2][2], "STAI-S band: 45 -> band 3");

    var fqR = C.thresholds.FQ.TotalPhobia.ranges;
    assert(getInterp("FQ", "TotalPhobia", 30) === fqR[0][2], "FQ band: 30 -> band 1");
    assert(getInterp("FQ", "TotalPhobia", 31) === fqR[1][2], "FQ band: 31 -> band 2");
    assert(getInterp("FQ", "TotalPhobia", 60) === fqR[1][2], "FQ band: 60 -> band 2");
    assert(getInterp("FQ", "TotalPhobia", 61) === fqR[2][2], "FQ band: 61 -> band 3");

    // ── Interpretation → CSS class (color coding) ─────────────────────
    // "abnormal"/"anormal" contain "normal", so the check order matters.
    // Lock it in both languages.
    var ic = T.interpClass;
    assert(ic("Abnormal") === "interp-abnormal", "interpClass: Abnormal not misread as normal");
    assert(ic("Anormal") === "interp-abnormal", "interpClass: French Anormal -> abnormal");
    assert(ic("High anxiety") === "interp-abnormal", "interpClass: High -> abnormal");
    assert(ic("Severe") === "interp-abnormal", "interpClass: Severe -> abnormal");
    assert(ic("Borderline") === "interp-moderate", "interpClass: Borderline -> moderate");
    assert(ic("Moderate anxiety") === "interp-moderate", "interpClass: Moderate -> moderate");
    assert(ic("Average") === "interp-moderate", "interpClass: Average -> moderate");
    assert(ic("Normal") === "interp-normal", "interpClass: Normal -> normal");
    assert(ic("Low anxiety") === "interp-normal", "interpClass: Low -> normal");
    assert(ic("") === "", "interpClass: empty label -> no class");

    // ── Full-battery integration (all five instruments at once) ──────
    // Drives calculateSummaryScores + getInterpretation + interpClass across the
    // whole battery in one pass, the way a completed session does.
    state.tests = C.tests.slice();
    var battery = [];
    [["HADS", 2], ["STAI-S", 3], ["STAI-T", 2], ["BFI", 4], ["FQ", 4]].forEach(function (p) {
      battery = battery.concat(mockAnswers(p[0], p[1]));
    });
    state.answers = battery;
    var full = calcScores();
    assert(full.HADS.Anxiety === 14 && full.HADS.Depression === 14, "battery: HADS subscales = 14 each");
    assert(full["STAI-S"] === 60, "battery: STAI-S total = 60");
    assert(full["STAI-T"] === 40, "battery: STAI-T total = 40");
    assert(approxEqual(full.BFI.Openness, 4.0), "battery: BFI Openness mean = 4.0");
    assert(full.FQ.Agoraphobia === 20 && full.FQ.TotalPhobia === 60, "battery: FQ Agoraphobia = 20, TotalPhobia = 60");
    assert(T.interpClass(getInterp("HADS", "Anxiety", full.HADS.Anxiety)) === "interp-abnormal", "battery: HADS Anxiety 14 -> abnormal");
    assert(T.interpClass(getInterp("STAI-S", "Total", full["STAI-S"])) === "interp-abnormal", "battery: STAI-S 60 -> high anxiety");
    assert(T.interpClass(getInterp("BFI", "Openness", full.BFI.Openness)) === "", "battery: BFI trait carries no clinical color");

    // ── CSV round trip: the export must re-score to its own summary ────
    // The CSV is the artifact the tool exists to produce, so the check is the
    // one a re-analysis actually performs: parse the individual-response rows
    // back out of the emitted text, re-score them, and compare against the
    // summary block that same CSV wrote.

    // RFC 4180 reader: handles quoted fields, doubled quotes and embedded
    // commas/newlines, so it reads whatever csvEscape legitimately emits.
    function parseCsv(text) {
      var rows = [], row = [], field = "", inQuotes = false;
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        if (inQuotes) {
          if (ch !== '"') { field += ch; }
          else if (text.charAt(i + 1) === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { row.push(field); field = ""; }
        else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else { field += ch; }
      }
      if (field !== "" || row.length) { row.push(field); rows.push(row); }
      return rows;
    }

    // A section is its title row, then a header row, then rows up to the blank
    // line that separates it from the next section.
    function csvSection(rows, title) {
      var start = -1;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].length === 1 && rows[i][0] === title) { start = i; break; }
      }
      if (start === -1 || start + 1 >= rows.length) return null;
      var section = { header: rows[start + 1], rows: [] };
      for (var j = start + 2; j < rows.length; j++) {
        if (rows[j].length === 1 && rows[j][0] === "") break;
        section.rows.push(rows[j]);
      }
      return section;
    }

    // Distinct per-item scores across the whole battery: a dropped, duplicated
    // or mis-indexed row changes at least one subscale.
    state.tests = C.tests.slice();
    state.participantId = "P-ROUNDTRIP";
    state.testStartTime = new Date(Date.now() - 60000);
    state.testEndTime = new Date();
    var exported = [];
    state.tests.forEach(function (t) {
      t.questions.forEach(function (q, i) {
        exported.push({
          test: t.name,
          questionIndex: i + 1,
          question: q.q,
          answer: q.options[i % q.options.length],
          score: q.scores[i % q.scores.length],
          time: 1.5,
          questionStartTime: "2020-01-01T00:00:00.000Z",
          answerTime: "2020-01-01T00:00:02.000Z",
        });
      });
    });
    state.answers = exported;

    var csvText = T.buildCsv();
    assert(csvText.charAt(0) === "\uFEFF", "CSV: byte-order mark present for Excel");
    var csvRows = parseCsv(csvText.slice(1));
    var detail = csvSection(csvRows, C.ui.csvDetailTitle);
    var summarySection = csvSection(csvRows, C.ui.csvSummaryTitle);
    assert(!!detail && !!summarySection, "CSV: summary and individual-response sections both present");

    assert(detail.header.join(",") === C.ui.csvHeaders, "CSV: response header row matches ui.csvHeaders");
    // "Item" is deliberately the same token in both locales.
    assert(detail.header[1] === "Item", "CSV: Item column is the second response column");
    assert(detail.header.length === 8, "CSV: response rows carry 8 columns");
    assert(detail.rows.length === exported.length, "CSV: one response row per recorded answer");
    assert(detail.rows.every(function (r) { return r.length === detail.header.length; }), "CSV: every response row has as many fields as the header");

    var reparsed = detail.rows.map(function (r) {
      return {
        test: r[0],
        questionIndex: Number(r[1]),
        question: r[2],
        answer: r[3],
        score: Number(r[4]),
        time: Number(r[5]),
        questionStartTime: r[6],
        answerTime: r[7],
      };
    });
    assert(reparsed.every(function (a, i) {
      return a.test === exported[i].test && a.questionIndex === exported[i].questionIndex &&
             a.score === exported[i].score && a.answer === exported[i].answer;
    }), "CSV: test, item index, answer and score survive the export unchanged");

    // Reversed before re-scoring: with the item index in the file, row order
    // carries no information, which is exactly what makes the export re-usable.
    state.answers = reparsed.slice().reverse();
    var rescored = calcScores();
    var summaryRows = summarySection.rows;
    var mismatched = [];
    var badInterp = [];
    summaryRows.forEach(function (r) {
      var value = rescored[r[0]];
      // A total-score test exports ui.totalLabel in the subscale column and is
      // interpreted with a null subscale, the way buildCsv wrote it.
      var sub = (value && typeof value === "object") ? r[1] : null;
      if (sub) value = value[sub];
      if (typeof value !== "number" || T.formatScoreValue(value) !== r[2]) {
        mismatched.push(r[0] + "/" + r[1] + " exported " + r[2] + ", re-scored " + value);
      } else if (getInterp(r[0], sub, value) !== r[3]) {
        // Guard the label too: a re-analysis reads it, and a label that
        // disagrees with its own score is a clinically misleading export.
        badInterp.push(r[0] + "/" + r[1] + " exported " + r[3]);
      }
    });
    assert(summaryRows.length > 0, "CSV: summary section is not empty");
    assert(mismatched.length === 0, "CSV round trip: re-scored responses reproduce every exported summary row" +
      (mismatched.length ? " — " + mismatched.join("; ") : ""));
    assert(badInterp.length === 0, "CSV round trip: every exported interpretation matches its re-scored value" +
      (badInterp.length ? " — " + badInterp.join("; ") : ""));

    // A session saved before questionIndex existed still exports a usable Item:
    // the answer's position within its own test, which is what the scorer uses.
    state.tests = C.tests.filter(function (t) { return t.name === "HADS"; });
    state.answers = [1, 2, 3].map(function (n) {
      return { test: "HADS", question: "legacy item " + n, answer: "", score: 0, time: 1, questionStartTime: "", answerTime: "" };
    });
    var legacy = csvSection(parseCsv(T.buildCsv().slice(1)), C.ui.csvDetailTitle);
    assert(legacy.rows.map(function (r) { return r[1]; }).join(",") === "1,2,3",
      "CSV: answers stored without an item index fall back to their position in the test");

    // Render
    renderResults();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
