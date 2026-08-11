export type UserRole =
  | "owner"
  | "administrator"
  | "manager"
  | "cashier"
  | "pharmacist"
  | "inventory_staff";

export type Permission =
  | "dashboard.view"
  | "pos.operate"
  | "sales.view"
  | "sales.create"
  | "returns.create"
  | "inventory.view"
  | "inventory.manage"
  | "inventory.adjust"
  | "purchases.view"
  | "purchases.manage"
  | "suppliers.view"
  | "suppliers.manage"
  | "customers.view"
  | "customers.manage"
  | "prescriptions.view"
  | "prescriptions.manage"
  | "expenses.view"
  | "expenses.manage"
  | "employees.view"
  | "employees.manage"
  | "reports.view"
  | "analytics.view"
  | "settings.view"
  | "settings.manage"
  | "users.manage"
  | "audit.view"
  | "ai.use";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  storeId: string | null;
}

export interface ApiEnvelope<T> {
  data?: T;
  error?: { code: string; message: string };
}

export type PaymentStatus = "pending" | "paid" | "partial" | "overdue" | "refunded";
export type PaymentMethod = "cash" | "upi" | "card" | "credit" | "bank_transfer";
export type SaleStatus = "completed" | "held" | "void" | "returned";
export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "partial" | "cancelled";
