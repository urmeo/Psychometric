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
      return test.questions.map(function (q) {
        return { test: testName, question: q.q, answer: "", score: scoreValue, time: 1, questionStartTime: "", answerTime: "" };
      });
    }

    function mockAnswersPerItem(testName, scores) {
      var test = C.tests.filter(function (t) { return t.name === testName; })[0];
      return test.questions.map(function (q, i) {
        return { test: testName, question: q.q, answer: "", score: scores[i], time: 1, questionStartTime: "", answerTime: "" };
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

    // Out-of-range scores must fail CLOSED (no label), never report the top band.
    assert(getInterp("HADS", "Anxiety", -1) === "", "HADS interp: below-min -> no label");
    assert(getInterp("HADS", "Anxiety", 99) === "", "HADS interp: above-max -> no label");
    assert(getInterp("STAI-S", "Total", 0) === "", "STAI-S interp: below-min -> no label");
    assert(getInterp("BFI", "Openness", 0.5) === "", "BFI interp: below-min -> no label");
    assert(getInterp("BFI", "Openness", 5.5) === "", "BFI interp: above-max -> no label");

    // FQ subscales
    assert(getInterp("FQ", "Agoraphobia", 5) !== "", "FQ Agoraphobia interp: 5 has label");
    assert(getInterp("FQ", "GlobalPhobiaRating", 1) !== "", "FQ GlobalPhobia interp: 1 has label");

    // ── CSV escape tests ────────────────────────────────────────────
    assert(csvEscape("hello") === "hello", "csvEscape: plain text unchanged");
    assert(csvEscape("hello,world") === '"hello,world"', "csvEscape: comma wrapped in quotes");
    assert(csvEscape('say "hi"') === '"say ""hi"""', "csvEscape: quotes doubled and wrapped");
    assert(csvEscape("line1\nline2") === '"line1\nline2"', "csvEscape: newline wrapped in quotes");

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

    // Render
    renderResults();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
