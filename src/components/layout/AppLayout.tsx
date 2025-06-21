
import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons/Logo";
import { UserNav } from "@/components/layout/UserNav";
import { LayoutDashboard, Boxes, Settings, HelpCircle, BarChartHorizontalBig, FileClock, Receipt, FileText } from "lucide-react"; 
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/reports", label: "Sales Reports", icon: FileText },
  { href: "/sales-analytics", label: "Sales Analytics", icon: BarChartHorizontalBig },
  { href: "/inventory-analysis", label: "Inventory Analysis", icon: FileClock },
];

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar className="no-print">
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href} passHref legacyBehavior={false}>
                  <SidebarMenuButton
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/settings" passHref legacyBehavior={false}>
                <SidebarMenuButton tooltip="Settings">
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <Link href="/help" passHref legacyBehavior={false}>
                <SidebarMenuButton tooltip="Help (Coming Soon)" aria-disabled="true" className="opacity-50 cursor-not-allowed">
                  <HelpCircle />
                  <span>Help</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6 no-print">
          <SidebarTrigger className="md:hidden" />
          <div className="flex items-center gap-4">
          </div>
          <UserNav />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
