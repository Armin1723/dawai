"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Package,
  Truck,
  Users,
  Receipt,
  BarChart3,
  Settings,
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCommandMenu } from "@/stores/command-menu-store";

interface CommandAction {
  label: string;
  hint?: string;
  icon: LucideIcon;
  onSelect: () => void;
  group: string;
}

export function CommandMenu() {
  const router = useRouter();
  const { open, setOpen } = useCommandMenu();
  const { setTheme } = useTheme();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!useCommandMenu.getState().open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  const go = (href: string) => {
    setOpen(false);
    setSearch("");
    router.push(href);
  };

  const actions: CommandAction[] = [
    { label: "Dashboard", icon: LayoutDashboard, onSelect: () => go("/"), group: "Navigate" },
    { label: "New sale (POS)", icon: ShoppingCart, onSelect: () => go("/pos"), group: "Navigate" },
    { label: "Inventory", icon: Pill, onSelect: () => go("/inventory"), group: "Navigate" },
    { label: "Purchases", icon: Package, onSelect: () => go("/purchases"), group: "Navigate" },
    { label: "Suppliers", icon: Truck, onSelect: () => go("/suppliers"), group: "Navigate" },
    { label: "Customers", icon: Users, onSelect: () => go("/customers"), group: "Navigate" },
    { label: "Sales", icon: Receipt, onSelect: () => go("/sales"), group: "Navigate" },
    { label: "Reports", icon: BarChart3, onSelect: () => go("/reports"), group: "Navigate" },
    { label: "Settings", icon: Settings, onSelect: () => go("/settings"), group: "Navigate" },
    { label: "Light theme", icon: Sun, onSelect: () => { setTheme("light"); setOpen(false); }, group: "Actions" },
    { label: "Dark theme", icon: Moon, onSelect: () => { setTheme("dark"); setOpen(false); }, group: "Actions" },
    { label: "System theme", icon: Monitor, onSelect: () => { setTheme("system"); setOpen(false); }, group: "Actions" },
  ];

  const groups = [...new Set(actions.map((a) => a.group))];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group) => (
          <div key={group}>
            <CommandGroup heading={group}>
              {actions
                .filter((a) => a.group === group)
                .map((action) => {
                  const Icon = action.icon;
                  return (
                    <CommandItem
                      key={action.label}
                      value={action.label}
                      onSelect={action.onSelect}
                    >
                      <Icon className="size-4" />
                      <span>{action.label}</span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
            <CommandSeparator />
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
