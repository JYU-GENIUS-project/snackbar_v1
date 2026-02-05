const shimmerItems = Array.from({ length: 6 });

const ProductGridSkeleton = () => {
    return (
        <div className="product-grid skeleton-grid" aria-hidden="true">
            {shimmerItems.map((_, index) => (
                <div key={index} className="skeleton-card" aria-hidden="true">
                    <div className="skeleton-block skeleton-image" />
                    <div className="skeleton-stack">
                        <span className="skeleton-pill skeleton-pill-large" />
                        <span className="skeleton-pill" />
                        <span className="skeleton-line" />
                        <span className="skeleton-line short" />
                    </div>
                    <span className="skeleton-button" />
                </div>
            ))}
        </div>
    );
};

export default ProductGridSkeleton;
