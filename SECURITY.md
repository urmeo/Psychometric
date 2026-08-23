# Security Policy

Psychometric is a static, client-side web app. It runs no server, has no accounts or
authentication, ships no secrets or API keys, and makes no network requests once loaded.
Responses are held in browser memory for the duration of a session and are written out only
when the user chooses to export a CSV or PDF. Nothing is transmitted or stored remotely.

## Supported versions

Only the latest `main` is supported. Fixes land on `main`; there are no backports.

## Reporting a vulnerability

Please report privately rather than opening a public issue: use the repository's
**Security** tab, then **Report a vulnerability**, to open a private advisory.

Expect an acknowledgement within a few days. Because there is no server and no stored user
data, the realistic surface is limited to the client-side dependency chain (jsPDF, Bootstrap)
and the handling of exported files.
