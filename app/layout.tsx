import type { Metadata, Viewport } from "next";
import { Barlow_Condensed } from "next/font/google";
import { StoreProvider } from "@/components/store";
import "./globals.css";

const condensed = Barlow_Condensed({
  variable: "--font-condensed",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Home Workout",
  description: "A 30-day home program built from the equipment you own.",
  appleWebApp: { capable: true, title: "Workout", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1113" },
  ],
};

// Applies the last-used appearance and accent before first paint, so the page doesn't flash the default theme.
const themeScript = `try{var t=JSON.parse(localStorage.getItem("hw-theme")||"{}");var d=document.documentElement;if(t.appearance)d.dataset.theme=t.appearance;if(t.accent)d.dataset.accent=t.accent}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${condensed.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <StoreProvider>
          <div className="mx-auto min-h-dvh w-full max-w-[520px]">{children}</div>
        </StoreProvider>
      </body>
    </html>
  );
}
