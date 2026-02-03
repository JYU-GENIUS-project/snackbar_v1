declare module 'supertest' {
    import type { Express } from 'express';

    export type Response = {
        status: number;
        headers: Record<string, string | string[]>;
        body: unknown;
        text: string;
    };

    export type Test = Promise<Response> & {
        get(path: string): Test;
        set(field: string, value: string): Test;
    };

    export interface SuperTest {
        get(path: string): Test;
    }

    export default function request(app: Express): SuperTest;
}
