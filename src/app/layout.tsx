import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import "./globals.css";
import { Sidebar } from "@/components/dashboard/sidebar";

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
    <html lang={locale}>
      <body className="flex h-screen overflow-hidden bg-background">
        <NextIntlClientProvider messages={messages}>
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
