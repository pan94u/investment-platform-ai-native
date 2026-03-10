#!/bin/bash
set -e

VERSION=${1:-v1}
PASS=0
FAIL=0

# Port mapping
case $VERSION in
  v1) PORT=8001 ;;
  v2) PORT=8002 ;;
  v3) PORT=8003 ;;
  v4) PORT=8004 ;;
  *) echo "Unknown version: $VERSION"; exit 1 ;;
esac

echo "=== Verifying Filing $VERSION (port $PORT) ==="

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "ok" ]; then
    echo "  ✅ $name"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name: $result"
    FAIL=$((FAIL + 1))
  fi
}

# 1. Health check
HEALTH=$(curl -sf "http://localhost:$PORT/health" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','fail'))" 2>/dev/null || echo "fail")
check "Health check" "$([ "$HEALTH" = "ok" ] && echo "ok" || echo "$HEALTH")"

# 2. Frontend accessible
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null || echo "000")
check "Frontend accessible" "$([ "$HTTP_CODE" = "200" ] && echo "ok" || echo "HTTP $HTTP_CODE")"

# 3. API: Get users
USERS=$(curl -sf "http://localhost:$PORT/api/auth/users" 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "0")
check "API: Get users" "$([ "$USERS" -ge 1 ] 2>/dev/null && echo "ok" || echo "got $USERS users")"

# 4. API: Create filing
CREATE=$(curl -sf -X POST "http://localhost:$PORT/api/filings" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-zhangsan" \
  -d '{"type":"direct_investment","title":"验证测试备案","description":"自动验证","projectName":"测试项目","domain":"smart_living","industry":"住居科技","amount":1000}' 2>/dev/null)
FILING_ID=$(echo "$CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null || echo "")
check "API: Create filing" "$([ -n "$FILING_ID" ] && echo "ok" || echo "failed")"

# 5. API: Submit filing
if [ -n "$FILING_ID" ]; then
  SUBMIT=$(curl -sf -X POST "http://localhost:$PORT/api/filings/$FILING_ID/submit" -H "X-User-Id: user-zhangsan" 2>/dev/null)
  SUBMIT_STATUS=$(echo "$SUBMIT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('status',''))" 2>/dev/null || echo "")
  check "API: Submit filing" "$([ "$SUBMIT_STATUS" = "pending_level1" ] && echo "ok" || echo "status=$SUBMIT_STATUS")"
fi

# 6. API: Dashboard stats
STATS=$(curl -sf "http://localhost:$PORT/api/dashboard/stats" -H "X-User-Id: user-ceo" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('totalCount',0))" 2>/dev/null || echo "0")
check "API: Dashboard stats" "$([ "$STATS" -ge 1 ] 2>/dev/null && echo "ok" || echo "totalCount=$STATS")"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && echo "=== ALL CHECKS PASSED ===" || echo "=== SOME CHECKS FAILED ==="
exit $FAIL
