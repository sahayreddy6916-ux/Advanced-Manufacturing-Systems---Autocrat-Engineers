# Custom Agent Instructions

This file documents persistent project-specific guidelines, context, and version milestones.

## Version Milestones
- **First Iteration**: This keyword represents the current version of the Autocrat ERP application which includes the side navigation menu (modeled on the reference screenshot), the list dashboard view of work orders with pagination, and the detailed multi-stage wizard (Planning Blueprint and Routing & Allocation stages).

## SAP Service Layer API Reference Memory
- **Reference Document**: [SAP_SERVICE_LAYER_REFERENCE.md](file:///c:/Users/SaTiSh%20Reddy/Desktop/WorkFlows%20for%20WebApp/ERP-work-order-planning/SAP_SERVICE_LAYER_REFERENCE.md)
- **Protocol**: SAP Business One Service Layer Version 10.0 (OData Version 4, base endpoint `/b1s/v2/`).
- **Core Entities & CRUD Mappings**:
  - Production Orders (`/b1s/v2/ProductionOrders`): Maps to `work_orders`. Key actions: Create (`POST`), Fetch (`GET`), Merge (`PATCH`), Close (`POST /b1s/v2/ProductionOrders(id)/Close`), Cancel (`POST /b1s/v2/ProductionOrders(id)/Cancel`).
  - Items (`/b1s/v2/Items`): Maps to `fg_items` and raw materials. Key: `ItemCode`.
  - Bill of Materials (`/b1s/v2/ProductTrees`): Maps to `bom_headers` & `bom_components`. Key: `TreeCode`.
  - Resources (`/b1s/v2/Resources`): Maps to `resource_allocations`. Key: `Code`.
  - Issue for Production (`/b1s/v2/InventoryGenExit`): Component issuance.
  - Receipt from Production (`/b1s/v2/InventoryGenEntry`): Finished goods receipt.

