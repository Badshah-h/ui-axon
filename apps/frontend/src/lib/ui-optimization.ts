import React from 'react';
import { monitoring } from './monitoring';

// Performance optimization interfaces
export interface PerformanceConfig {
  enableVirtualization: boolean;
  chunkSize: number;
  debounceDelay: number;
  throttleDelay: number;
  cacheSize: number;
  preloadThreshold: number;
}

export interface AccessibilityConfig {
  enableScreenReader: boolean;
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  focusIndicatorStyle: 'default' | 'high-contrast' | 'custom';
}

export interface UIMetrics {
  renderTime: number;
  interactionTime: number;
  layoutShifts: number;
  memoryUsage: number;
  bundleSize: number;
}

class UIOptimizer {
  private static instance: UIOptimizer;
  private performanceConfig: PerformanceConfig;
  private accessibilityConfig: AccessibilityConfig;
  private componentCache: Map<string, React.ComponentType> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private intersectionObserver: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  private constructor() {
    this.performanceConfig = {
      enableVirtualization: true,
      chunkSize: 50,
      debounceDelay: 300,
      throttleDelay: 100,
      cacheSize: 100,
      preloadThreshold: 0.1,
    };

    this.accessibilityConfig = {
      enableScreenReader: false,
      enableHighContrast: false,
      enableReducedMotion: false,
      fontSize: 'medium',
      focusIndicatorStyle: 'default',
    };

    this.initializeOptimizations();
    this.setupPerformanceMonitoring();
    this.setupAccessibilityFeatures();
  }

  static getInstance(): UIOptimizer {
    if (!UIOptimizer.instance) {
      UIOptimizer.instance = new UIOptimizer();
    }
    return UIOptimizer.instance;
  }

