import { SplitFarmView } from "@/components/SplitFarmView"

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SplitFarmView initialAssetId={id} />
}
