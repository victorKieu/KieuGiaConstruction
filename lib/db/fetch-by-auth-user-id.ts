import supabase from '@/lib/supabase/client';

// Generic function
export async function fetchByAuthUserId<T>(
  table: "employees" | "customers" | "suppliers",
  auth_users_id: string
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("auth_users_id", auth_users_id)
    .limit(1)
    .single()
  if (error) {
    // Có thể log error tại đây nếu muốn
    return null
  }
  return data as T
}

// Wrapper for each entity (optional, giúp type rõ ràng)
import type { Employee, Customer, Supplier } from "@/types/entities"

export const fetchEmployeeByAuthUserId = (auth_users_id: string) =>
  fetchByAuthUserId<Employee>("employees", auth_users_id)

export const fetchCustomerByAuthUserId = (auth_users_id: string) =>
  fetchByAuthUserId<Customer>("customers", auth_users_id)

export const fetchSupplierByAuthUserId = (auth_users_id: string) =>
  fetchByAuthUserId<Supplier>("suppliers", auth_users_id)