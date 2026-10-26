import { useEffect, useState, useRef, RefObject } from 'react';

/**
 * Custom hook for Intersection Observer API with ref callback pattern
 * Returns a tuple of [ref, isVisible]
 * @param options - Intersection Observer options
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [RefObject<Element>, boolean] {
  const elementRef = useRef<Element>(null);
  const optionsRef = useRef(options);
  const [isIntersecting, setIsIntersecting] = useState(false);

  optionsRef.current = options;

  const thresholdKey = JSON.stringify(options.threshold);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...optionsRef.current,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options.root, options.rootMargin, thresholdKey]);

  return [elementRef, isIntersecting];
}
