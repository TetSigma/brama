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
SSH_COMMAND=(ssh -t -p "$DEPLOY_PORT" -o IdentitiesOnly=no)
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
  --exclude 'data/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'brama-be/data/' \
  --exclude 'brama-be/dist/' \
  --exclude 'brama-web/dist/' \
  -e "$RSYNC_RSH" \
  "${ROOT_DIR}/" \
  "${SSH_TARGET}:${DEPLOY_PATH}/"

log "Installing, building, and restarting ${DEPLOY_SERVICE} on server"
REMOTE_APP_DIR="$(printf '%q' "$DEPLOY_PATH")"
REMOTE_SERVICE="$(printf '%q' "$DEPLOY_SERVICE")"
REMOTE_HEALTH_URL="$(printf '%q' "$HEALTH_URL")"

"${SSH_COMMAND[@]}" "$SSH_TARGET" "
set -Eeuo pipefail

cd ${REMOTE_APP_DIR}
HUSKY=0 npm install
npm run build -w brama-be
sudo systemctl restart ${REMOTE_SERVICE}
sudo systemctl is-active --quiet ${REMOTE_SERVICE}

if ! curl --fail --silent --show-error ${REMOTE_HEALTH_URL} >/dev/null; then
  echo '[deploy-be-local] Health check failed for ${HEALTH_URL}' >&2
  echo '[deploy-be-local] systemctl status:' >&2
  sudo systemctl status ${REMOTE_SERVICE} --no-pager -l >&2 || true
  echo '[deploy-be-local] recent journal:' >&2
  sudo journalctl -u ${REMOTE_SERVICE} -n 80 --no-pager >&2 || true
  echo '[deploy-be-local] listening TCP ports:' >&2
  ss -ltnp >&2 || true
  exit 1
fi
"

log "Backend deployed successfully"
