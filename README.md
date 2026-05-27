# SwagStore

SwagStore is a Node.js Express MVC application rendered with Handlebars. The
project contains Jest unit and integration tests, a GitHub Actions CI/CD
workflow, and a Render Blueprint for deployment.

## Run Locally

Requirements:

- Node.js `24.14.1` (or a compatible version in `>=22.22.2 <25`)
- npm

```powershell
npm install
npm start
```

Open `http://localhost:3000`.

If PowerShell blocks `npm.ps1`, use `npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd start
```

## Test With Jest

```powershell
npm.cmd test
npm.cmd run test:coverage
```

Unit tests cover models and controllers. Integration tests exercise the
Express routes with Supertest. Coverage output is generated in `coverage/`.

## CI/CD Workflow

The workflow in `.github/workflows/ci.yml` runs when code is pushed or a pull
request is opened:

1. Install dependencies reproducibly with `npm ci`.
2. Check JavaScript syntax and run all Jest tests with coverage.
3. Verify that the Express application can start.
4. Upload coverage and release archive artifacts.
5. On pushes to `main`, trigger a Render deployment when its secret is set.

## Deploy To Render

The repository contains `render.yaml`. To connect deployment:

1. In Render, create a new Blueprint and connect this GitHub repository.
2. Allow Render to create the `swagstore-student` web service from
   `render.yaml`.
3. In the Render service settings, copy its Deploy Hook URL.
4. In GitHub, open `Settings > Secrets and variables > Actions` and add a
   repository secret named `RENDER_DEPLOY_HOOK_URL` containing that URL.
5. Push a commit to `main`. GitHub Actions runs the tests first and triggers
   Render only after verification succeeds.

Until the secret is configured, the deploy job reports a notice and performs
no external deployment.