  private initializeOptimizations(): void {
    if (typeof window !== 'undefined') {
      // Initialize Intersection Observer for lazy loading
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.handleIntersection(entry.target as HTMLElement);
            }
          });
        },
        {
          rootMargin: '50px',
          threshold: this.performanceConfig.preloadThreshold,
        }
      );

      // Initialize Resize Observer for responsive components
      this.resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          this.handleResize(entry.target as HTMLElement, entry.contentRect);
        });
      });

      // Preload critical resources
      this.preloadCriticalResources();

      // Setup service worker for caching
      this.setupServiceWorker();
    }
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Monitor Core Web Vitals
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.handlePerformanceEntry(entry);
        });
      });

      // Observe different performance metrics
      try {
        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint', 'layout-shift'] });
      } catch (error) {
        monitoring.error('Failed to setup performance observer', error as Error);
      }

      // Monitor memory usage
      this.monitorMemoryUsage();

      // Monitor bundle size
      this.monitorBundleSize();
    }
  }

  private setupAccessibilityFeatures(): void {
    if (typeof window !== 'undefined') {
      // Detect user preferences
      this.detectUserPreferences();

      // Setup keyboard navigation
      this.setupKeyboardNavigation();

      // Setup focus management
      this.setupFocusManagement();

      // Setup screen reader support
      this.setupScreenReaderSupport();
    }
  }

  private handleIntersection(element: HTMLElement): void {
    // Lazy load images
    if (element.tagName === 'IMG' && element.dataset.src) {
      this.lazyLoadImage(element as HTMLImageElement);
    }

    // Lazy load components
    if (element.dataset.component) {
      this.lazyLoadComponent(element);
    }
  }

  private handleResize(element: HTMLElement, rect: DOMRectReadOnly): void {
    // Update responsive components
    const event = new CustomEvent('resize-observed', {
      detail: { element, rect },
    });
    element.dispatchEvent(event);
  }

  private handlePerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'measure':
        monitoring.recordMetric({
          name: 'ui_performance_measure',
          value: entry.duration,
          unit: 'ms',
          timestamp: new Date(),
          tags: {
            measure_name: entry.name,
          },
        });
        break;

      case 'paint':
        monitoring.recordMetric({
          name: 'ui_paint_timing',
          value: entry.startTime,
          unit: 'ms',
          timestamp: new Date(),
          tags: {
            paint_type: entry.name,
          },
        });
        break;

      case 'layout-shift':
        const layoutShiftEntry = entry as any; // LayoutShift interface
        if (layoutShiftEntry.value) {
          monitoring.recordMetric({
            name: 'ui_layout_shift',
            value: layoutShiftEntry.value,
            unit: 'count',
            timestamp: new Date(),
          });
        }
        break;
    }
  }

  private preloadCriticalResources(): void {
    // Preload critical CSS
    const criticalCSS = [
      '/styles/critical.css',
      '/styles/components.css',
    ];

    criticalCSS.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      document.head.appendChild(link);
    });

    // Preload critical JavaScript
    const criticalJS = [
      '/js/critical.js',
      '/js/components.js',
    ];

    criticalJS.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = href;
      document.head.appendChild(link);
    });
  }

  private setupServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          monitoring.info('Service Worker registered', {
            scope: registration.scope,
          });
        })
        .catch((error) => {
          monitoring.error('Service Worker registration failed', error);
        });
    }
  }

  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        monitoring.recordMetric({
          name: 'ui_memory_usage',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          timestamp: new Date(),
          tags: {
            heap_limit: memory.jsHeapSizeLimit.toString(),
            heap_total: memory.totalJSHeapSize.toString(),
          },
        });
      }, 30000); // Every 30 seconds
    }
  }

  private monitorBundleSize(): void {
    // Monitor bundle size through performance entries
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      monitoring.recordMetric({
        name: 'ui_bundle_size',
        value: navigationEntry.transferSize || 0,
        unit: 'bytes',
        timestamp: new Date(),
      });
    }
  }

  private detectUserPreferences(): void {
    // Detect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.accessibilityConfig.enableReducedMotion = true;
      document.documentElement.classList.add('reduce-motion');
    }

    // Detect high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.accessibilityConfig.enableHighContrast = true;
      document.documentElement.classList.add('high-contrast');
    }

    // Detect color scheme preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }

  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (event) => {
      // Handle keyboard navigation
      switch (event.key) {
        case 'Tab':
          this.handleTabNavigation(event);
          break;
        case 'Escape':
          this.handleEscapeKey(event);
          break;
        case 'Enter':
        case ' ':
          this.handleActivation(event);
          break;
      }
    });
  }

  private setupFocusManagement(): void {
    // Track focus for accessibility
    let lastFocusedElement: Element | null = null;

    document.addEventListener('focusin', (event) => {
      lastFocusedElement = event.target as Element;
      this.updateFocusIndicator(event.target as HTMLElement);
    });

    document.addEventListener('focusout', () => {
      this.clearFocusIndicator();
    });

    // Store last focused element for restoration
    (window as any).__lastFocusedElement = lastFocusedElement;
  }

  private setupScreenReaderSupport(): void {
    // Add ARIA live regions for dynamic content
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);

    // Add screen reader announcements
    (window as any).announceToScreenReader = (message: string) => {
      const liveRegion = document.getElementById('live-region');
      if (liveRegion) {
        liveRegion.textContent = message;
        setTimeout(() => {
          liveRegion.textContent = '';
        }, 1000);
      }
    };
  }

  private handleTabNavigation(event: KeyboardEvent): void {
    // Implement focus trapping for modals
    const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (activeModal) {
      this.trapFocus(activeModal as HTMLElement, event);
    }
  }

  private handleEscapeKey(event: KeyboardEvent): void {
    // Close modals, dropdowns, etc.
    const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (activeModal) {
      const closeButton = activeModal.querySelector('[data-close]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    }
  }

  private handleActivation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.getAttribute('role') === 'button' && !target.disabled) {
      target.click();
    }
  }

  private trapFocus(container: HTMLElement, event: KeyboardEvent): void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }

  private updateFocusIndicator(element: HTMLElement): void {
    // Apply focus indicator based on configuration
    element.classList.add(`focus-${this.accessibilityConfig.focusIndicatorStyle}`);
  }

  private clearFocusIndicator(): void {
    document.querySelectorAll('[class*="focus-"]').forEach((element) => {
      element.classList.remove('focus-default', 'focus-high-contrast', 'focus-custom');
    });
  }

  private lazyLoadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (src && !this.imageCache.has(src)) {
      const image = new Image();
      image.onload = () => {
        img.src = src;
        img.classList.add('loaded');
        this.imageCache.set(src, image);
      };
      image.onerror = () => {
        img.classList.add('error');
      };
      image.src = src;
    }
  }

  private lazyLoadComponent(element: HTMLElement): void {
    const componentName = element.dataset.component;
    if (componentName && !this.componentCache.has(componentName)) {
      // Dynamic import of component
      import(`../components/${componentName}`)
        .then((module) => {
          const Component = module.default;
          this.componentCache.set(componentName, Component);
          
          // Trigger re-render
          const event = new CustomEvent('component-loaded', {
            detail: { componentName, Component },
          });
          element.dispatchEvent(event);
        })
        .catch((error) => {
          monitoring.error(`Failed to load component: ${componentName}`, error);
        });
    }
  }

  // Public methods
  observeElement(element: HTMLElement): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }
    if (this.resizeObserver) {
      this.resizeObserver.observe(element);
    }
  }

  unobserveElement(element: HTMLElement): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(element);
    }
  }

  measurePerformance(name: string, fn: () => void): void {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    const measureName = `${name}-measure`;

    performance.mark(startMark);
    fn();
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);
  }

  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number = this.performanceConfig.debounceDelay
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number = this.performanceConfig.throttleDelay
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(this, args);
      }
    };
  }

  memoize<T extends (...args: any[]) => any>(func: T): T {
    const cache = new Map();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func.apply(this, args);
      cache.set(key, result);
      
      // Limit cache size
      if (cache.size > this.performanceConfig.cacheSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      return result;
    }) as T;
  }

  updatePerformanceConfig(config: Partial<PerformanceConfig>): void {
    this.performanceConfig = { ...this.performanceConfig, ...config };
    monitoring.info('Performance configuration updated', config);
  }

  updateAccessibilityConfig(config: Partial<AccessibilityConfig>): void {
    this.accessibilityConfig = { ...this.accessibilityConfig, ...config };
    
    // Apply changes immediately
    this.applyAccessibilityConfig();
    
    monitoring.info('Accessibility configuration updated', config);
  }

  private applyAccessibilityConfig(): void {
    const { fontSize, enableHighContrast, enableReducedMotion } = this.accessibilityConfig;
    
    // Apply font size
    document.documentElement.style.fontSize = {
      'small': '14px',
      'medium': '16px',
      'large': '18px',
      'extra-large': '20px',
    }[fontSize];

    // Apply high contrast
    document.documentElement.classList.toggle('high-contrast', enableHighContrast);

    // Apply reduced motion
    document.documentElement.classList.toggle('reduce-motion', enableReducedMotion);
  }

  getUIMetrics(): UIMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    return {
      renderTime: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      interactionTime: navigation?.domInteractive - navigation?.navigationStart || 0,
      layoutShifts: 0, // This would be calculated from layout shift entries
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      bundleSize: navigation?.transferSize || 0,
    };
  }

  getPerformanceConfig(): PerformanceConfig {
    return { ...this.performanceConfig };
  }

  getAccessibilityConfig(): AccessibilityConfig {
    return { ...this.accessibilityConfig };
  }
}

