# tree-sale

Staff web app for the NTCC tree sale: order lookup, customer order history, and per-season sales totals. React and Vite, served from Firebase Hosting in the GCP project `tree-sale`. The API lives in [tree-sale-backend](https://github.com/Nashville-Tree-Conservation-Corps/tree-sale-backend).

## How the pieces fit

- Firebase Hosting serves the built `dist/` folder.
- `firebase.json` rewrites `/api/**` to the Cloud Function `api` in `us-central1`, which tree-sale-backend deploys. In production the browser calls the API on the same origin, so `VITE_API_URL` is unset in CI.
- Staff sign in with Firebase Authentication (Google or Microsoft providers, configured in `src/services/firebase.js`). That config is the public web client config, not a secret.
- The app sends the Firebase ID token as a bearer token on every `/api` call. The backend decides who is allowed in; see its README.

## Local development

[mise](https://mise.jdx.dev) pins Node 22 through `mise.toml`. Install it with `brew install mise` (or see the [install docs](https://mise.jdx.dev/getting-started.html)), add `eval "$(mise activate zsh)"` to your shell profile, then from the repo root:

```sh
mise trust
mise install
npm ci
cp env.example .env.local
npm run dev
npm test
```

- `VITE_API_URL=http://localhost:3000` points the dev server at a locally running backend.
- `VITE_APP_VERSION` is set by CI from `git describe`; locally the title shows `dev`.

## Deployment

A push to `main` runs `.github/workflows/deploy.yml` (`deploy-app`), which tests, builds, and runs `firebase deploy --only hosting`. There is no manual deploy step.

Both the NTCC org repo and the `enlore/tree-sale` fork are trusted to deploy, and both deploy to the same production site. Whichever `main` was pushed last is what is live, so push to the fork only when its `main` matches the org repo's.

### How CI authenticates to GCP

GitHub stores no service account keys. The job requests a GitHub OIDC token (`permissions: id-token: write`), and `google-github-actions/auth` exchanges it through Workload Identity Federation for short-lived credentials as the deployer service account.

GitHub side, set on both `Nashville-Tree-Conservation-Corps/tree-sale` and `enlore/tree-sale`:

| Repository variable | Value |
|---|---|
| `GCP_WIF_PROVIDER` | `projects/15912314705/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_DEPLOYER_SA` | `firebase-deployer@tree-sale.iam.gserviceaccount.com` |

These are Actions variables, not secrets. The job also declares `environment: production`, and the GCP binding below depends on that environment name.

GCP side, project `tree-sale` (number `15912314705`):

- **Pool and provider:** `github-pool` / `github-provider`, issuer `https://token.actions.githubusercontent.com`.
- **Attribute condition:** only tokens from `enlore/tree-sale`, `enlore/tree-sale-backend`, `Nashville-Tree-Conservation-Corps/tree-sale`, and `Nashville-Tree-Conservation-Corps/tree-sale-backend` are accepted.
- **Attribute mapping:** `attribute.repo_env` is `<owner>/<repo>:<environment>`.
- **Impersonation:** `firebase-deployer` grants `roles/iam.workloadIdentityUser` to `principalSet://iam.googleapis.com/projects/15912314705/locations/global/workloadIdentityPools/github-pool/attribute.repo_env/<owner>/<repo>:production` for each of the four repos.
- **Deployer permissions:** `roles/firebase.admin` and `roles/cloudfunctions.admin` on the project, `roles/iam.serviceAccountUser` on the default compute and App Engine service accounts, and `roles/secretmanager.viewer` on the `SQUARESPACE_API_KEY` secret.

The binding uses the mapped `repo_env` attribute rather than the token's `sub` claim, because GitHub now embeds numeric owner and repo IDs in `sub`, and a name-based subject binding never matches. The failure shows up as a 403 on `iam.serviceAccounts.getAccessToken`, which `firebase-tools` reports as "have you run firebase login?".

Keep the GitHub environment and the IAM binding both lowercase `production`. A repo with a `Production` environment failed this way with a 403, and IAM treats `:production` and `:Production` members as duplicates, so `remove-iam-policy-binding` cannot remove the mixed-case one; edit the policy JSON with `get-iam-policy` / `set-iam-policy` instead.

### Giving another repo deploy access

```sh
gcloud iam workload-identity-pools providers update-oidc github-provider --project=tree-sale --location=global --workload-identity-pool=github-pool --attribute-condition="assertion.repository in ['<owner>/<repo>', ...existing repos]"
gcloud iam service-accounts add-iam-policy-binding firebase-deployer@tree-sale.iam.gserviceaccount.com --project=tree-sale --role=roles/iam.workloadIdentityUser --member="principalSet://iam.googleapis.com/projects/15912314705/locations/global/workloadIdentityPools/github-pool/attribute.repo_env/<owner>/<repo>:production"
```

Then set the two repository variables on the new repo and create its `production` environment. `update-oidc` replaces the whole condition, so list every repo that should keep access.
