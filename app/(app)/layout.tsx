import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh bg-background">
      <div className="grid min-h-svh md:grid-cols-[280px_1fr]">
        <Sidebar />
        <div className="flex min-w-0 flex-col">
          <Topbar />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}
