// Re-export the public tenancy API
export {
  getTenantByDomain,
  cacheTenant,
  invalidateTenantCache,
  type TenantInfo,
} from "./service"
