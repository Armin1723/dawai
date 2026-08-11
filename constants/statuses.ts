export const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  // inventory
  "in stock": "success",
  active: "success",
  available: "success",
  low: "warning",
  "low stock": "warning",
  "out of stock": "destructive",
  expired: "destructive",
  "near expiry": "warning",
  // orders & payments
  draft: "outline",
  pending: "warning",
  partial: "info",
  ordered: "info",
  received: "success",
  cancelled: "secondary",
  void: "secondary",
  held: "info",
  paid: "success",
  overdue: "destructive",
  refunded: "secondary",
  completed: "success",
  returned: "secondary",
};

export function statusVariant(status: string) {
  return STATUS_VARIANTS[status.toLowerCase()] ?? "secondary";
}
