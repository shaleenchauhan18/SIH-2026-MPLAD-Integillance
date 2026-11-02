import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";

export const metadata: Metadata = {
  title: "MPLAD Intelligence & Audit System",
  description:
    "AI-powered risk screening and investigation platform for the MPLAD scheme (SIH26102 prototype).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-border bg-ink/80 backdrop-blur sticky top-0 z-40">
            <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-accent to-blue-700 flex items-center justify-center text-sm font-bold">M</div>
                <div>
                  <div className="text-sm font-semibold tracking-wide">MPLAD INTELLIGENCE</div>
                  <div className="text-[10px] text-muted -mt-0.5">Risk screening & investigation prototype · SIH26102</div>
                </div>
              </Link>
              <nav className="flex items-center gap-1 ml-4">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/funds">Fund Utilisation</NavLink>
                <NavLink href="/projects">Works Audit</NavLink>
                <NavLink href="/map">Map</NavLink>
                <NavLink href="/agencies">Agencies</NavLink>
                <NavLink href="/qna">Ask AI</NavLink>
              </nav>
              <div className="ml-auto text-xs text-muted">
                Demo dataset · synthetic · not real government records
              </div>
            </div>
          </header>
          <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-6">{children}</main>
          <footer className="border-t border-border py-4 text-center text-xs text-muted">
            © 2026 MPLAD Intelligence Prototype · Findings are risk indicators requiring human verification
          </footer>
        </div>
      </body>
    </html>
  );
}
