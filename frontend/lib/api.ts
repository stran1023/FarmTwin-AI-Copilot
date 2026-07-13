const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type RiskLevel = "low" | "medium" | "high" | "critical" | string;

export interface Plot {
  plot_id: string;
  name: string;
  lat: number;
  lon: number;
  risk_level: RiskLevel;
  crop_type: string;
  area_hectares: number;
  planting_date: string;
}

export type WorkOrderStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "completed";

export interface WorkOrder {
  work_order_id: string;
  farm_id: string;
  created_at: string;
  action: string;
  status: WorkOrderStatus;
  approved_by: string | null;
  approved_at: string | null;
}

export interface PlotRisk {
  plot_id: string;
  narrative: string;
  work_order: WorkOrder | null;
}

export interface BriefingToday {
  date: string;
  approved_work_orders: WorkOrder[];
  rejected_work_orders: WorkOrder[];
  summary: string;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export function getPlots(): Promise<Plot[]> {
  return apiFetch<Plot[]>("/plots");
}

export function getPlotRisk(plotId: string): Promise<PlotRisk> {
  return apiFetch<PlotRisk>(`/plots/${plotId}/risk`);
}

export function approveWorkOrder(workOrderId: string, approvedBy = "coop_manager"): Promise<WorkOrder> {
  return apiFetch<WorkOrder>(`/workorders/${workOrderId}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved_by: approvedBy }),
  });
}

export function rejectWorkOrder(workOrderId: string, approvedBy = "coop_manager"): Promise<WorkOrder> {
  return apiFetch<WorkOrder>(`/workorders/${workOrderId}/reject`, {
    method: "POST",
    body: JSON.stringify({ approved_by: approvedBy }),
  });
}

export function getBriefingToday(): Promise<BriefingToday> {
  return apiFetch<BriefingToday>("/briefing/today");
}
