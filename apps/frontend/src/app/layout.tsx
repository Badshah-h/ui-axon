import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/lib/error-monitoring";
import { AuthProvider } from "@/components/auth-provider";
import { AxonPulsProvider } from "@/components/axon-puls-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AxonStreamAI - Universal AI Orchestration System",
  description: "Production-grade AI orchestration platform for configuring, connecting, and deploying AI agents and tools through an intuitive workflow builder interface.",
  keywords: ["AI", "workflow", "automation", "orchestration", "agents", "tools"],
  authors: [{ name: "AxonStreamAI Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  openGraph: {
    title: "AxonStreamAI - Universal AI Orchestration System",
    description: "Production-grade AI orchestration platform for building complex AI workflows",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AxonStreamAI - Universal AI Orchestration System",
    description: "Production-grade AI orchestration platform for building complex AI workflows",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8b5cf6" />
        
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {/* Error handling script - must be loaded first */}
        <Script 
          src="https://api.tempo.build/proxy-asset?url=https://storage.googleapis.com/tempo-public-assets/error-handling.js"
          strategy="beforeInteractive"
        />
        
        {/* Performance monitoring */}
        <Script id="performance-monitoring" strategy="afterInteractive">
          {`
            // Monitor Core Web Vitals
            function sendToAnalytics(metric) {
              if (typeof gtag !== 'undefined') {
                gtag('event', metric.name, {
                  event_category: 'Web Vitals',
                  value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
                  event_label: metric.id,
                  non_interaction: true,
                });
              }
            }
            
            // Load web-vitals library
            import('https://unpkg.com/web-vitals@3/dist/web-vitals.js').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
              getCLS(sendToAnalytics);
              getFID(sendToAnalytics);
              getFCP(sendToAnalytics);
              getLCP(sendToAnalytics);
              getTTFB(sendToAnalytics);
            });
            
            // Monitor long tasks
            if ('PerformanceObserver' in window) {
              const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  if (entry.duration > 50) {
                    console.warn('Long task detected:', entry.duration + 'ms');
                  }
                }
              });
              observer.observe({ entryTypes: ['longtask'] });
            }
          `}
        </Script>
        
        {/* Service Worker registration */}
        <Script id="service-worker" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }
          `}
        </Script>

        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <AxonPulsProvider>
                <div className="min-h-screen bg-background font-sans antialiased">
                  <div className="relative flex min-h-screen flex-col">
                    <main className="flex-1">
                      {children}
                    </main>
                  </div>
                </div>
                <Toaster />
              </AxonPulsProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
        
        {/* Analytics - only in production */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                  page_title: document.title,
                  page_location: window.location.href,
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}