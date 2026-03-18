import React, { useState, useEffect } from 'react';
import { getProductImage } from '../lib/db';

export const ProductImage = ({ productId, fallbackImage, style, className }) => {
    const [imageSrc, setImageSrc] = useState(null);

    useEffect(() => {
        let isStopped = false;
        const load = async () => {
            const stored = await getProductImage(productId);
            if (!isStopped) {
                setImageSrc(stored || fallbackImage);
            }
        };
        load();
        return () => { isStopped = true; };
    }, [productId, fallbackImage]);

    if (!imageSrc && !fallbackImage) return null;

    return (
        <img 
            src={imageSrc || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'} 
            style={{ 
                ...style, 
                opacity: imageSrc ? 1 : 0.5,
                transition: 'opacity 0.2s ease-in-out'
            }} 
            className={className}
            alt=""
            onError={(e) => {
                if (fallbackImage && e.target.src !== fallbackImage) {
                    e.target.src = fallbackImage;
                }
            }}
        />
    );
};
