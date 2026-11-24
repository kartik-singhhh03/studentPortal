import {
  History,
  LayoutDashboard,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/import", label: "Import CSV", icon: Upload },
  { href: "/imports", label: "Import history", icon: History },
];
