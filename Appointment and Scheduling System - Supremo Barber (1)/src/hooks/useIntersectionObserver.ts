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
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [elementRef, isIntersecting];
}