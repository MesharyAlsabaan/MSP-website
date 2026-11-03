#!/usr/bin/env bash
# Read-only verification of the public-content security release.
# Sends only GET requests (plus GETs carrying a deliberately invalid token).
# Usage: bash docs/audits/msp-security-verify.sh [https://www.msp.sa]
# Before the release, the "no leak" checks are expected to FAIL; after it,
# every check must PASS.
set -u
SITE="${1:-https://www.msp.sa}"
API="$SITE/api"
fail=0

total() { # total for a list URL, or ERR
  curl -s -m 20 "$1" | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("total","ERR"))
except Exception: print("ERR")'
}
status() { curl -s -o /dev/null -m 20 -w '%{http_code}' "$@"; }
check() { # name, actual, expected
  if [ "$2" = "$3" ]; then printf 'PASS  %-62s %s\n' "$1" "$2"; else printf 'FAIL  %-62s got %s, expected %s\n' "$1" "$2" "$3"; fail=1; fi
}

echo "== Public users cannot retrieve hidden content =="
for r in projects:includeDrafts blog:includeDrafts services:includeDrafts testimonials:includeDrafts partners:includeInactive team:includeInactive; do
  res=${r%%:*}; flag=${r#*:}
  pub=$(total "$API/$res?pageSize=100")
  wide=$(total "$API/$res?pageSize=100&$flag=true")
  check "$res: $flag=true returns no extra items (public total $pub)" "$wide" "$pub"
done
# Records that were exposed before the release (seed data / inactive member).
check "testimonial NEOM (unpublished) by id"      "$(status "$API/testimonials/aab74e6a-c609-41a5-a904-e330dbc8be81")" 404
check "testimonial Qiddiya (unpublished) by id"   "$(status "$API/testimonials/817065bf-7243-42eb-a000-4a0561b4701c")" 404
check "partner NEOM (inactive) by id"             "$(status "$API/partners/e82249b2-940c-4b24-a75f-6327e4301915")" 404
check "partner Red Sea Global (inactive) by id"   "$(status "$API/partners/7a9b5a6f-591e-4788-bc22-8d2dec2aa8a6")" 404
check "inactive team member by id"                "$(status "$API/team/b7314753-7625-4eb1-977e-b682e5d55200")" 404
check "includeDrafts with an invalid token is refused" "$(status -H 'Authorization: Bearer invalid' "$API/projects?includeDrafts=true")" 401

echo "== Published content is still available =="
check "projects total"                 "$(total "$API/projects?pageSize=100")" 11
check "blog total"                     "$(total "$API/blog?pageSize=100")" 2
check "services total"                 "$(total "$API/services?pageSize=100")" 5
check "team total"                     "$(total "$API/team?pageSize=100")" 31
check "project by slug (madinah-hotel)" "$(status "$API/projects/slug/madinah-hotel")" 200
check "article by slug"                "$(status "$API/blog/slug/madinah-hotel-hospitality-rooted-in-place")" 200
check "settings"                       "$(status "$API/settings")" 200
check "published list with a stale token still works" "$(status -H 'Authorization: Bearer invalid' "$API/projects")" 200

echo "== Authentication unchanged =="
check "/auth/me without token"          "$(status "$API/auth/me")" 401
check "protected write without token"   "$(status -X POST -H 'Content-Type: application/json' -d '{}' "$API/projects")" 401

echo "== Public website =="
for p in / /projects/ /projects/madinah-hotel /ar; do check "page $p" "$(status -L "$SITE$p")" 200; done

echo
if [ $fail = 0 ]; then echo "RESULT: ALL CHECKS PASS"; else echo "RESULT: SOME CHECKS FAILED"; fi
exit $fail
