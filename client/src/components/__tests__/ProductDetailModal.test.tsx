import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductDetailModal from '../ProductDetailModal';

type Product = {
    id: string;
    name: string;
    price: number;
    description?: string;
    categories?: Array<{ name: string }>;
    allergens?: string;
    isOutOfStock?: boolean;
    isLowStock?: boolean;
};

describe('ProductDetailModal', () => {
    const baseProduct: Product = {
        id: 'sku-1',
        name: 'Chocolate Muffin',
        price: 3.5,
        description: 'Rich chocolate treat',
        categories: [{ name: 'Bakery' }],
        allergens: '',
        isOutOfStock: false,
        isLowStock: false
    };

    const noop = () => { };

    it('renders allergen list when allergen data provided', () => {
        render(
            <ProductDetailModal
                product={{
                    ...baseProduct,
                    allergens: 'Milk, Nuts',
                    description: 'Contains dairy and nuts'
                }}
                onDismiss={noop}
                onAddToCart={vi.fn()}
                connectionState="connected"
            />
        );

        expect(screen.getByRole('dialog', { name: /chocolate muffin/i })).toBeTruthy();
        expect(screen.getByRole('heading', { name: /allergens/i })).toBeTruthy();
        expect(screen.getByText('Milk')).toBeTruthy();
        expect(screen.getByText('Nuts')).toBeTruthy();
    });

    it('shows fallback message when allergen data missing', () => {
        render(
            <ProductDetailModal
                product={{
                    ...baseProduct,
                    allergens: ''
                }}
                onDismiss={noop}
                onAddToCart={vi.fn()}
                connectionState="polling"
            />
        );

        expect(screen.getByText('No allergen information available')).toBeTruthy();
    });
});
