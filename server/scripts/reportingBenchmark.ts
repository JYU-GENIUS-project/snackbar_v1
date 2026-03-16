import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

type BenchmarkResult = {
  label: string;
  durationMs: number;
  ok: boolean;
  status: number;
};

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const assertToken = () => {
  if (!ADMIN_TOKEN) {
    throw new Error('ADMIN_TOKEN is required to run benchmarks');
  }
};

const runRequest = async (label: string, url: string): Promise<BenchmarkResult> => {
  const start = Date.now();
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`
    }
  });
  const durationMs = Date.now() - start;
  return {
    label,
    durationMs,
    ok: response.ok,
    status: response.status
  };
};

const main = async () => {
  assertToken();
  const base = API_BASE_URL.replace(/\/$/, '');
  const ranges = [
    { label: 'last-7-days', start: '2024-01-01', end: '2024-01-07' },
    { label: 'last-30-days', start: '2024-01-01', end: '2024-01-31' }
  ];

  const results: BenchmarkResult[] = [];

  for (const range of ranges) {
    const params = new URLSearchParams({
      startDate: range.start,
      endDate: range.end
    });
    results.push(await runRequest(`summary-${range.label}`, `${base}/analytics/summary?${params}`));
    results.push(await runRequest(`top-products-${range.label}`, `${base}/analytics/top-products?${params}`));
    results.push(
      await runRequest(
        `revenue-daily-${range.label}`,
        `${base}/analytics/revenue?${params}&period=daily`
      )
    );
  }

  results.push(
    await runRequest('transactions-page-1', `${base}/transactions?page=1&pageSize=50`)
  );

  console.table(results);
  const slow = results.filter((result) => result.durationMs > 2000);
  if (slow.length > 0) {
    console.error('Some benchmarks exceeded 2 seconds:', slow);
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error('Benchmark failed', error);
  process.exitCode = 1;
});
