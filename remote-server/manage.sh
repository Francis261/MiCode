#!/usr/bin/env bash
# manage.sh - interactive manager for the MiCode remote MCP server's OAuth settings.
#
#   ./manage.sh              open the menu
#   ./manage.sh status       one-shot commands: status | show | reveal [platform] | rotate [platform]
#                            owner | revoke | redirects [platform] | test | restart | logs
#
# Settings live in remote-server/.env (mode 600). Changes apply after the server restarts.
set -u
umask 077

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${MICODE_ENV_FILE:-$DIR/.env}"
PM2_APP="${PM2_APP:-micode}"
PLATFORMS=(chatgpt gemini cloude)
BACKED_UP=0

if [ -t 1 ]; then B=$'\033[1m'; R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'; N=$'\033[0m'; else B=; R=; G=; Y=; N=; fi
info() { printf '%s\n' "$*"; }
ok()   { printf '%s✔%s %s\n' "$G" "$N" "$*"; }
warn() { printf '%s!%s %s\n' "$Y" "$N" "$*"; }
err()  { printf '%s✖%s %s\n' "$R" "$N" "$*" >&2; }

ask_yes() { local a; read -r -p "$1 [y/N] " a; case "$a" in y|Y|yes|YES) return 0 ;; *) return 1 ;; esac; }
rand_hex() { openssl rand -hex "$1" 2>/dev/null || node -e "console.log(require('crypto').randomBytes($1).toString('hex'))"; }
http_code() { local c; c="$(curl -s -o /dev/null -m 6 -w '%{http_code}' "$@" 2>/dev/null)" || true; printf '%s' "${c:-000}"; }
clear_screen() { printf '\033[2J\033[3J\033[H'; }

# ---------- .env helpers ----------
get_var() { grep -m1 "^$1=" "$ENV_FILE" 2>/dev/null | cut -d= -f2-; }

backup_env() {
  [ "$BACKED_UP" = 1 ] && return 0
  [ -f "$ENV_FILE" ] && cp "$ENV_FILE" "$ENV_FILE.bak" && chmod 600 "$ENV_FILE.bak"
  BACKED_UP=1
}

set_var() { # set_var KEY VALUE  (replace the line, or append it)
  local tmp
  backup_env
  tmp="$(mktemp "$ENV_FILE.XXXXXX")" || return 1
  K="$1" V="$2" awk 'BEGIN{k=ENVIRON["K"];v=ENVIRON["V"];d=0} index($0,k"=")==1{print k"="v;d=1;next} {print} END{if(!d)print k"="v}' "$ENV_FILE" > "$tmp"
  chmod 600 "$tmp" && mv "$tmp" "$ENV_FILE"
}

init_env() {
  warn "No .env found - creating $ENV_FILE with fresh credentials"
  {
    echo "# MiCode remote MCP - OAuth configuration (gitignored, keep private)"
    echo "MICODE_PUBLIC_URL=https://mcp.nesorah.com"
    echo "MICODE_TRUST_PROXY=1"
    echo "MICODE_TOKEN_SECRET=$(rand_hex 48)"
    echo "MICODE_OWNER_PASSWORD=$(rand_hex 12)"
    for p in "${PLATFORMS[@]}"; do
      echo
      echo "MICODE_${p^^}_CLIENT_ID=micode-$p"
      echo "MICODE_${p^^}_CLIENT_SECRET=$(rand_hex 32)"
    done
    echo "MICODE_GEMINI_REDIRECT_URIS="
  } > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
}
ensure_env() { [ -f "$ENV_FILE" ] || init_env; }

mask() { local s="$1"; if [ "${#s}" -le 8 ]; then printf '********'; else printf '%s...%s' "${s:0:4}" "${s: -4}"; fi; }

