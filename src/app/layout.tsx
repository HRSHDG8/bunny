import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "bunny - trip planning that feels like a postcard",
    template: "%s · bunny",
  },
  description:
    "Plan every day of your trip: flights, rentals, and a day-by-day itinerary - all in one beautifully simple place.",
  icons: {
    icon: "/bunny logo white.jpeg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="paper-texture flex min-h-full flex-col">
        <script
          async
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("bunny-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})();`,
          }}
        />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              fontFamily: "var(--font-sans)",
              background: "var(--color-ink-solid)",
              color: "#fff",
            },
          }}
        />
      </body>
    </html>
  );
}