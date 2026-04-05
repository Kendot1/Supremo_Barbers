import React, { useState, useEffect } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
    fallbackSrc?: string;
    eager?: boolean;
}

/**
 * Optimized Image Component
 * Features:
 * - Lazy loading with Intersection Observer
 * - Fallback image on error
 * - Blur-up placeholder effect
 * - Native lazy loading as fallback
 */
export function OptimizedImage({
    src,
    alt,
    className = '',
    fallbackSrc = '',
    eager = false,
    ...props
}: OptimizedImageProps) {
    const [imageSrc, setImageSrc] = useState<string | undefined>(eager ? src : undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [imgRef, isIntersecting] = useIntersectionObserver();

    useEffect(() => {
        if (!eager && isIntersecting && !imageSrc) {
            setImageSrc(src);
        }
    }, [isIntersecting, src, eager, imageSrc]);

    const handleLoad = () => {
        setIsLoading(false);
    };

    const handleError = () => {
        setHasError(true);
        setIsLoading(false);
        if (fallbackSrc) {
            setImageSrc(fallbackSrc);
        }
    };

    return (
        <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
            {imageSrc && (
                <img
                    src={imageSrc}
                    alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'
                        }`}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading={eager ? 'eager' : 'lazy'}
                    {...props}
                />
            )}

            {isLoading && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}

            {hasError && !fallbackSrc && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                    <span className="text-sm">Image unavailable</span>
                </div>
            )}
        </div>
    );
}