valid_platform() { local p; for p in "${PLATFORMS[@]}"; do [ "$p" = "$1" ] && return 0; done; return 1; }
PLATFORM=""
pick_platform() {
  PLATFORM=""
  if [ -n "${1:-}" ]; then
    [ "$1" = claude ] && set -- cloude
    if valid_platform "$1"; then PLATFORM="$1"; return 0; fi
    err "Unknown platform '$1' (use: ${PLATFORMS[*]})"; return 1
  fi
  info "Platform:  1) chatgpt   2) gemini   3) cloude (Claude)"
  local a; read -r -p "Choose [1-3]: " a
  case "$a" in 1|chatgpt) PLATFORM=chatgpt ;; 2|gemini) PLATFORM=gemini ;; 3|cloude|claude) PLATFORM=cloude ;; *) err "Invalid choice"; return 1 ;; esac
}

offer_restart() {
  if ask_yes "Restart the server now to apply this? (active MCP sessions will drop)"; then cmd_restart
  else info "Apply later with: ./manage.sh restart"; fi
}

# ---------- commands ----------
cmd_status() {
  ensure_env
  local port pub pid code mode p
  port="$(get_var PORT)"; port="${port:-8787}"
  pub="$(get_var MICODE_PUBLIC_URL)"
  info "${B}MiCode status${N}"
  if command -v pm2 >/dev/null 2>&1; then
    pid="$(pm2 pid "$PM2_APP" 2>/dev/null | tr -d '[:space:]')"
    if [ -n "$pid" ] && [ "$pid" != "0" ]; then ok "pm2 app '$PM2_APP' online (pid $pid)"; else err "pm2 app '$PM2_APP' is not running"; fi
  else warn "pm2 not found - skipping process check"; fi
  code="$(http_code "http://127.0.0.1:$port/health")"
  if [ "$code" = 200 ]; then ok "Local health OK (port $port)"; else err "Local health failed (HTTP $code)"; fi
  if [ -n "$pub" ]; then
    code="$(http_code "$pub/health")"
    if [ "$code" = 200 ]; then ok "Public health OK ($pub)"; else warn "Public health HTTP $code ($pub) - check the tunnel"; fi
  fi
  mode="$(stat -c %a "$ENV_FILE" 2>/dev/null)"
  if [ "$mode" = 600 ]; then ok ".env permissions are 600"; else warn ".env permissions are $mode (should be 600)"; fi
  for p in "${PLATFORMS[@]}"; do
    if [ -z "$(get_var "MICODE_${p^^}_CLIENT_ID")" ]; then info "  $p: no credentials in .env"; continue; fi
    code="$(http_code "http://127.0.0.1:$port/.well-known/oauth-protected-resource/$p/mcp")"
    case "$code" in
      200) ok "$p: OAuth ready" ;;
      503) err "$p: server says OAuth is not ready - check .env, then restart" ;;
      404) warn "$p: in .env but the running server does not serve it yet - restart needed" ;;
      *)   err "$p: unexpected HTTP $code" ;;
    esac
  done
}

cmd_show() {
  ensure_env
  local pub p extra
  pub="$(get_var MICODE_PUBLIC_URL)"
  info "${B}Connector settings${N}  (secrets hidden - use 'reveal')"
  for p in "${PLATFORMS[@]}"; do
    info ""
    info "${B}$p${N}"
    info "  MCP URL:       $pub/$p/mcp"
    info "  Auth URL:      $pub/$p/oauth/authorize"
    info "  Token URL:     $pub/$p/oauth/token"
    info "  Client ID:     $(get_var "MICODE_${p^^}_CLIENT_ID")"
    info "  Client secret: $(mask "$(get_var "MICODE_${p^^}_CLIENT_SECRET")")"
    info "  Scope:         mcp"
    extra="$(get_var "MICODE_${p^^}_REDIRECT_URIS")"
    info "  Extra callbacks: ${extra:-(none)}   (built-in defaults are listed in src/oauth.js)"
  done
  info ""
  info "Owner password: $(mask "$(get_var MICODE_OWNER_PASSWORD)")  (asked on the approval page)"
}

