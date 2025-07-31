// lib/utils/uuid.ts

/**
 * Kiểm tra định dạng UUID.
 * @param uuid Chuỗi cần kiểm tra.
 * @returns true nếu là UUID hợp lệ, ngược lại false.
 */
export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}