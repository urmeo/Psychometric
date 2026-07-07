# Instrument Copyright & Licensing

The [MIT license](LICENSE) covers the **software in this repository only** — the
application code, scoring engine, tests, and test tooling. It does **not** grant
any rights to the psychometric instruments themselves.

The five instruments administered by this app are the intellectual property of
their respective authors and publishers. They are referenced here for research
and educational purposes. Anyone administering these instruments — clinically,
commercially, or in funded research — is responsible for obtaining the required
permission or license directly from the rights holder.

| Instrument | Copyright holder | Terms | Where to obtain rights |
|:-----------|:-----------------|:------|:-----------------------|
| **STAI** (State-Trait Anxiety Inventory) | © 1968, 1977 Charles D. Spielberger; ™ Mind Garden, Inc. | Commercial. Purchased permission required; the copyright line must appear on every page containing items. | [mindgarden.com](https://www.mindgarden.com/145-state-trait-anxiety-inventory-for-adults) |
| **HADS** (Hospital Anxiety and Depression Scale) | © R.P. Snaith & A.S. Zigmond, 1983/1992/1994; GL Assessment, UK | Commercial. Written permission + user fee for commercial and funded-academic use. | [gl-assessment.co.uk](https://www.gl-assessment.co.uk/products/hospital-anxiety-depression-scale/) · permissions@gl-assessment.co.uk |
| **BFI-10** (Big Five Inventory) | © Oliver P. John, Berkeley Personality Lab | Free for non-commercial research use; attribution required. | [Berkeley Personality Lab](https://www.ocf.berkeley.edu/~johnlab/bfi.html) |
| **FQ** (Fear Questionnaire) | © Isaac M. Marks | Reproduction permitted for clinical practice and non-industry research; other uses need permission. | Marks, I.M. & Mathews, A.M. (1979), *Behav. Res. Ther.* 17(3), 263–267 |

## Important

**STAI and HADS require purchased permission.** This repository currently bundles
their verbatim item text (`lang/en.js`, `lang/fr.js`) and full questionnaire PDFs
(`docs/english/`, `docs/french/`). Redistributing that content is not cured by
attribution alone — using or deploying this app with those instruments requires a
license from Mind Garden (STAI) and GL Assessment (HADS), or removal of the
verbatim content pending permission.

If you are not licensed for STAI/HADS, remove `docs/*/STAI.pdf`, `docs/*/HADS.pdf`
and their item text before deploying.
