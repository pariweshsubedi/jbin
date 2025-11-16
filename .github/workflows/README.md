# GitHub Actions Workflows

## Active Workflows

### `docker-build-combined.yml`
Builds a single Docker image containing both backend and frontend.

- **Triggers**: Push to main, releases, manual
- **Image**: `ghcr.io/pariweshsubedi/jbin:latest`
- **Use case**: Combined deployment (recommended for single instance)

## Disabled Workflows

### `docker-build-publish.yml.disabled`
Builds separate backend and frontend Docker images.

- **Images**:
  - `ghcr.io/pariweshsubedi/jbin-backend:latest`
  - `ghcr.io/pariweshsubedi/jbin-frontend:latest`
- **Use case**: Separate deployment (for independent scaling)

**To enable**: Rename to `.yml` extension
**To disable combined**: Rename `docker-build-combined.yml` to `.yml.disabled`

## Current Setup

Using **combined deployment** for simpler single-instance deployment at `jbin.app.pariwesh.com`.

If you later need independent scaling, switch to the separate images workflow.
