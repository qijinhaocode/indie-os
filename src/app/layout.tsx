import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import "./globals.css";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandPaletteWrapper } from "@/components/dashboard/command-palette-wrapper";

export const metadata: Metadata = {
  title: "indie-os",
  description: "专为一人公司与独立开发者打造的认知与决策控制中心",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="flex h-screen overflow-hidden bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NextIntlClientProvider messages={messages}>
            <CommandPaletteWrapper />
            {/* Desktop sidebar */}
            <Sidebar />
            {/* Mobile: column layout with header */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              <MobileHeader />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
