#!/usr/bin/env bash
set -euo pipefail

API_BASE="https://api.cursor.com/v0"

if [ -z "${CURSOR_API_KEY:-}" ]; then
  echo "ERROR: CURSOR_API_KEY is not set" >&2
  exit 1
fi

auth_header() {
  echo -n "${CURSOR_API_KEY}:" | base64
}

api() {
  local method="$1"
  local path="$2"
  shift 2
  curl -sS -X "$method" \
    -H "Authorization: Basic $(auth_header)" \
    -H "Content-Type: application/json" \
    "$@" \
    "${API_BASE}${path}"
}

cmd_list() {
  local limit="${1:-20}"
  api GET "/agents?limit=${limit}"
}

cmd_status() {
  local id="$1"
  api GET "/agents/${id}"
}

cmd_conversation() {
  local id="$1"
  api GET "/agents/${id}/conversation"
}

images_json() {
  if [ $# -eq 0 ]; then
    echo "null"
    return
  fi
  local result="[]"
  for img in "$@"; do
    local b64
    b64=$(base64 -i "$img" | tr -d '\n')
    local width height
    width=$(sips -g pixelWidth "$img" 2>/dev/null | awk '/pixelWidth/{print $2}')
    height=$(sips -g pixelHeight "$img" 2>/dev/null | awk '/pixelHeight/{print $2}')
    result=$(echo "$result" | jq \
      --arg d "$b64" \
      --argjson w "${width:-0}" \
      --argjson h "${height:-0}" \
      '. + [{"data": $d, "dimension": {"width": $w, "height": $h}}]')
  done
  echo "$result"
}

prompt_json() {
  local text="$1"
  shift
  local imgs
  imgs=$(images_json "$@")
  if [ "$imgs" = "null" ]; then
    jq -n --arg t "$text" '{"text": $t}'
  else
    jq -n --arg t "$text" --argjson i "$imgs" '{"text": $t, "images": $i}'
  fi
}

cmd_launch() {
  local repo="$1"
  local prompt="$2"
  local ref="${3:-main}"
  local auto_pr="${4:-false}"
  local model="${5:-}"
  local branch="${6:-}"
  shift 6 2>/dev/null || true

  local prompt_obj
  if [ $# -gt 0 ]; then
    prompt_obj=$(prompt_json "$prompt" "$@")
  else
    prompt_obj=$(prompt_json "$prompt")
  fi

  local body
  body=$(jq -n \
    --argjson p "$prompt_obj" \
    --arg repo "$repo" \
    --arg ref "$ref" \
    --argjson apr "$auto_pr" \
    '{"prompt": $p, "source": {"repository": $repo, "ref": $ref}, "target": {"autoCreatePr": $apr}}')

  if [ -n "$model" ]; then
    body=$(echo "$body" | jq --arg m "$model" '. + {model: $m}')
  fi
  if [ -n "$branch" ]; then
    body=$(echo "$body" | jq --arg b "$branch" '.target.branchName = $b')
  fi

  api POST "/agents" -d "$body"
}

cmd_launch_pr() {
  local pr_url="$1"
  local prompt="$2"
  local auto_branch="${3:-true}"
  local model="${4:-}"
  shift 4 2>/dev/null || true

  local prompt_obj
  if [ $# -gt 0 ]; then
    prompt_obj=$(prompt_json "$prompt" "$@")
  else
    prompt_obj=$(prompt_json "$prompt")
  fi

  local body
  body=$(jq -n \
    --argjson p "$prompt_obj" \
    --arg pr "$pr_url" \
    --argjson ab "$auto_branch" \
    '{"prompt": $p, "source": {"prUrl": $pr}, "target": {"autoBranch": $ab}}')

  if [ -n "$model" ]; then
    body=$(echo "$body" | jq --arg m "$model" '. + {model: $m}')
  fi

  api POST "/agents" -d "$body"
}

cmd_followup() {
  local id="$1"
  local prompt="$2"
  shift 2 2>/dev/null || true

  local prompt_obj
  if [ $# -gt 0 ]; then
    prompt_obj=$(prompt_json "$prompt" "$@")
  else
    prompt_obj=$(prompt_json "$prompt")
  fi

  local body
  body=$(jq -n --argjson p "$prompt_obj" '{"prompt": $p}')

  api POST "/agents/${id}/followup" -d "$body"
}

cmd_stop() {
  local id="$1"
  api POST "/agents/${id}/stop"
}

cmd_delete() {
  local id="$1"
  api DELETE "/agents/${id}"
}

cmd_me() {
  api GET "/me"
}

cmd_models() {
  api GET "/models"
}

cmd_repos() {
  api GET "/repositories"
}

case "${1:-help}" in
  list)         shift; cmd_list "$@" ;;
  status)       shift; cmd_status "$@" ;;
  conversation) shift; cmd_conversation "$@" ;;
  launch)       shift; cmd_launch "$@" ;;
  launch-pr)    shift; cmd_launch_pr "$@" ;;
  followup)     shift; cmd_followup "$@" ;;
  stop)         shift; cmd_stop "$@" ;;
  delete)       shift; cmd_delete "$@" ;;
  me)           shift; cmd_me ;;
  models)       shift; cmd_models ;;
  repos)        shift; cmd_repos ;;
  help|*)
    cat <<EOF
Usage: cloud-agent.sh <command> [args...]

Commands:
  list [limit]                                                        List agents (default: 20)
  status <id>                                                         Get agent status
  conversation <id>                                                   Get agent conversation
  launch <repo> <prompt> [ref] [auto_pr] [model] [branch] [images..] Launch new agent
  launch-pr <pr_url> <prompt> [auto_branch] [model] [images..]       Launch agent on a PR
  followup <id> <prompt> [images..]                                   Send follow-up to agent
  stop <id>                                                           Stop a running agent
  delete <id>                                                         Delete an agent
  me                                                                  API key info
  models                                                              List available models
  repos                                                               List GitHub repositories

Images are optional trailing file paths (max 5). They are base64-encoded and sent with the prompt.
EOF
    ;;
esac
