/**
 * Fails fast with a clear message if the real backend isn't reachable,
 * instead of letting every spec time out individually trying to fetch
 * against a dead http://localhost:8000.
 */
export default async function globalSetup() {
  const url = process.env.BACKEND_URL ?? "http://localhost:8000"
  try {
    const res = await fetch(`${url}/health`)
    if (!res.ok) throw new Error(`status ${res.status}`)
  } catch (err) {
    throw new Error(
      `Backend not reachable at ${url}/health (${String(err)}). ` +
        "These are live-data e2e tests, not mocked -- start the real backend first: " +
        "cd backend && ./venv/Scripts/uvicorn app.main:app --reload " +
        "(or the equivalent for your venv/OS).",
    )
  }
}