cmd_reveal() {
  ensure_env
  pick_platform "${1:-}" || return 1
  local id sec
  id="$(get_var "MICODE_${PLATFORM^^}_CLIENT_ID")"; sec="$(get_var "MICODE_${PLATFORM^^}_CLIENT_SECRET")"
  [ -n "$sec" ] || { err "No client secret set for $PLATFORM"; return 1; }
  warn "This prints the secret on screen."
  info "  Client ID:     $id"
  info "  Client secret: $sec"
  if [ -t 0 ]; then read -r -p "Press Enter to clear the screen... " _; clear_screen; fi
}

cmd_rotate() {
  ensure_env
  pick_platform "${1:-}" || return 1
  warn "Rotating the $PLATFORM secret: the old one stops working after restart, and you must paste the new one into $PLATFORM's connector settings."
  local a; read -r -p "Type 'yes' to continue: " a
  [ "$a" = yes ] || { info "Cancelled."; return 0; }
  set_var "MICODE_${PLATFORM^^}_CLIENT_SECRET" "$(rand_hex 32)"
  ok "New $PLATFORM client secret saved (old .env kept at $ENV_FILE.bak)"
  info "Use './manage.sh reveal $PLATFORM' to view it."
  offer_restart
}

cmd_owner() {
  ensure_env
  local a pw pw2 generated=0
  info "Owner password:  1) generate a random one   2) type my own"
  read -r -p "Choose [1-2]: " a
  case "$a" in
    1) pw="$(rand_hex 12)"; generated=1 ;;
    2) read -r -s -p "New password (12+ chars, no spaces/quotes/#): " pw; echo
       read -r -s -p "Repeat: " pw2; echo
       [ "$pw" = "$pw2" ] || { err "Passwords differ"; return 1; }
       [[ "$pw" =~ ^[A-Za-z0-9._~!@%^*+=:,/-]{12,}$ ]] || { err "Need 12+ chars from letters, digits and . _ ~ ! @ % ^ * + = : , / -"; return 1; } ;;
    *) err "Invalid choice"; return 1 ;;
  esac
  set_var MICODE_OWNER_PASSWORD "$pw"
  ok "Owner password updated"
  if [ "$generated" = 1 ]; then
    info "  New password: $pw"
    if [ -t 0 ]; then read -r -p "Press Enter to clear the screen... " _; clear_screen; fi
  fi
  offer_restart
}

cmd_revoke() {
  ensure_env
  warn "This signs out every connected client (ChatGPT, Gemini, Claude): all access and refresh tokens stop working and each must re-authorize."
  local a; read -r -p "Type 'yes' to continue: " a
  [ "$a" = yes ] || { info "Cancelled."; return 0; }
  set_var MICODE_TOKEN_SECRET "$(rand_hex 48)"
  ok "Token signing key rotated"
  offer_restart
}

