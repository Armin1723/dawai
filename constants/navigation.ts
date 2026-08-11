import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Package,
  Truck,
  Users,
  FileText,
  Receipt,
  Wallet,
  Briefcase,
  BarChart3,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: "pos" | "new";
  roles?: string[]; // empty/undefined = all authenticated users
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "POS", href: "/pos", icon: ShoppingCart, badge: "pos" },
      { title: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    title: "Management",
    items: [
      { title: "Inventory", href: "/inventory", icon: Pill },
      { title: "Purchases", href: "/purchases", icon: Package },
      { title: "Suppliers", href: "/suppliers", icon: Truck },
      { title: "Customers", href: "/customers", icon: Users },
      { title: "Prescriptions", href: "/prescriptions", icon: FileText },
      { title: "Sales", href: "/sales", icon: Receipt },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Expenses", href: "/expenses", icon: Wallet },
      { title: "Employees", href: "/employees", icon: Briefcase },
      { title: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    items: [{ title: "Settings", href: "/settings", icon: Settings }],
  },
];
