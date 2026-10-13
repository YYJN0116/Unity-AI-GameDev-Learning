Xiuxian Game Browser Test

Setup
1. Install Node.js 18+.
2. Open a terminal in Projects/Xiuxian-Game.
3. Install dependencies:
   npm install
4. Install Playwright browser:
   npx playwright install chromium

Run
npm test
Or:
npx playwright test tests/xiuxian-flow.spec.js --reporter=line

Notes
This is a smoke test that validates the main Action -> AI prompt -> JSON -> apply -> save -> reload loop.
