/**
 * Psychometric Test Suite — shared application logic.
 *
 * An IIFE that reads all configuration (UI strings, test questions, scoring
 * rules, interpretation thresholds) from {@link window.CONFIG}, which must be
 * set by a language module (lang/en.js or lang/fr.js) loaded before this file.
 *
 * Scoring modes (driven by CONFIG.scoring[testName].type):
 *  - "total"         — sum of all item scores (STAI-S, STAI-T)
 *  - "subscale"      — sum items per subscale index list (HADS, FQ)
 *  - "trait-average"  — sum then divide by item count per trait (BFI-10)
 *
 * @file shared/app.js
 */
(function () {
  "use strict";

  var C = window.CONFIG;
  var ui = C.ui;
  var allTests = C.tests;

  // ── DOM helpers (jQuery replacement) ──────────────────────────────

  /**
   * Shorthand for document.querySelector.
   * @param {string} sel - CSS selector
   * @returns {Element|null}
   */
  function $(sel) { return document.querySelector(sel); }

  /**
   * Shorthand for document.querySelectorAll.
   * @param {string} sel - CSS selector
   * @returns {NodeList}
   */
  function $$(sel) { return document.querySelectorAll(sel); }

  /**
   * Create a DOM element with optional attributes and children.
   *
   * Special attribute keys:
   *  - "text"      → sets textContent (safe, no HTML injection)
   *  - "html"      → sets innerHTML (use only with trusted content)
   *  - "className" → sets the element's className property
   *  - all others  → passed to setAttribute()
   *
   * @param {string} tag - HTML tag name
   * @param {Object|null} attrs - Attribute map (may include "text", "html", "className")
   * @param {Array<Element|string>} [children] - Child nodes or text strings to append
   * @returns {Element}
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") { node.textContent = attrs[k]; }
      else if (k === "html") { node.innerHTML = attrs[k]; }
      else if (k === "className") { node.className = attrs[k]; }
      else { node.setAttribute(k, attrs[k]); }
    });
    if (children) children.forEach(function (c) {
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    });
    return node;
  }

  /** Remove all child nodes from an element. @param {Element} node */
  function empty(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  /** @param {Element} node @param {string} cls */
  function addClass(node, cls) { node.classList.add(cls); }
  /** @param {Element} node @param {string} cls */
  function removeClass(node, cls) { node.classList.remove(cls); }

  // ── State ─────────────────────────────────────────────────────────
  /**
   * Mutable application state shared across all functions.
   * Exposed to tests via window.__TEST__.state.
   * @type {{
   *   currentTestIndex: number,
   *   currentQuestionIndex: number,
   *   totalQuestions: number,
   *   answers: Array<{test:string, question:string, answer:string, score:number, time:number, questionStartTime:string, answerTime:string}>,
   *   testStartTime: Date|null,
   *   questionStartTime: Date|null,
   *   testInProgress: boolean,
   *   participantId: string,
   *   tests: Array<Object>
   * }}
   */
  var state = {
    currentTestIndex: 0,
    currentQuestionIndex: 0,
    totalQuestions: 0,
    answers: [],
    testStartTime: null,
    testEndTime: null,
    questionStartTime: null,
    resultsExported: false,
    testInProgress: false,
    participantId: "",
    tests: [],
  };

  // ── Persistence ───────────────────────────────────────────────────

  /** Serialize current state to localStorage so the session can be resumed. */
  function saveProgress() {
    try {
      localStorage.setItem(C.storageKey, JSON.stringify({
        participantId: state.participantId,
        currentTestIndex: state.currentTestIndex,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        testStartTime: state.testStartTime ? state.testStartTime.toISOString() : null,
        selectedTestNames: state.tests.map(function (t) { return t.name; }),
      }));
    } catch (e) { /* localStorage full or disabled — session won't resume but test continues */ }
  }

  /**
   * Load a previously saved session from localStorage.
   * @returns {Object|null} Saved state object, or null if none exists
   */
  function loadProgress() {
    try {
      var d = JSON.parse(localStorage.getItem(C.storageKey));
      return d && Array.isArray(d.answers) && d.answers.length > 0 ? d : null;
    } catch (e) { return null; }
  }

  /** Remove saved session data from localStorage. */
  function clearProgress() { try { localStorage.removeItem(C.storageKey); } catch (e) { /* ignore */ } }

  // ── Scoring ───────────────────────────────────────────────────────

  /**
   * Compute summary scores for every selected test based on CONFIG.scoring rules.
   *
   * Scoring types handled:
   *  - "total": simple sum of all item scores → returns a number
   *  - "subscale": sum items belonging to each subscale (by 1-based question
   *    number) → returns {subscaleName: number, …}
   *  - "trait-average": sum items per trait then divide by the trait's item
   *    count → returns {traitName: number, …}
   *
   * If no scoring config exists for a test, falls back to a simple sum.
   *
   * @returns {Object<string, number|Object<string, number>>} Map of test name
   *   to either a total score (number) or an object of subscale/trait scores
   */
  function calculateSummaryScores() {
    var scores = {};
    state.tests.forEach(function (test) {
      var testAnswers = state.answers.filter(function (a) { return a.test === test.name; });
      var cfg = C.scoring[test.name];
      if (!cfg) {
        scores[test.name] = testAnswers.reduce(function (acc, a) { return acc + a.score; }, 0);
        return;
      }
      if (cfg.type === "total") {
        scores[test.name] = testAnswers.reduce(function (acc, a) { return acc + a.score; }, 0);
      } else if (cfg.type === "subscale") {
        scores[test.name] = {};
        var subs = cfg.subscales;
        Object.keys(subs).forEach(function (s) { scores[test.name][s] = 0; });
        testAnswers.forEach(function (a, idx) {
          var qNum = a.questionIndex != null ? a.questionIndex : idx + 1;
          Object.keys(subs).forEach(function (s) {
            if (subs[s].indexOf(qNum) !== -1) scores[test.name][s] += a.score;
          });
        });
      } else if (cfg.type === "trait-average") {
        scores[test.name] = {};
        var traits = cfg.traits;
        Object.keys(traits).forEach(function (t) { scores[test.name][t] = 0; });
        testAnswers.forEach(function (a, idx) {
          var qNum = a.questionIndex != null ? a.questionIndex : idx + 1;
          Object.keys(traits).forEach(function (t) {
            if (traits[t].indexOf(qNum) !== -1) scores[test.name][t] += a.score;
          });
        });
        Object.keys(traits).forEach(function (t) {
          scores[test.name][t] /= traits[t].length;
        });
      }
    });
    return scores;
  }

  /**
   * Look up a clinical interpretation label for a given score.
   *
   * Searches CONFIG.thresholds[testName] for a matching range. Falls back to
   * the "_default" entry if no subscale-specific thresholds exist (used by BFI).
   *
   * @param {string} testName - Test identifier (e.g. "HADS", "STAI-S", "BFI")
   * @param {string|null} subScale - Subscale or trait name, or null for total-score tests
   * @param {number} score - The computed score to classify
   * @returns {string} Interpretation label (e.g. "Normal", "Borderline", "Abnormal"), or ""
   */
  function getInterpretation(testName, subScale, score) {
    var testThresh = C.thresholds[testName];
    if (!testThresh) return "";
    var key = subScale || "Total";
    var entry = testThresh[key] || testThresh._default;
    if (!entry) return "";
    var ranges = entry.ranges;
    for (var i = 0; i < ranges.length; i++) {
      if (score >= ranges[i][0] && score <= ranges[i][1]) return ranges[i][2];
    }
    // Fail closed: an out-of-range score returns no label rather than silently
    // reporting the highest-severity band.
    return "";
  }

  /**
   * Map an interpretation label to a CSS class for color-coded display.
   *
   * Checks substrings in a specific order to avoid false matches (e.g.
   * "abnormal" contains "normal", so abnormal/anormal must be tested first).
   * Supports both English and French labels.
   *
   * @param {string} label - Interpretation text from getInterpretation()
   * @returns {"interp-abnormal"|"interp-moderate"|"interp-normal"|""} CSS class name
   */
  function interpClass(label) {
    if (!label) return "";
    var l = label.toLowerCase();
    // Check abnormal/anormal BEFORE normal (substring match)
    if (l.indexOf("abnormal") !== -1 || l.indexOf("anormal") !== -1 ||
        l.indexOf("high") !== -1 || l.indexOf("severe") !== -1 ||
        l.indexOf("\u00e9lev\u00e9") !== -1 || l.indexOf("s\u00e9v\u00e8re") !== -1) return "interp-abnormal";
    if (l.indexOf("moderate") !== -1 || l.indexOf("borderline") !== -1 || l.indexOf("average") !== -1 ||
        l.indexOf("mod\u00e9r\u00e9") !== -1 || l.indexOf("limite") !== -1 || l.indexOf("moyen") !== -1) return "interp-moderate";
    if (l.indexOf("normal") !== -1 || l.indexOf("low") !== -1 || l.indexOf("mild") !== -1 ||
        l.indexOf("faible") !== -1 || l.indexOf("l\u00e9ger") !== -1) return "interp-normal";
    return "";
  }

  // ── Config integrity ─────────────────────────────────────────────

  /**
   * Validate a CONFIG object's structural integrity. Catches the data errors a
   * config-driven scorer is most exposed to — an option/score length mismatch,
   * a subscale/trait pointing at a non-existent item, or a malformed threshold
   * range — before any scoring runs.
   *
   * @param {Object} cfg - A CONFIG object (window.CONFIG shape)
   * @returns {string[]} Human-readable problems; empty array means valid
   */
  function validateConfig(cfg) {
    var problems = [];
    var testsByName = {};

    (cfg.tests || []).forEach(function (t) {
      testsByName[t.name] = t;
      (t.questions || []).forEach(function (q, i) {
        var where = t.name + " Q" + (i + 1);
        if (!Array.isArray(q.options) || !Array.isArray(q.scores)) {
          problems.push(where + ": missing options/scores array");
        } else if (q.options.length !== q.scores.length) {
          problems.push(where + ": " + q.options.length + " options but " + q.scores.length + " scores");
        } else if (q.scores.some(function (s) { return typeof s !== "number" || isNaN(s); })) {
          problems.push(where + ": non-numeric score");
        }
      });
    });

    Object.keys(cfg.scoring || {}).forEach(function (name) {
      var t = testsByName[name];
      if (!t) { problems.push("scoring[" + name + "]: no matching test"); return; }
      var count = t.questions.length;
      var groups = cfg.scoring[name].subscales || cfg.scoring[name].traits;
      if (groups) Object.keys(groups).forEach(function (g) {
        groups[g].forEach(function (idx) {
          if (!Number.isInteger(idx) || idx < 1 || idx > count) {
            problems.push("scoring[" + name + "]." + g + ": item " + idx + " out of range 1.." + count);
          }
        });
      });
    });

    Object.keys(cfg.thresholds || {}).forEach(function (name) {
      var byKey = cfg.thresholds[name];
      Object.keys(byKey).forEach(function (key) {
        var ranges = byKey[key].ranges;
        if (!Array.isArray(ranges)) { problems.push("thresholds[" + name + "]." + key + ": no ranges"); return; }
        var prevHi = null;
        ranges.forEach(function (r, i) {
          var at = "thresholds[" + name + "]." + key + " range " + i;
          if (r.length < 3 || typeof r[2] !== "string") problems.push(at + ": malformed");
          else if (r[0] > r[1]) problems.push(at + ": lo > hi");
          else if (prevHi !== null && r[0] <= prevHi) problems.push(at + ": overlaps previous");
          prevHi = r[1];
        });
      });
    });

    return problems;
  }

  // ── CSV helper ────────────────────────────────────────────────────

  /**
   * Escape a value for safe inclusion in a CSV cell (RFC 4180).
   * Wraps in double-quotes if the value contains commas, quotes, or newlines;
   * doubles any internal quotes.
   *
   * @param {*} field - Value to escape (coerced to string)
   * @returns {string}
   */
  function csvEscape(field) {
    var str = String(field);
    // Neutralize spreadsheet formula injection: a leading =, +, -, @, tab, or CR
    // makes Excel/Sheets treat the cell as a formula, so prefix it with a quote.
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    if (str.indexOf(",") !== -1 || str.indexOf('"') !== -1 || str.indexOf("\n") !== -1) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /**
   * Format a computed score for output: two decimals for a non-integer (e.g. a
   * BFI trait mean), otherwise the value as-is. Shared by the table, CSV and PDF
   * so the three renderings never disagree.
   * @param {number|string} val
   * @returns {string}
   */
  function formatScoreValue(val) {
    return (typeof val === "number" && !Number.isInteger(val)) ? val.toFixed(2) : String(val);
  }

  /**
   * Session duration in minutes, frozen at completion so the on-screen value
   * and both exports always agree.
   * @param {number} decimals
   * @returns {string}
   */
  function sessionMinutes(decimals) {
    var end = state.testEndTime || new Date();
    return ((end - state.testStartTime) / 1000 / 60).toFixed(decimals);
  }

  // ── UI Rendering ──────────────────────────────────────────────────

  /**
   * Render the initial setup screen: consent text, participant ID input,
   * and test-selection checkboxes. All tests are checked by default.
   */
  function showSetupScreen() {
    var area = $("#setup-area");
    empty(area);

    var consent = el("div", { className: "consent-text" }, [
      el("p", { text: ui.consent }),
    ]);
    area.appendChild(consent);

    var mb3 = el("div", { className: "mb-3" });
    mb3.appendChild(el("label", { "for": "participantIdInput", className: "form-label fw-bold", text: ui.participantLabel }));
    mb3.appendChild(el("input", { type: "text", className: "form-control participant-id-input", id: "participantIdInput", placeholder: ui.participantPlaceholder }));
    area.appendChild(mb3);

    var sel = el("div", { className: "test-selection" });
    sel.appendChild(el("p", { className: "fw-bold", text: ui.selectTests }));
    allTests.forEach(function (t, i) {
      var fc = el("div", { className: "form-check" });
      fc.appendChild(el("input", { className: "form-check-input test-checkbox", type: "checkbox", id: "test" + i, value: String(i), checked: "" }));
      fc.appendChild(el("label", { className: "form-check-label", "for": "test" + i, text: t.name + " (" + t.questions.length + " " + ui.items + ")" }));
      sel.appendChild(fc);
    });
    area.appendChild(sel);

    var btn = $("#nextBtn");
    btn.textContent = ui.startBtn;
    removeClass(btn, "hidden");
  }

  /**
   * Show a prompt to resume a previously saved session or start fresh.
   * @param {Object} saved - Saved state from loadProgress()
   */
  function showResumeScreen(saved) {
    var area = $("#setup-area");
    empty(area);

    var box = el("div", { className: "resume-prompt" });
    var msg = ui.resumeFound;
    if (saved.participantId) msg += " (" + ui.resumeParticipant + ": " + saved.participantId + ")";
    msg += " — " + saved.answers.length + " " + ui.resumeAnswers;
    box.appendChild(el("p", { text: msg }));

    var resumeBtn = el("button", { id: "resumeBtn", className: "btn btn-primary me-2", text: ui.resumeBtn });
    var newBtn = el("button", { id: "newSessionBtn", className: "btn btn-outline-secondary", text: ui.newSessionBtn });
    box.appendChild(resumeBtn);
    box.appendChild(newBtn);
    area.appendChild(box);

    addClass($("#nextBtn"), "hidden");

    resumeBtn.addEventListener("click", function () {
      state.participantId = saved.participantId || "";
      state.currentTestIndex = saved.currentTestIndex;
      state.currentQuestionIndex = saved.currentQuestionIndex;
      state.answers = saved.answers;
      state.testStartTime = saved.testStartTime ? new Date(saved.testStartTime) : new Date();
      var savedNames = saved.selectedTestNames || allTests.map(function (t) { return t.name; });
      state.tests = allTests.filter(function (t) { return savedNames.indexOf(t.name) !== -1; });
      state.totalQuestions = state.tests.reduce(function (acc, t) { return acc + t.questions.length; }, 0);

      // A save from an older config (or edited by hand) can point past the
      // current test list; discard it rather than crash mid-resume.
      var t = state.tests[state.currentTestIndex];
      if (!t || state.currentQuestionIndex < 0 || state.currentQuestionIndex >= t.questions.length) {
        clearProgress();
        showSetupScreen();
        return;
      }

      empty(area);
      removeClass($("#progress-container"), "hidden");
      var nb = $("#nextBtn");
      nb.textContent = ui.nextBtn;
      removeClass(nb, "hidden");
      state.testInProgress = true;
      loadTest(state.tests[state.currentTestIndex]);
    });

    newBtn.addEventListener("click", function () {
      clearProgress();
      showSetupScreen();
    });
  }

  /**
   * Display a test's instruction text and load its first (or current) question.
   * @param {Object} test - Test object from CONFIG.tests
   */
  function loadTest(test) {
    var ia = $("#instruction-area");
    empty(ia);
    if (test.instructions) {
      ia.appendChild(el("div", { className: "instruction", text: test.instructions }));
    }
    loadQuestion(test.questions[state.currentQuestionIndex]);
  }

  /**
   * Render a single question with radio-button options into #test-area.
   * Records questionStartTime for response-time measurement.
   * @param {Object} question - Question object with q, options, and scores arrays
   */
  function loadQuestion(question) {
    state.questionStartTime = new Date();
    var area = $("#test-area");
    empty(area);

    var container = el("div");
    var qId = "q-text-" + state.currentTestIndex + "-" + state.currentQuestionIndex;
    var qEl = el("p", { className: "question", id: qId, tabindex: "-1", text: question.q });
    container.appendChild(qEl);

    var radioGroup = el("div", { role: "radiogroup", "aria-labelledby": qId });
    question.options.forEach(function (option, idx) {
      var fc = el("div", { className: "form-check" });
      var input = el("input", {
        className: "form-check-input",
        type: "radio",
        name: "question" + state.currentTestIndex + "_" + state.currentQuestionIndex,
        id: "option" + idx,
        value: String(question.scores[idx]),
      });
      var label = el("label", { className: "form-check-label", "for": "option" + idx, text: option });
      fc.appendChild(input);
      fc.appendChild(label);
      radioGroup.appendChild(fc);
    });
    container.appendChild(radioGroup);

    area.appendChild(container);
    updateProgressBar();
    if (qEl.focus) qEl.focus(); // move focus so the new question is announced
  }

  /**
   * Capture the currently selected radio-button answer and push it to state.answers.
   * Validates that a selection exists and that the score is in the question's scores array.
   * @returns {boolean} true if an answer was recorded, false if no valid selection
   */
  function recordAnswer() {
    var name = "question" + state.currentTestIndex + "_" + state.currentQuestionIndex;
    var selected = document.querySelector('input[name="' + name + '"]:checked');
    if (!selected) return false;

    var rawScore = parseInt(selected.value, 10);
    if (isNaN(rawScore)) return false;

    var currentTest = state.tests[state.currentTestIndex];
    var currentQuestion = currentTest.questions[state.currentQuestionIndex];
    if (currentQuestion.scores.indexOf(rawScore) === -1) return false;

    var duration = (new Date() - state.questionStartTime) / 1000;
    var label = selected.nextElementSibling;

    state.answers.push({
      test: currentTest.name,
      questionIndex: state.currentQuestionIndex + 1,
      question: currentQuestion.q,
      answer: label ? label.textContent.trim() : "",
      score: rawScore,
      time: duration,
      questionStartTime: state.questionStartTime.toISOString(),
      answerTime: new Date().toISOString(),
    });
    return true;
  }

  /** Update the Bootstrap progress bar width based on questions answered so far. */
  function updateProgressBar() {
    var answered = state.tests.slice(0, state.currentTestIndex).reduce(function (acc, t) { return acc + t.questions.length; }, 0) + state.currentQuestionIndex;
    var progress = state.totalQuestions > 0 ? (answered / state.totalQuestions) * 100 : 0;
    var bar = $(".progress-bar");
    bar.style.width = progress + "%";
    bar.setAttribute("aria-valuenow", String(progress));
  }

  /**
   * Build and display the results table with color-coded interpretation labels
   * and a clinical disclaimer. Unhides #results-area.
   * @param {Object<string, number|Object<string, number>>} summary - Output of calculateSummaryScores()
   */
  function displayResults(summary) {
    var totalTime = sessionMinutes(1);
    var area = $("#results-area");
    empty(area);

    var heading = el("h2", { tabindex: "-1", text: ui.resultsHeading });
    area.appendChild(heading);
    if (state.participantId) {
      area.appendChild(el("p", null, [el("strong", { text: ui.participantLabel2 }), " " + state.participantId]));
    }
    area.appendChild(el("p", null, [el("strong", { text: ui.durationLabel }), " " + totalTime + " " + ui.minutes]));

    // Build table
    var table = el("table", { className: "table table-bordered" });
    table.appendChild(el("caption", { className: "visually-hidden", text: ui.resultsTableCaption }));
    var thead = el("thead");
    var headRow = el("tr");
    [ui.colScale, ui.colSubscale, ui.colScore, ui.colInterpretation].forEach(function (h) {
      headRow.appendChild(el("th", { text: h }));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el("tbody");
    Object.keys(summary).forEach(function (testName) {
      var score = summary[testName];
      if (typeof score === "object") {
        Object.keys(score).forEach(function (sub) {
          var val = score[sub];
          var interp = getInterpretation(testName, sub, val);
          var display = formatScoreValue(val);
          var row = el("tr");
          row.appendChild(el("td", { text: testName }));
          row.appendChild(el("td", { text: sub }));
          row.appendChild(el("td", { text: display }));
          var interpTd = el("td", { text: interp });
          var cls = interpClass(interp);
          if (cls) addClass(interpTd, cls);
          row.appendChild(interpTd);
          tbody.appendChild(row);
        });
      } else {
        var interp = getInterpretation(testName, null, score);
        var row = el("tr");
        row.appendChild(el("td", { text: testName }));
        row.appendChild(el("td", { text: ui.totalLabel }));
        row.appendChild(el("td", { text: String(score) }));
        var interpTd = el("td", { text: interp });
        var cls = interpClass(interp);
        if (cls) addClass(interpTd, cls);
        row.appendChild(interpTd);
        tbody.appendChild(row);
      }
    });
    table.appendChild(tbody);
    area.appendChild(table);

    // Disclaimer
    var disc = el("div", { className: "disclaimer", text: ui.disclaimer });
    area.appendChild(disc);

    removeClass(area, "hidden");
    if (heading.focus) heading.focus(); // announce results to screen readers
  }

  // ── Export: CSV ────────────────────────────────────────────────────

  /**
   * Generate and trigger download of a UTF-8 CSV file containing individual
   * answers and a summary scores section. Includes a BOM for Excel compatibility.
   */
  function generateCSV() {
    try {
      var csv = "\uFEFF";
      var totalTime = sessionMinutes(2);
      var now = new Date();
      var date = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2);

      // ── Section 1: Session Info ──
      csv += ui.csvSessionTitle + "\n";
      csv += ui.csvParticipant + "," + csvEscape(state.participantId || "N/A") + "\n";
      csv += ui.csvDate + "," + csvEscape(date) + "\n";
      csv += ui.csvDuration + "," + csvEscape(totalTime) + "\n";
      csv += ui.csvTestsCompleted + "," + csvEscape(state.tests.map(function (t) { return t.name; }).join("; ")) + "\n";

      // ── Section 2: Summary Scores ──
      csv += "\n" + ui.csvSummaryTitle + "\n";
      csv += ui.csvSummaryHeaders + "\n";
      var summary = calculateSummaryScores();
      Object.keys(summary).forEach(function (testName) {
        var score = summary[testName];
        if (typeof score === "object") {
          Object.keys(score).forEach(function (sub) {
            var val = score[sub];
            var display = formatScoreValue(val);
            var interp = getInterpretation(testName, sub, val);
            csv += [csvEscape(testName), csvEscape(sub), csvEscape(display), csvEscape(interp)].join(",") + "\n";
          });
        } else {
          var interp = getInterpretation(testName, null, score);
          csv += [csvEscape(testName), csvEscape(ui.totalLabel), csvEscape(score), csvEscape(interp)].join(",") + "\n";
        }
      });

      // ── Section 3: Individual Responses ──
      csv += "\n" + ui.csvDetailTitle + "\n";
      csv += ui.csvHeaders + "\n";
      state.answers.forEach(function (a) {
        csv += [
          csvEscape(a.test),
          csvEscape(a.question),
          csvEscape(a.answer.trim()),
          csvEscape(a.score),
          csvEscape(a.time.toFixed(2)),
          csvEscape(a.questionStartTime),
          csvEscape(a.answerTime),
        ].join(",") + "\n";
      });

      var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      var link = document.createElement("a");
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", C.export.csvFilename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      state.resultsExported = true;
    } catch (error) {
      console.error("CSV generation failed:", error);
      alert(ui.alertCsvFail);
    }
  }

  // ── Export: PDF ────────────────────────────────────────────────────

  /**
   * Generate and trigger download of a PDF report using jsPDF.
   * Contains summary scores with interpretations followed by all individual
   * responses. Falls back to CSV export if jsPDF is unavailable.
   */
  function generatePDF() {
    try {
      if (!window.jspdf) {
        generateCSV();
        alert(ui.alertPdfFail);
        return;
      }
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF();
      var yPos = 10;

      doc.setFontSize(16);
      doc.text(ui.pdfTitle, 10, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(ui.pdfGenerated + " " + new Date().toISOString(), 10, yPos);
      yPos += 6;
      if (state.participantId) {
        doc.text(ui.pdfParticipant + " " + state.participantId, 10, yPos);
        yPos += 6;
      }
      doc.text(ui.pdfDuration + " " + sessionMinutes(1) + " " + ui.minutes, 10, yPos);
      yPos += 10;

      doc.setFontSize(12);
      var summary = calculateSummaryScores();
      doc.text(ui.pdfSummary, 10, yPos);
      yPos += 8;

      doc.setFontSize(10);
      Object.keys(summary).forEach(function (testName) {
        var score = summary[testName];
        if (yPos > 270) { doc.addPage(); yPos = 10; }
        if (typeof score === "object") {
          doc.text(testName + " " + ui.pdfScore, 10, yPos);
          yPos += 6;
          Object.keys(score).forEach(function (sub) {
            var val = score[sub];
            var interp = getInterpretation(testName, sub, val);
            var label = interp ? " (" + interp + ")" : "";
            doc.text("  - " + sub + ": " + formatScoreValue(val) + label, 14, yPos);
            yPos += 6;
          });
        } else {
          var interp = getInterpretation(testName, null, score);
          var label = interp ? " (" + interp + ")" : "";
          doc.text(testName + " " + ui.pdfScore + " " + formatScoreValue(score) + label, 10, yPos);
          yPos += 6;
        }
      });

      yPos += 10;
      doc.setFontSize(12);
      doc.text(ui.pdfDetailed, 10, yPos);
      yPos += 10;

      doc.setFontSize(9);
      state.answers.forEach(function (a) {
        if (yPos > 260) { doc.addPage(); yPos = 10; }
        var maxLen = 85;
        var qText = a.question.length > maxLen ? a.question.substring(0, maxLen) + "..." : a.question;
        doc.text("Test: " + a.test, 10, yPos);
        doc.text("Q: " + qText, 10, yPos + 5);
        doc.text(ui.pdfAnswer + " " + a.answer.trim() + " | " + ui.pdfScore + " " + a.score + " | " + ui.pdfTime + " " + a.time.toFixed(1) + "s", 10, yPos + 10);
        yPos += 18;
      });

      doc.save(C.export.pdfFilename);
      state.resultsExported = true;
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert(ui.alertPdfFail + " " + error.message);
    }
  }

  // ── Main button handler ───────────────────────────────────────────

  /**
   * Main button click/Enter handler. Behaviour depends on state.testInProgress:
   *  - false: read selected tests and participant ID, begin the first test
   *  - true:  record the current answer, advance to the next question/test,
   *           or finish and display results if all tests are complete
   *
   * Includes a 300 ms debounce to prevent double-clicks.
   */
  function handleNext() {
    var btn = $("#nextBtn");
    if (btn.disabled) return;
    btn.disabled = true;
    setTimeout(function () { btn.disabled = false; }, 300);

    if (!state.testInProgress) {
      // Start
      var pidInput = $("#participantIdInput");
      state.participantId = pidInput ? (pidInput.value || "").trim() : "";
      var checked = $$(".test-checkbox:checked");
      var selected = [];
      checked.forEach(function (cb) { selected.push(parseInt(cb.value, 10)); });
      if (selected.length === 0) {
        alert(ui.alertSelectTest);
        btn.disabled = false;
        return;
      }
      state.tests = selected.map(function (i) { return allTests[i]; });
      state.totalQuestions = state.tests.reduce(function (acc, t) { return acc + t.questions.length; }, 0);
      state.testStartTime = new Date();
      state.testInProgress = true;
      state.currentTestIndex = 0;
      state.currentQuestionIndex = 0;
      empty($("#setup-area"));
      removeClass($("#progress-container"), "hidden");
      loadTest(state.tests[state.currentTestIndex]);
      btn.textContent = ui.nextBtn;
      saveProgress();
    } else {
      // Next
      if (!recordAnswer()) {
        alert(ui.alertAnswer);
        btn.disabled = false;
        return;
      }
      if (state.currentQuestionIndex < state.tests[state.currentTestIndex].questions.length - 1) {
        state.currentQuestionIndex++;
        loadQuestion(state.tests[state.currentTestIndex].questions[state.currentQuestionIndex]);
      } else if (state.currentTestIndex < state.tests.length - 1) {
        state.currentTestIndex++;
        state.currentQuestionIndex = 0;
        loadTest(state.tests[state.currentTestIndex]);
      } else {
        // Done
        state.testInProgress = false;
        state.testEndTime = new Date();
        clearProgress();
        var bar = $(".progress-bar");
        bar.style.width = "100%";
        bar.setAttribute("aria-valuenow", "100");
        addClass(btn, "hidden");
        empty($("#instruction-area"));
        empty($("#test-area"));
        var summary = calculateSummaryScores();
        displayResults(summary);
        removeClass($("#download-buttons"), "hidden");
        return;
      }
      saveProgress();
    }
  }

  // ── Init ──────────────────────────────────────────────────────────

  /**
   * Initialize the application on DOMContentLoaded.
   * Sets page text from CONFIG.ui, checks for a saved session, renders the
   * appropriate start screen, and attaches event listeners for the main button,
   * download button, keyboard shortcuts (Enter, 1-9), and beforeunload warning.
   */
  function init() {
    var configProblems = validateConfig(C);
    if (configProblems.length) console.error("CONFIG validation problems:", configProblems);

    // Set page text from config
    document.title = ui.pageTitle;
    var h1 = $("h1");
    if (h1) h1.textContent = ui.heading;
    var csvBtn = $("#downloadCsv");
    if (csvBtn) csvBtn.textContent = ui.downloadCsvBtn;
    var pdfBtn = $("#downloadPdf");
    if (pdfBtn) pdfBtn.textContent = ui.downloadPdfBtn;

    var saved = loadProgress();
    if (saved) {
      showResumeScreen(saved);
    } else {
      showSetupScreen();
    }

    // Keyboard navigation
    document.addEventListener("keydown", function (e) {
      if (!state.testInProgress) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key >= "1" && e.key <= "9") {
        var idx = parseInt(e.key, 10) - 1;
        var radios = $$('#test-area input[type="radio"]');
        if (idx < radios.length) radios[idx].checked = true;
      }
    });

    // Main button
    $("#nextBtn").addEventListener("click", handleNext);

    // Download buttons with debounce
    var downloadingCsv = false;
    var downloadingPdf = false;
    $("#downloadCsv").addEventListener("click", function () {
      if (downloadingCsv) return;
      downloadingCsv = true;
      generateCSV();
      setTimeout(function () { downloadingCsv = false; }, 1000);
    });
    $("#downloadPdf").addEventListener("click", function () {
      if (downloadingPdf) return;
      downloadingPdf = true;
      generatePDF();
      setTimeout(function () { downloadingPdf = false; }, 1000);
    });

    // Clear saved data on demand (privacy control)
    var clearBtn = $("#clearDataBtn");
    if (clearBtn) {
      clearBtn.textContent = ui.clearDataBtn;
      clearBtn.addEventListener("click", function () {
        clearProgress();
        clearBtn.textContent = ui.dataCleared;
        clearBtn.disabled = true;
        setTimeout(function () { clearBtn.disabled = false; clearBtn.textContent = ui.clearDataBtn; }, 2000);
      });
    }

    // Warn on unload: mid-test, or on the results screen before any export
    // (completion clears localStorage, so unexported results are unrecoverable)
    window.addEventListener("beforeunload", function (e) {
      if (state.testInProgress || (state.testEndTime && !state.resultsExported)) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
  }

  // ── Test hook ─────────────────────────────────────────────────────
  if (window.__TEST__) {
    window.__TEST__.calculateSummaryScores = calculateSummaryScores;
    window.__TEST__.getInterpretation = getInterpretation;
    window.__TEST__.interpClass = interpClass;
    window.__TEST__.csvEscape = csvEscape;
    window.__TEST__.formatScoreValue = formatScoreValue;
    window.__TEST__.validateConfig = validateConfig;
    window.__TEST__.state = state;
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