// Export singleton instance
export const uiOptimizer = UIOptimizer.getInstance();

// React hooks
export const usePerformanceOptimization = () => {
  return {
    measurePerformance: uiOptimizer.measurePerformance.bind(uiOptimizer),
    debounce: uiOptimizer.debounce.bind(uiOptimizer),
    throttle: uiOptimizer.throttle.bind(uiOptimizer),
    memoize: uiOptimizer.memoize.bind(uiOptimizer),
    observeElement: uiOptimizer.observeElement.bind(uiOptimizer),
    unobserveElement: uiOptimizer.unobserveElement.bind(uiOptimizer),
  };
};

export const useAccessibility = () => {
  const [config, setConfig] = React.useState(uiOptimizer.getAccessibilityConfig());

  const updateConfig = React.useCallback((newConfig: Partial<AccessibilityConfig>) => {
    uiOptimizer.updateAccessibilityConfig(newConfig);
    setConfig(uiOptimizer.getAccessibilityConfig());
  }, []);

  return {
    config,
    updateConfig,
  };
};

// Higher-order component for performance optimization
export const withPerformanceOptimization = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.memo((props: P) => {
    const elementRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (elementRef.current) {
        uiOptimizer.observeElement(elementRef.current);
        return () => {
          if (elementRef.current) {
            uiOptimizer.unobserveElement(elementRef.current);
          }
        };
      }
    }, []);

    return (
      <div ref={elementRef}>
        <Component {...props} />
      </div>
    );
  });
};

// Lazy loading component
export const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}> = ({ src, alt, className, placeholder }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (imgRef.current) {
      imgRef.current.dataset.src = src;
      uiOptimizer.observeElement(imgRef.current);
    }
  }, [src]);

  return (
    <img
      ref={imgRef}
      alt={alt}
      className={`${className} ${loaded ? 'loaded' : ''} ${error ? 'error' : ''}`}
      src={placeholder || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNGNUY1RjUiLz48L3N2Zz4='}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
    />
  );
};