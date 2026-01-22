import { ENTITY_PERMS } from "./permissions-map";

export const ADMIN_LINK_PERM: Record<string, string> = {
  "/dashboard/invoices":     ENTITY_PERMS.invoices.list,
  "/dashboard/quotations":   ENTITY_PERMS.quotations.list,
  "/dashboard/clients":      ENTITY_PERMS.clients.list,
  "/dashboard/customers":    ENTITY_PERMS.clients.list,
  "/dashboard/products":     ENTITY_PERMS.products.list,
  "/dashboard/brands":       ENTITY_PERMS.brands.list,
  "/dashboard/categories":   ENTITY_PERMS.categories.list,
  "/dashboard/warehouses":   ENTITY_PERMS.warehouses.list,
  "/dashboard/jobFiles":     ENTITY_PERMS.jobFiles.list,
  "/dashboard/tax":          ENTITY_PERMS.taxes.list,
  "/dashboard/suppliers":    ENTITY_PERMS.suppliers.list,
  "/dashboard/modules":      ENTITY_PERMS.modules.list,
  "/dashboard/permissions":  ENTITY_PERMS.permissions.list,
  "/dashboard/roles":        ENTITY_PERMS.roles.list,
  "/dashboard/users":        ENTITY_PERMS.users.list,
  "/dashboard/promo-codes":  ENTITY_PERMS.promoCodes.list,
  "/dashboard/orders":      ENTITY_PERMS.orders.list,
  "/dashboard/bulk-orders": ENTITY_PERMS.bulkOrders.list,
  "/dashboard/reviews":     ENTITY_PERMS.reviews.list,
  "/dashboard/blogs":       ENTITY_PERMS.blogs.list,
};
