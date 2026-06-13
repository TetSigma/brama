#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[deploy-be-local] %s\n' "$*"
}

fail() {
  printf '[deploy-be-local] %s\n' "$*" >&2
  exit 1
}

require_env() {
  local name="$1"

  if [[ -z "${!name:-}" ]]; then
    fail "Missing required environment variable: ${name}. Create .env.deploy from .env.deploy.example."
  fi
}

require_command() {
  local name="$1"

  if ! command -v "$name" >/dev/null 2>&1; then
    fail "Required command not found: ${name}"
  fi
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${DEPLOY_ENV_FILE:-${ROOT_DIR}/.env.deploy}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  fail "Missing ${ENV_FILE}. Copy .env.deploy.example to .env.deploy and fill it in."
fi

DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_SERVICE="${DEPLOY_SERVICE:-lublin-assistant}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4000/health}"

require_env DEPLOY_HOST
require_env DEPLOY_USER
require_env DEPLOY_PATH

require_command npm
require_command rsync
require_command ssh

SSH_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"
SSH_COMMAND=(ssh -p "$DEPLOY_PORT" -o IdentitiesOnly=no)
RSYNC_RSH="ssh -p ${DEPLOY_PORT}"

log "Running local checks"
npm run lint
npm run typecheck
npm run build

log "Syncing repository to ${SSH_TARGET}:${DEPLOY_PATH}"
rsync \
  --archive \
  --compress \
  --delete \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude '.env.deploy' \
  --exclude '.devenv/' \
  --exclude '.DS_Store' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'brama-be/data/' \
  --exclude 'brama-be/dist/' \
  --exclude 'brama-web/dist/' \
  -e "$RSYNC_RSH" \
  "${ROOT_DIR}/" \
  "${SSH_TARGET}:${DEPLOY_PATH}/"

log "Installing, building, and restarting ${DEPLOY_SERVICE} on server"
"${SSH_COMMAND[@]}" "$SSH_TARGET" bash -s -- "$DEPLOY_PATH" "$DEPLOY_SERVICE" "$HEALTH_URL" <<'REMOTE'
set -Eeuo pipefail

APP_DIR="$1"
SERVICE_NAME="$2"
HEALTH_URL="$3"

cd "$APP_DIR"
npm install
npm run build -w brama-be
sudo -n systemctl restart "$SERVICE_NAME"
sudo -n systemctl is-active --quiet "$SERVICE_NAME"
curl --fail --silent --show-error "$HEALTH_URL" >/dev/null
REMOTE

log "Backend deployed successfully"
