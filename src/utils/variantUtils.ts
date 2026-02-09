
export interface GroupedVariant {
    color: string;
    sizes: string[];
    totalStock: number;
    image_url: string | null;
    skus: string[];
}

/**
 * Groups a list of variants by their color property.
 * Useful for displaying variants in a more compact way.
 */
export function groupVariantsByColor(variants: any[]): GroupedVariant[] {
    const groups: { [key: string]: GroupedVariant } = {};

    variants.forEach((v) => {
        const color = v.color || 'Sin Color';
        if (!groups[color]) {
            groups[color] = {
                color,
                sizes: [],
                totalStock: 0,
                image_url: v.image_url,
                skus: []
            };
        }

        if (!groups[color].sizes.includes(v.size)) {
            groups[color].sizes.push(v.size);
        }

        groups[color].totalStock += (v.stock || 0);

        if (v.sku && !groups[color].skus.includes(v.sku)) {
            groups[color].skus.push(v.sku);
        }

        // Prefer variant image if available
        if (v.image_url && !groups[color].image_url) {
            groups[color].image_url = v.image_url;
        }
    });

    // Sort sizes numerically if possible
    return Object.values(groups).map(group => ({
        ...group,
        sizes: group.sizes.sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        })
    }));
}
