// lib/paths.ts
export const PATHS = {
    CUSTOMERS: '/customers',
    API_CUSTOMERS: '/api/customers',
};

// Sử dụng
import { PATHS } from '@/lib/paths';
router.push(PATHS.CUSTOMERS);