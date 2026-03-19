import { performance } from 'node:perf_hooks';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const iterations = Number(process.env.ITERATIONS || 50);
const concurrency = Number(process.env.CONCURRENCY || 5);

const jsonHeaders = { 'Content-Type': 'application/json' };

const percentile = (values, p) => {
    if (values.length === 0) {
        return 0;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
    return Number(sorted[index].toFixed(2));
};

const summarize = (label, values) => {
    const total = values.reduce((sum, value) => sum + value, 0);
    const avg = values.length ? total / values.length : 0;
    return {
        label,
        samples: values.length,
        avg: Number(avg.toFixed(2)),
        min: values.length ? Number(Math.min(...values).toFixed(2)) : 0,
        max: values.length ? Number(Math.max(...values).toFixed(2)) : 0,
        p50: percentile(values, 0.5),
        p95: percentile(values, 0.95)
    };
};

const measure = async (fn) => {
    const start = performance.now();
    await fn();
    return performance.now() - start;
};

const fetchJson = async (url, options) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
};

const runPool = async (tasks, limit) => {
    const results = [];
    let index = 0;
    const worker = async () => {
        while (index < tasks.length) {
            const current = index;
            index += 1;
            results[current] = await tasks[current]();
        }
    };
    const workers = Array.from({ length: limit }, () => worker());
    await Promise.all(workers);
    return results;
};

const main = async () => {
    const feed = await fetchJson(`${baseUrl}/api/feed/products`);
    const productId = feed?.data?.products?.[0]?.id;
    if (!productId) {
        throw new Error('No product id available from /api/products');
    }

    const filterLatencies = [];
    const cartLatencies = [];
    const tasks = Array.from({ length: iterations }, (_, i) => async () => {
        const sessionKey = `loadtest-${Date.now()}-${i}`;
        const filterDuration = await measure(() => fetchJson(`${baseUrl}/api/feed/products`));
        filterLatencies.push(filterDuration);

        const cartDuration = await measure(() =>
            fetchJson(`${baseUrl}/api/cart/items`, {
                method: 'POST',
                headers: jsonHeaders,
                body: JSON.stringify({
                    sessionKey,
                    productId,
                    quantity: 1
                })
            })
        );
        cartLatencies.push(cartDuration);
    });

    await runPool(tasks, concurrency);

    const filterSummary = summarize('ui-filter-fetch', filterLatencies);
    const cartSummary = summarize('cart-update', cartLatencies);

    console.log(JSON.stringify({
        baseUrl,
        iterations,
        concurrency,
        summaries: [filterSummary, cartSummary]
    }, null, 2));
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});