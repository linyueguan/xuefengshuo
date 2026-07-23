import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const socialImage = `${origin}/og.png`;

  return {
    title: "张老师说的道理｜先看出口，再谈理想",
    description:
      "把你的志愿、考研、就业和生活问题说具体，让老师先拆幻想，再给普通人能执行的现实路线。",
    metadataBase: new URL(origin),
    openGraph: {
      title: "张老师说的道理",
      description: "先看出口，再谈理想，把问题说清楚，现实替你摊开",
      type: "website",
      url: origin,
      locale: "zh_CN",
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: "张老师说的道理",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "张老师说的道理",
      description: "先看出口，再谈理想",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
