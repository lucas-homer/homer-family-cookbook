#!/usr/bin/env bash
# Drives the cookbook app in the iOS Simulator for agents and E2E tests.
#
#   e2e/sim.sh boot                 # boot the two HFC simulators (creates them if missing)
#   e2e/sim.sh build                # local dev build (expo run:ios, no EAS) and install on both
#   e2e/sim.sh metro [local|live]   # start Metro on :8091 (default local = http://127.0.0.1:5173)
#   e2e/sim.sh open [iphone|ipad]   # open the dev build on Metro
#   e2e/sim.sh shot [iphone|ipad] [file.png]
#   e2e/sim.sh test [iphone|ipad|all] [flow.yaml ...]   # Maestro, signed in as the test user
#
# Override with HFC_TARGET=live to sign in with the live test account.
set -euo pipefail
export LANG="${LANG:-en_US.UTF-8}" LC_ALL="${LC_ALL:-en_US.UTF-8}"  # CocoaPods fails without a UTF-8 locale
cd "$(dirname "$0")/.."

PORT="${HFC_METRO_PORT:-8091}"
RUNTIME="com.apple.CoreSimulator.SimRuntime.iOS-27-0"
BUNDLE_ID="com.homerfamilycookbook.app"
EMAIL="claude-e2e@homerfamilycookbook.test"
TARGET="${HFC_TARGET:-local}"

udid() { # name -> UDID, creating the simulator if needed
  local name="$1" type="$2" id
  id=$(xcrun simctl list devices -j | /usr/bin/python3 -c "import json,sys; d=json.load(sys.stdin)['devices']; print(next((x['udid'] for r in d.values() for x in r if x['name']=='$name' and x['isAvailable']), ''))")
  [[ -n "$id" ]] || id=$(xcrun simctl create "$name" "$type" "$RUNTIME")
  echo "$id"
}
iphone() { udid "HFC iPhone" com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro; }
ipad() { udid "HFC iPad" com.apple.CoreSimulator.SimDeviceType.iPad-Pro-13-inch-M5-12GB; }
devices() { case "${1:-all}" in iphone) iphone ;; ipad) ipad ;; all) iphone; ipad ;; *) echo "unknown device $1" >&2; exit 2 ;; esac; }
boot() { xcrun simctl bootstatus "$1" -b >/dev/null; }
dev_url() { echo "familycookbook://expo-development-client/?url=$(/usr/bin/python3 -c "import urllib.parse; print(urllib.parse.quote('http://127.0.0.1:$PORT', safe=''))")"; }

cmd="${1:-}"; shift || true
case "$cmd" in
  boot)
    for d in $(devices all); do boot "$d"; done; open -a Simulator ;;
  build)
    P=$(iphone); I=$(ipad); boot "$P"; boot "$I"
    CI=1 pnpm expo run:ios --device "$P" --no-bundler
    APP=$(ls -d ios/build/Build/Products/Debug-iphonesimulator/*.app 2>/dev/null | head -1 || true)
    [[ -n "$APP" ]] || APP=$(ls -dt ~/Library/Developer/Xcode/DerivedData/*/Build/Products/Debug-iphonesimulator/FamilyCookbook.app | head -1)
    xcrun simctl install "$I" "$APP"; echo "Installed $APP on both simulators" ;;
  metro)
    api=http://127.0.0.1:5173; [[ "${1:-local}" == live ]] && api=https://homerfamilycookbook.com
    EXPO_PUBLIC_API_URL="$api" exec pnpm expo start --dev-client --port "$PORT" --localhost ;;
  open)
    export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk}"
    for d in $(devices "${1:-all}"); do
      boot "$d"
      maestro --device "$d" test -e APP_ID="$BUNDLE_ID" -e DEV_URL="$(dev_url)" e2e/subflows/open.yaml >/dev/null
    done ;;
  shot)
    d=$(devices "${1:-iphone}"); out="${2:-/tmp/hfc-${1:-iphone}.png}"; xcrun simctl io "$d" screenshot "$out" >/dev/null; echo "$out" ;;
  test)
    which="${1:-all}"; shift || true
    flows=("$@"); [[ ${#flows[@]} -gt 0 ]] || flows=(e2e/flows)
    PASSWORD=$(security find-generic-password -s "hfc-e2e-$TARGET" -a "$EMAIL" -w) || { echo "No $TARGET test user; run node scripts/e2e/test-user.mjs create $TARGET from the repo root" >&2; exit 1; }
    export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk}"
    for d in $(devices "$which"); do
      boot "$d"
      maestro --device "$d" test -e APP_ID="$BUNDLE_ID" -e DEV_URL="$(dev_url)" -e E2E_EMAIL="$EMAIL" -e E2E_PASSWORD="$PASSWORD" "${flows[@]}"
    done ;;
  *) sed -n '2,12p' "$0"; exit 2 ;;
esac
