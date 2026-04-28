#!/usr/bin/env bash

set -euo pipefail

# Ramp traffic against the frontend LoadBalancer and the proxied API routes.
# Designed for bastion-host use with only bash + curl available.
#
# What you need to change before running:
# 1. BASE_URL
#    Paste your frontend LoadBalancer DNS name or URL here.
#    Example:
#    BASE_URL="http://a1b2c3d4e5f6.ap-south-1.elb.amazonaws.com" ./scripts/load-ramp.sh
#
#    Load balancer name to use:
#    frontend service EXTERNAL-IP / LoadBalancer DNS
#
#    You can get it with:
#    kubectl get svc -n devops-demo
#
# 2. Optional load settings
#    START_USERS = first concurrent user count
#    STEP_USERS = how many users to add in each stage
#    MAX_USERS = last concurrent user count
#    STEP_DURATION = how many seconds each stage runs
#    PAUSE_BETWEEN_REQUESTS = delay between requests from each user
#
# Default traffic plan in this script:
# - 5 users for 30 seconds
# - 10 users for 30 seconds
# - 15 users for 30 seconds
# - 20 users for 30 seconds
# - 25 users for 30 seconds
#
# Total default run time:
# - 150 seconds
# - 2 minutes 30 seconds
#
# More examples:
#   BASE_URL="http://a1b2c3d4e5f6.ap-south-1.elb.amazonaws.com" ./scripts/load-ramp.sh
#   BASE_URL="http://frontend.example.com" START_USERS=10 STEP_USERS=10 MAX_USERS=60 STEP_DURATION=45 ./scripts/load-ramp.sh

# CHANGE THIS: paste your frontend LoadBalancer URL at runtime using BASE_URL.
# BASE_URL="PASTE_FRONTEND_LOADBALANCER_DNS_HERE"
BASE_URL="${BASE_URL:-}"

# Optional tuning values. Change only if you want different traffic behavior.
START_USERS="${START_USERS:-5}"
STEP_USERS="${STEP_USERS:-5}"
MAX_USERS="${MAX_USERS:-25}"
STEP_DURATION="${STEP_DURATION:-30}"
PAUSE_BETWEEN_REQUESTS="${PAUSE_BETWEEN_REQUESTS:-0.20}"
CURL_TIMEOUT="${CURL_TIMEOUT:-5}"

# These are the frontend and API paths that will receive traffic.
ENDPOINTS=(
  "/"
  "/api/users"
  "/api/orders"
  "/api/payments"
)

if [[ -z "${BASE_URL}" ]]; then
  echo "BASE_URL is required."
  echo "Paste your frontend LoadBalancer DNS here."
  echo "Load balancer name: frontend service EXTERNAL-IP / LoadBalancer DNS"
  echo "Example: BASE_URL=http://a1b2c3d4e5f6.ap-south-1.elb.amazonaws.com ./scripts/load-ramp.sh"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required but not installed."
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

pick_endpoint() {
  local index=$((RANDOM % ${#ENDPOINTS[@]}))
  printf '%s' "${ENDPOINTS[$index]}"
}

worker() {
  local worker_id="$1"
  local stop_epoch="$2"
  local success_file="${TMP_DIR}/success-${worker_id}.count"
  local failure_file="${TMP_DIR}/failure-${worker_id}.count"
  local status_file="${TMP_DIR}/status-${worker_id}.log"

  : > "${status_file}"
  echo 0 > "${success_file}"
  echo 0 > "${failure_file}"

  while [[ "$(date +%s)" -lt "${stop_epoch}" ]]; do
    local endpoint
    local status
    endpoint="$(pick_endpoint)"

    status="$(curl -sS -o /dev/null -m "${CURL_TIMEOUT}" \
      -H "x-correlation-id: load-${worker_id}-${RANDOM}" \
      -w '%{http_code}' \
      "${BASE_URL}${endpoint}" || echo "000")"

    echo "${status} ${endpoint}" >> "${status_file}"

    if [[ "${status}" =~ ^[23] ]]; then
      echo $(( $(cat "${success_file}") + 1 )) > "${success_file}"
    else
      echo $(( $(cat "${failure_file}") + 1 )) > "${failure_file}"
    fi

    sleep "${PAUSE_BETWEEN_REQUESTS}"
  done
}

run_stage() {
  local users="$1"
  local stop_epoch=$(( $(date +%s) + STEP_DURATION ))
  local pids=()

  rm -f "${TMP_DIR}"/*.count "${TMP_DIR}"/*.log 2>/dev/null || true

  log "Starting stage with ${users} concurrent users for ${STEP_DURATION}s against ${BASE_URL}"

  for worker_id in $(seq 1 "${users}"); do
    worker "${worker_id}" "${stop_epoch}" &
    pids+=("$!")
  done

  for pid in "${pids[@]}"; do
    wait "${pid}"
  done

  local total_success=0
  local total_failure=0
  local total_requests=0

  shopt -s nullglob
  for file in "${TMP_DIR}"/success-*.count; do
    total_success=$(( total_success + $(cat "${file}") ))
  done
  for file in "${TMP_DIR}"/failure-*.count; do
    total_failure=$(( total_failure + $(cat "${file}") ))
  done
  shopt -u nullglob

  total_requests=$(( total_success + total_failure ))

  log "Stage complete: users=${users} total_requests=${total_requests} success=${total_success} failure=${total_failure}"
  log "Status summary:"
  if compgen -G "${TMP_DIR}/status-*.log" > /dev/null; then
    cat "${TMP_DIR}"/status-*.log | awk '{count[$1]++} END {for (code in count) printf "  %s -> %d\n", code, count[code]}' | sort
  else
    echo "  no status logs found"
  fi
}

main() {
  log "Ramp load test starting"
  log "Configuration: start=${START_USERS}, step=${STEP_USERS}, max=${MAX_USERS}, duration=${STEP_DURATION}s, pause=${PAUSE_BETWEEN_REQUESTS}s"

  local users="${START_USERS}"
  while [[ "${users}" -le "${MAX_USERS}" ]]; do
    run_stage "${users}"
    users=$(( users + STEP_USERS ))
  done

  log "Ramp load test finished"
}

main "$@"
