# 1Panel Domain Deployment (Branch Fixed Tag)

This document describes how to deploy this repository to a specific domain using branch fixed image tags.

## 1. Build and run locally

```bash
docker build -t talk-practice:local .
docker run -d --name talk-practice-local -p 18080:80 talk-practice:local
docker ps --filter name=talk-practice-local
docker rm -f talk-practice-local
```

## 2. GitHub Actions image publishing

Workflow file: `.github/workflows/deploy-image.yml`

Behavior:

- On push, build image and push to GHCR.
- If Docker Hub secrets are configured, push to Docker Hub as well.
- Branch name is converted to fixed tag.

Examples:

- `main` -> `:main`
- `dev` -> `:dev`
- `release/v1` -> `:release-v1`

Required secrets:

- For Docker Hub (optional):
  - `DOCKERHUB_USERNAME`
  - `DOCKERHUB_TOKEN`
  - `DOCKERHUB_NAMESPACE`

Notes:

- GHCR uses `GITHUB_TOKEN` automatically.
- Image names:
  - GHCR: `ghcr.io/<owner>/talk-practice:<branch-tag>`
  - Docker Hub: `<namespace>/talk-practice:<branch-tag>`

## 3. 1Panel container setup

Create a new container in 1Panel:

- Image:
  - GHCR example: `ghcr.io/<owner>/talk-practice:main`
  - Docker Hub example: `<namespace>/talk-practice:main`
- Port mapping:
  - Container port `80`
  - Host port any free port, for example `18080`
- Restart policy: `Always`

If pulling from private GHCR image, add registry credentials in 1Panel:

- Registry: `ghcr.io`
- Username: GitHub username
- Password: GitHub PAT (scope needs `read:packages`)

## 4. Enable auto update in 1Panel

In the container settings, enable auto image update (or auto pull latest for the configured tag).

Recommended strategy:

- Keep tag fixed by branch, such as `:main`.
- New commit to that branch triggers image rebuild in GitHub Actions.
- 1Panel auto update pulls the same tag and recreates container.

## 5. Bind your domain

In 1Panel website/reverse proxy:

- Domain: your target domain
- Proxy target: `http://127.0.0.1:18080` (or your chosen host port)
- Enable HTTPS by applying SSL certificate in 1Panel

For SPA routing, this image already supports refresh on deep links via `try_files ... /index.html`.