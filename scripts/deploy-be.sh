#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[deploy-be] %s\n' "$*"
}

require_env() {
  local name="$1"

  if [[ -z "${!name:-}" ]]; then
    printf '[deploy-be] Missing required environment variable: %s\n' "$name" >&2
    exit 1
  fi
}

require_command() {
  local name="$1"

  if ! command -v "$name" >/dev/null 2>&1; then
    printf '[deploy-be] Required command not found: %s\n' "$name" >&2
    exit 1
  fi
}

require_env APP_DIR

SERVICE_NAME="${SERVICE_NAME:-lublin-assistant}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4000/health}"

require_command node
require_command npm
require_command git
require_command systemctl
require_command curl

log "Deploying branch ${BRANCH} from ${APP_DIR}"
cd "$APP_DIR"

log "Fetching latest changes"
git fetch origin "$BRANCH"

log "Checking out ${BRANCH}"
git checkout "$BRANCH"

log "Pulling ${BRANCH}"
git pull --ff-only origin "$BRANCH"

log "Installing npm dependencies"
npm install

log "Building backend"
npm run build -w brama-be

log "Restarting systemd service ${SERVICE_NAME}"
sudo systemctl restart "$SERVICE_NAME"

log "Checking systemd service ${SERVICE_NAME}"
sudo systemctl is-active --quiet "$SERVICE_NAME"

log "Checking health endpoint ${HEALTH_URL}"
curl --fail --silent --show-error "$HEALTH_URL" >/dev/null

log "Backend deployment completed"
