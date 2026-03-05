function LoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FBF7EF]">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#DB9D47] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-[#5C4A3A]">Loading...</p>
            </div>
        </div>
    );
}

export { LoadingFallback };
export default LoadingFallback;
