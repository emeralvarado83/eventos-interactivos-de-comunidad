import { Sidebar } from "./components/sidebar";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-full flex-1 bg-[#0a0614] font-sans text-zinc-100">
      <Sidebar />
      {children}
    </div>
  );
}
