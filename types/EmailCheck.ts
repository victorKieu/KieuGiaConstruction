export type EmailCheckResult = {
    exists: boolean;
    role?: 'customer' | 'supplier' | 'employee';
};