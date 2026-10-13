# Xiuxian Game Browser Test

## Setup

1. Install Node.js 18 or later and Python.
2. Open a terminal in `Projects/Xiuxian-Game`.
3. Install the locked dependencies with `npm ci`.
4. Install the Playwright Chromium browser with `npx playwright install chromium`.

## Run

Run the full browser smoke test:

```sh
npm test
```

Or run this test directly:

```sh
npx playwright test tests/xiuxian-flow.spec.js --reporter=line
```

The test covers selecting an action, generating the AI prompt, applying a `pending` result, continuing the same action with a success result, and checking that the saved state remains available after reload. Test narration is explicitly marked as automation-only and is not game canon.