cmd_redirects() {
  ensure_env
  pick_platform "${1:-}" || return 1
  local key cur new u bad=0
  key="MICODE_${PLATFORM^^}_REDIRECT_URIS"
  cur="$(get_var "$key")"
  info "Extra callback URLs for $PLATFORM (comma separated): ${cur:-(none)}"
  info "Built-in defaults stay active. Leave blank to keep, or type '-' to clear."
  read -r -p "New value: " new
  [ -z "$new" ] && { info "Unchanged."; return 0; }
  [ "$new" = "-" ] && new=""
  local IFS=','
  for u in $new; do
    u="${u// /}"
    [[ "$u" =~ ^(https://|http://localhost[:/]|http://127\.0\.0\.1[:/]) ]] || { err "Not allowed: '$u' (must be https://, or http://localhost for testing)"; bad=1; }
  done
  unset IFS
  [ "$bad" = 0 ] || return 1
  set_var "$key" "${new// /}"
  ok "Saved $key"
  offer_restart
}

cmd_test() {
  ensure_env
  local port pub p code hdr
  port="$(get_var PORT)"; port="${port:-8787}"; pub="$(get_var MICODE_PUBLIC_URL)"
  info "${B}Endpoint checks${N}"
  code="$(http_code -X POST "http://127.0.0.1:$port/mcp" -d '{}')"
  if [ "$code" = 404 ]; then ok "legacy /mcp is closed (404)"; else err "legacy /mcp returned $code (expected 404 - old server still running?)"; fi
  for p in "${PLATFORMS[@]}"; do
    [ -n "$(get_var "MICODE_${p^^}_CLIENT_ID")" ] || continue
    code="$(http_code -X POST "http://127.0.0.1:$port/$p/mcp" -d '{}')"
    if [ "$code" = 401 ]; then ok "/$p/mcp requires a token (401)"; else err "/$p/mcp returned $code (expected 401)"; fi
    if [ -n "$pub" ]; then
      hdr="$(curl -s -m 6 -D - -o /dev/null -X POST "$pub/$p/mcp" -d '{}' 2>/dev/null | tr -d '\r' | grep -i '^www-authenticate:' || true)"
      case "$hdr" in *resource_metadata*) ok "$pub/$p/mcp reachable and advertises OAuth metadata" ;; *) warn "$pub/$p/mcp did not return the OAuth challenge (tunnel or restart issue?)" ;; esac
    fi
  done
}

cmd_restart() {
  command -v pm2 >/dev/null 2>&1 || { err "pm2 not found"; return 1; }
  info "Restarting pm2 app '$PM2_APP'..."
  pm2 restart "$PM2_APP" --update-env >/dev/null 2>&1 || { err "pm2 restart failed - run: pm2 logs $PM2_APP"; return 1; }
  local port i code; port="$(get_var PORT)"; port="${port:-8787}"
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    code="$(http_code "http://127.0.0.1:$port/health")"
    [ "$code" = 200 ] && break
    sleep 1
  done
  [ "$code" = 200 ] && ok "Server is back up" || { err "Server did not come back - run: ./manage.sh logs"; return 1; }
  cmd_status
}

cmd_logs() { command -v pm2 >/dev/null 2>&1 && pm2 logs "$PM2_APP" --lines 40 --nostream || err "pm2 not found"; }

usage() { sed -n '2,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

menu() {
  local a
  while true; do
    info ""
    info "${B}MiCode OAuth manager${N}"
    info "  1) Status                 6) Revoke all tokens"
    info "  2) Show connector settings 7) Set callback URLs"
    info "  3) Reveal a client secret 8) Test endpoints"
    info "  4) Rotate a client secret 9) Restart server"
    info "  5) Change owner password  10) View logs"
    info "  0) Quit"
    read -r -p "> " a || break
    case "$a" in
      1) cmd_status ;; 2) cmd_show ;; 3) cmd_reveal ;; 4) cmd_rotate ;; 5) cmd_owner ;;
      6) cmd_revoke ;; 7) cmd_redirects ;; 8) cmd_test ;; 9) cmd_restart ;; 10) cmd_logs ;;
      0|q|quit|exit) break ;;
      *) warn "Choose 0-10" ;;
    esac
  done
}

case "${1:-menu}" in
  menu) menu ;;
  status) cmd_status ;;
  show) cmd_show ;;
  reveal) cmd_reveal "${2:-}" ;;
  rotate) cmd_rotate "${2:-}" ;;
  owner) cmd_owner ;;
  revoke) cmd_revoke ;;
  redirects) cmd_redirects "${2:-}" ;;
  test) cmd_test ;;
  restart) cmd_restart ;;
  logs) cmd_logs ;;
  -h|--help|help) usage ;;
  *) err "Unknown command '$1'"; usage; exit 1 ;;
esac
