"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { LogOut, Menu, Moon, Search, Settings, Sun, Monitor, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useCommandMenu } from "@/stores/command-menu-store";
import { signOut } from "@/services/auth.service";
import { getRoleLabel } from "@/services/auth.service";
import { initials } from "@/lib/utils";
import type { UserRole } from "@/types";
import { SidebarLogo, SidebarNav, SidebarFooter } from "@/components/layout/app-sidebar";
import { NotificationsBell } from "@/components/layout/notifications-bell";

interface AppHeaderProps {
  userEmail: string;
  userName: string | null;
  userRole?: UserRole | null;
}

export function AppHeader({ userEmail, userName, userRole }: AppHeaderProps) {
  const router = useRouter();
  const { setOpen } = useCommandMenu();
  const { theme, setTheme } = useTheme();

  async function handleSignOut() {
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out");
    }
  }

  const themeIcon =
    theme === "dark" ? <Moon className="size-4" /> : theme === "light" ? <Sun className="size-4" /> : <Monitor className="size-4" />;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 lg:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-14 items-center border-b px-4">
            <SidebarLogo />
          </div>
          <SidebarNav />
          <SidebarFooter />
        </SheetContent>
      </Sheet>

      <div className="hidden lg:block">
        <SidebarLogo />
      </div>

      <div className="flex-1" />

      {/* Command palette trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-full border bg-muted/50 px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
        aria-label="Open command menu"
      >
        <Search className="size-3.5" />
        <span className="text-xs">Search or jump to…</span>
        <kbd className="ml-1 flex items-center gap-0.5 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-medium">
          <Command className="size-2.5" /> K
        </kbd>
      </button>

      {/* Theme toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Toggle theme">
            {themeIcon}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setTheme("light")}>
            <Sun className="size-4" /> Light
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTheme("dark")}>
            <Moon className="size-4" /> Dark
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTheme("system")}>
            <Monitor className="size-4" /> System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notifications */}
      <NotificationsBell />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-1.5">
            <Avatar className="size-7 ring-1 ring-border">
              <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                {initials(userName ?? userEmail)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium md:block">
              {userName ?? userEmail.split("@")[0]}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{userName ?? "User"}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{userEmail}</span>
              {userRole && (
                <Badge variant="outline" className="mt-1 w-fit text-[10px]">
                  {getRoleLabel(userRole)}
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/settings")}>
            <Settings className="size-4" /> Settings
            <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
