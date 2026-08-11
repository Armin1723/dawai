import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { ModulePlaceholder } from "@/features/placeholder/module-placeholder";

export const metadata: Metadata = { title: "Employees" };

export default function EmployeesPage() {
  return (
    <ModulePlaceholder
      title="Employees"
      description="Attendance, roles, permissions and sales performance."
      icon={Briefcase}
      phase="7"
      capabilities={["Attendance", "Roles & permissions", "Sales tracking", "Activity logs"]}
    />
  );
}
