#!/bin/bash
set -e

echo "=== Harness Initialization ==="

echo "=== cd backend && python -m compileall app ==="
(cd backend && python -m compileall app)

if [ -x backend/venv/Scripts/python.exe ]; then
  PYBIN=backend/venv/Scripts/python.exe
elif [ -x backend/venv/bin/python ]; then
  PYBIN=backend/venv/bin/python
else
  PYBIN=""
fi

if [ -n "$PYBIN" ]; then
  echo "=== backend pytest suite (backend/tests) ==="
  "$PYBIN" -m pytest backend/tests -q
else
  echo "=== backend/venv not found -- skipping the real pytest suite ==="
  echo "    Set it up with: cd backend && python -m venv venv && ./venv/Scripts/pip install -r requirements-dev.txt"
fi

# The frontend e2e suite is not mocked -- it hits a real running backend +
# live Snowflake account (see frontend/playwright.config.ts), so it only
# runs when both the dependencies and a reachable backend are actually
# there; it degrades to a skip message otherwise rather than failing the
# whole init.sh for a machine that hasn't started its dev servers yet.
if [ -d frontend/node_modules ]; then
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "=== frontend e2e suite (frontend/tests/e2e, live backend) ==="
    (cd frontend && npm run test:e2e)
  else
    echo "=== backend not reachable at :8000 -- skipping the frontend e2e suite ==="
    echo "    Start it first, then re-run: cd backend && ./venv/Scripts/uvicorn app.main:app --reload"
  fi
else
  echo "=== frontend/node_modules not found -- skipping the frontend e2e suite ==="
  echo "    Set it up with: cd frontend && npm install && npx playwright install chromium"
fi

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read feature_list.json to see current feature state"
echo "2. Pick ONE unfinished feature to work on"
echo "3. Implement only that feature"
echo "4. Re-run verification before claiming done"
