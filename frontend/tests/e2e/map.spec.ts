import { test, expect, type APIRequestContext } from "@playwright/test"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000"

type BackendAsset = {
  asset_id: string
  name: string
  status: "critical" | "needs_attention" | "healthy"
}

async function getAssets(request: APIRequestContext): Promise<BackendAsset[]> {
  const res = await request.get(`${BACKEND_URL}/assets`)
  expect(res.ok(), "GET /assets should succeed").toBeTruthy()
  return res.json()
}

test.describe("Digital twin map", () => {
  test("renders one marker per real asset, with zero console errors", async ({ page, request }) => {
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text())
    })
    page.on("pageerror", (err) => errors.push(String(err)))

    const assets = await getAssets(request)

    await page.goto("/")
    await page.waitForSelector('[aria-label="Digital twin farm map"]')
    // let the client-side assets fetch resolve
    await page.waitForTimeout(1500)

    const map = page.locator('[aria-label="Digital twin farm map"]')
    const markerButtons = map.locator("button[aria-label]")
    await expect(markerButtons).toHaveCount(assets.length)

    for (const asset of assets) {
      await expect(map.getByRole("button", { name: new RegExp(asset.name) })).toBeVisible()
    }

    expect(errors).toEqual([])
  })

  test("the Asset Status pill shows real per-status counts, centered on the map", async ({
    page,
    request,
  }) => {
    const assets = await getAssets(request)
    const expected = {
      critical: assets.filter((a) => a.status === "critical").length,
      needs_attention: assets.filter((a) => a.status === "needs_attention").length,
      healthy: assets.filter((a) => a.status === "healthy").length,
    }

    await page.goto("/")
    await page.waitForSelector('[aria-label="Digital twin farm map"]')
    await page.waitForTimeout(1500)

    const pill = page.locator('[aria-label="Asset status summary"]')
    await expect(pill).toHaveCount(1)
    const text = await pill.innerText()
    expect(text).toContain(`Critical\n${expected.critical}`)
    expect(text).toContain(`Attention\n${expected.needs_attention}`)
    expect(text).toContain(`Healthy\n${expected.healthy}`)

    // horizontally centered relative to the map stage, not just visually close
    const pillBox = await pill.boundingBox()
    const mapBox = await page.locator('[aria-label="Digital twin farm map"]').boundingBox()
    expect(pillBox).not.toBeNull()
    expect(mapBox).not.toBeNull()
    if (pillBox && mapBox) {
      const pillCenter = pillBox.x + pillBox.width / 2
      const mapCenter = mapBox.x + mapBox.width / 2
      expect(Math.abs(pillCenter - mapCenter)).toBeLessThan(2)
    }
  })

  test("clicking a marker opens that exact asset's detail view", async ({ page, request }) => {
    const assets = await getAssets(request)
    const target = assets[0]

    await page.goto("/")
    await page.waitForSelector('[aria-label="Digital twin farm map"]')
    await page.waitForTimeout(1500)

    await page
      .locator('[aria-label="Digital twin farm map"]')
      .getByRole("button", { name: new RegExp(target.name) })
      .click()
    await expect(page).toHaveURL(new RegExp(`/assets/${target.asset_id}$`))
    await expect(page.getByRole("heading", { name: target.name })).toBeVisible()
  })
})
