function LoadingFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-brand-cream px-6" role="status" aria-live="polite" aria-label="Loading Supremo Barber">
            <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-line bg-white text-2xl shadow-[0_12px_30px_rgb(33_29_25/8%)]" aria-hidden="true">
                    ✂
                </div>
                <div className="mx-auto mt-5 h-1.5 w-28 overflow-hidden rounded-full bg-brand-sand" aria-hidden="true">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-gold" />
                </div>
                <p className="mt-4 font-medium text-brand-ink">Preparing your Supremo Barber experience…</p>
            </div>
        </div>
    );
}

export { LoadingFallback };
export default LoadingFallback;
