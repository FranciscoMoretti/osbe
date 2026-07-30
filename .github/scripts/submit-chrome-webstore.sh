#!/usr/bin/env bash
set -euo pipefail

if [ -z "${SUBMIT_KEYS:-}" ]; then
  echo "SUBMIT_KEYS is required"
  exit 1
fi

if [ -z "${ZIP_PATH:-}" ]; then
  echo "ZIP_PATH is required"
  exit 1
fi

if [ -z "${CONFIG_PATH:-}" ] || [ ! -f "$CONFIG_PATH" ]; then
  echo "CONFIG_PATH must point to an extension.config.json file"
  exit 1
fi

client_id="$(jq -r '.chrome.clientId' <<< "$SUBMIT_KEYS")"
client_secret="$(jq -r '.chrome.clientSecret' <<< "$SUBMIT_KEYS")"
refresh_token="$(jq -r '.chrome.refreshToken' <<< "$SUBMIT_KEYS")"
extension_id="$(jq -r '.chrome.extId' <<< "$SUBMIT_KEYS")"
expected_extension_id="$(jq -r '.store.storeId // empty' "$CONFIG_PATH")"

for value_name in client_id client_secret refresh_token extension_id; do
  value="${!value_name}"
  if [ -z "$value" ] || [ "$value" = "null" ]; then
    echo "SUBMIT_KEYS is missing chrome.${value_name}"
    exit 1
  fi
done

if [ -z "$expected_extension_id" ]; then
  echo "$CONFIG_PATH is missing store.storeId; complete the first manual submission and persist the assigned ID"
  exit 1
fi

if [ "$extension_id" != "$expected_extension_id" ]; then
  echo "SUBMIT_KEYS chrome.extId does not match $CONFIG_PATH store.storeId"
  exit 1
fi

token_response="$(mktemp)"
token_status="$(
  curl -sS -o "$token_response" -w "%{http_code}" \
    -X POST "https://oauth2.googleapis.com/token" \
    -d "client_id=${client_id}" \
    -d "client_secret=${client_secret}" \
    -d "refresh_token=${refresh_token}" \
    -d "grant_type=refresh_token"
)"

if [ "$token_status" != "200" ]; then
  echo "OAuth token request failed with HTTP ${token_status}"
  jq . "$token_response" || cat "$token_response"
  exit 1
fi

access_token="$(jq -r '.access_token' "$token_response")"

upload_response="$(mktemp)"
upload_status="$(
  curl -sS -o "$upload_response" -w "%{http_code}" \
    -X PUT \
    -H "Authorization: Bearer ${access_token}" \
    -H "x-goog-api-version: 2" \
    -H "Content-Type: application/zip" \
    --data-binary "@${ZIP_PATH}" \
    "https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extension_id}?uploadType=media"
)"

echo "Chrome Web Store upload response (${upload_status}):"
jq . "$upload_response" || cat "$upload_response"

if [ "$upload_status" != "200" ]; then
  exit 1
fi

upload_state="$(jq -r '.uploadState // empty' "$upload_response")"
if [ "$upload_state" != "SUCCESS" ]; then
  echo "Upload did not finish successfully: ${upload_state}"
  exit 1
fi

publish_response="$(mktemp)"
publish_status="$(
  curl -sS -o "$publish_response" -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${access_token}" \
    -H "x-goog-api-version: 2" \
    -H "Content-Length: 0" \
    "https://www.googleapis.com/chromewebstore/v1.1/items/${extension_id}/publish?publishTarget=default"
)"

echo "Chrome Web Store publish response (${publish_status}):"
jq . "$publish_response" || cat "$publish_response"

if jq -e '.status | index("OK") or index("ITEM_PENDING_REVIEW")' "$publish_response" > /dev/null; then
  exit 0
fi

exit 1
