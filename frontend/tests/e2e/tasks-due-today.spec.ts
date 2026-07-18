import { test, expect } from "@playwright/test"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000"

type BackendRecommendation = {
  recommendation_id: string
  asset_id: string
  recommendation: string
}

test.describe("Farm Overview: Tasks Due Today", () => {
  test("Active Alerts and Daily Recommendations were removed, Tasks Due Today remains", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForSelector('[aria-label="Digital twin farm map"]')
    await page.waitForTimeout(1500)

    const body = await page.locator("body").innerText()
    expect(body).not.toContain("Active Alerts")
    expect(body).not.toContain("Daily Recommendations")
    expect(body).toContain("Tasks Due Today")
  })

  test("hovering a task highlights its exact asset marker, click navigates to its detail view", async ({
    page,
    request,
  }) => {
    const res = await request.get(`${BACKEND_URL}/dashboard/summary`)
    expect(res.ok()).toBeTruthy()
    const summary = await res.json()
    const tasks: BackendRecommendation[] = summary.tasks_due_today ?? []

    test.skip(tasks.length === 0, "no pending recommendations right now -- nothing to hover/click")

    const target = tasks[0]

    await page.goto("/")
    await page.waitForSelector('[aria-label="Digital twin farm map"]')
    await page.waitForTimeout(1500)

    const taskRow = page.locator("ul li", { hasText: target.recommendation.slice(0, 30) }).first()
    await expect(taskRow).toBeVisible()

    await expect(page.locator('span[style*="highlight-ring"]')).toHaveCount(0)
    await taskRow.hover()
    await expect(page.locator('span[style*="highlight-ring"]')).toHaveCount(1)

    await taskRow.click()
    await expect(page).toHaveURL(new RegExp(`/assets/${target.asset_id}$`))
  })
})
