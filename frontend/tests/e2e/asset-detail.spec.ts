import { test, expect } from "@playwright/test"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000"

type BackendAsset = { asset_id: string; name: string }

async function getFirstAsset(request: import("@playwright/test").APIRequestContext) {
  const res = await request.get(`${BACKEND_URL}/assets`)
  expect(res.ok()).toBeTruthy()
  const assets: BackendAsset[] = await res.json()
  expect(assets.length).toBeGreaterThan(0)
  return assets[0]
}

test.describe("Asset Detail", () => {
  test("no duplicate Today's Tasks card; Recommendations section is present", async ({
    page,
    request,
  }) => {
    const asset = await getFirstAsset(request)
    await page.goto(`/assets/${asset.asset_id}`)
    await page.waitForTimeout(1000)

    const body = await page.locator("body").innerText()
    expect(body).not.toContain("Today's Tasks")
    expect(body).toContain("Recommendations")
    expect(body).toContain(asset.name)
  })

  test("History is collapsed by default and toggles open/closed on click", async ({
    page,
    request,
  }) => {
    // Pick the asset with the most history so the expand/collapse text-length
    // delta is unambiguous even if some assets have zero history rows.
    const res = await request.get(`${BACKEND_URL}/assets`)
    const assets: BackendAsset[] = await res.json()
    let bestAssetId = assets[0].asset_id
    let bestCount = -1
    for (const a of assets) {
      const detail = await (
        await request.get(`${BACKEND_URL}/assets/${a.asset_id}`)
      ).json()
      const count = (detail.history ?? []).length
      if (count > bestCount) {
        bestCount = count
        bestAssetId = a.asset_id
      }
    }
    test.skip(bestCount <= 0, "no asset has any history rows to expand")

    await page.goto(`/assets/${bestAssetId}`)
    await page.waitForTimeout(1000)

    const historyButton = page.getByRole("button", { name: /History/ })
    await expect(historyButton).toHaveCount(1)

    const collapsedLength = (await page.locator("body").innerText()).length
    await historyButton.click()
    await page.waitForTimeout(300)
    const expandedLength = (await page.locator("body").innerText()).length
    expect(expandedLength).toBeGreaterThan(collapsedLength)

    await historyButton.click()
    await page.waitForTimeout(300)
    const recollapsedLength = (await page.locator("body").innerText()).length
    expect(recollapsedLength).toBe(collapsedLength)
  })
})
