import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { initRDBMS, pingRDBMS } from './config/db.js';
import { getSystemErrorName } from 'util';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

// Job-card Released status means an allocation exists. If that allocation row has
// been removed, restore the routing card to Open when its status is next read.
const ROUTING_STATUS_TABLES = Object.freeze({
  work: { table: 'update_salerouting', orderColumn: 'work_order_no' },
  stock: { table: 'update_stockrouting', orderColumn: 'stock_order_no' },
});

async function reopenStaleReleasedCards(kind, orderNo) {
  const routing = ROUTING_STATUS_TABLES[kind];
  const normalizedOrderNo = String(orderNo || '').trim();
  if (!routing || !normalizedOrderNo) return 0;

  const result = await pool.query(`
    UPDATE public.${routing.table} AS route
       SET job_card_status = 'Open', updated_at = NOW()
     WHERE route.${routing.orderColumn} = $1
       AND LOWER(COALESCE(route.job_card_status, '')) = 'released'
       AND NOT EXISTS (
         SELECT 1
           FROM public.stock_allocated_table AS allocation
          WHERE allocation.workorder_number = $1
            AND allocation.jobcard_number = route.job_card_no
       )
  `, [normalizedOrderNo]);
  return result.rowCount;
}

// Initialise PostgreSQL schema on startup
(async () => {
  try {
    await initRDBMS();

    // Keep existing databases compatible with the current work-order routes.
    // This also restores the table if it was previously dropped.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.work_orders (
        work_order_no   TEXT PRIMARY KEY,
        create_date     TEXT NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        fg_item_code    TEXT NOT NULL DEFAULT '',
        fg_item_name    TEXT NOT NULL DEFAULT '',
        item_type       TEXT NOT NULL DEFAULT '',
        drawing_rev     TEXT NOT NULL DEFAULT '',
        unit            TEXT NOT NULL DEFAULT 'Unit-1',
        order_type      TEXT NOT NULL DEFAULT 'For Order (Sales)',
        ordered_qty     INTEGER NOT NULL DEFAULT 0,
        planned_qty     INTEGER NOT NULL DEFAULT 0,
        work_order_date TEXT NOT NULL DEFAULT '',
        proj_comp_date  TEXT,
        planner         TEXT,
        remarks         TEXT,
        status          TEXT NOT NULL DEFAULT 'Draft',
        priority        TEXT NOT NULL DEFAULT 'Normal'
      )
    `);

    await pool.query(`
      ALTER TABLE public.work_orders
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await pool.query(`
      ALTER TABLE public.work_orders
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await pool.query(`
      ALTER TABLE public.work_orders
      ADD COLUMN IF NOT EXISTS proj_comp_date TEXT
    `);

    // Ensure stock order list table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.createstock_list (
        stock_order_no     TEXT PRIMARY KEY,
        creation_date      TEXT,
        item_code          TEXT,
        item_description   TEXT,
        planned_qty        INTEGER NOT NULL DEFAULT 0,
        order_type         TEXT,
        unit               TEXT,
        status             TEXT NOT NULL DEFAULT 'Draft',
        priority           TEXT,
        completion_date    TEXT,
        planner            TEXT,
        remarks            TEXT,
        drawing_revision   TEXT,
        fg_quantity        TEXT,
        routing_changes    JSONB,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      ALTER TABLE public.createstock_list
      ADD COLUMN IF NOT EXISTS routing_changes JSONB
    `);
    console.log('[PostgreSQL] createstock_list table ready');

    // Load Stock [BOM] – batch-wise available stock
    await pool.query(`
      CREATE TABLE IF NOT EXISTS load_stockbom (
        id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        batch           VARCHAR(50),
        available_stock NUMERIC(12, 4)
      )
    `);

    // BOM stock master (input materials per BOM)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.bom_stock (
        id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        ip_item_code VARCHAR(50),
        ip_item_name VARCHAR(255),
        base_qty     NUMERIC(12,4),
        req_qty      NUMERIC(12,4)
      )
    `);

    // Document-number sequence for stock_allocated_table records.
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS public.stock_allocation_doc_seq START 1`);

    // Copy legacy allocations into the db.js table once per document number.
    // This keeps previously posted allocations visible after switching tables.
    const legacyAllocationTable = await pool.query(`SELECT to_regclass('public.stock_allocations') AS table_name`);
    if (legacyAllocationTable.rows[0]?.table_name) {
      const migratedAllocations = await pool.query(`
        INSERT INTO public.stock_allocated_table (
          document_number, doc_date, workorder_number, jobcard_number, process_type,
          bp_code, bp_name, fg_item_code, fg_item_name, operation_item, operation_item_name,
          planned_qty, item_code, item_name, batch_no, allocation_qty, allocation_type,
          from_unit, from_whs, to_unit, to_whs, remarks, status, created_at
        )
        SELECT
          s.document_no, s.doc_date, s.work_order_no, s.job_card_no, s.process_type,
          s.bp_code, s.bp_name, s.fg_item_code, s.fg_item_name, s.op_item_code, s.op_item_name,
          s.planned_qty, s.item_code, s.item_name, s.batch_no, s.allocation_qty, s.allocation_type,
          s.from_unit, s.from_whs, s.to_unit, s.to_whs, s.remarks, COALESCE(s.status, 'Released'), s.created_at
        FROM public.stock_allocations s
        WHERE s.document_no IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.stock_allocated_table t
            WHERE t.document_number = s.document_no
          )
      `);
      if (migratedAllocations.rowCount) {
        console.log(`[PostgreSQL] Migrated ${migratedAllocations.rowCount} allocations to stock_allocated_table`);
      }
    }

    // Keep the next generated SA number higher than any migrated or existing number.
    const allocationSequenceState = await pool.query(`SELECT last_value FROM public.stock_allocation_doc_seq`);
    const highestAllocationNumber = await pool.query(`
      SELECT MAX(SUBSTRING(document_number FROM 4)::BIGINT) AS highest
      FROM public.stock_allocated_table
      WHERE document_number ~ '^SA-[0-9]+$'
    `);
    const highestNumber = Number(highestAllocationNumber.rows[0]?.highest || 0);
    if (highestNumber > 0) {
      const currentSequenceValue = Number(allocationSequenceState.rows[0]?.last_value || 0);
      await pool.query(`SELECT setval('public.stock_allocation_doc_seq', $1, true)`, [Math.max(highestNumber, currentSequenceValue)]);
    }
    // PO / transfer lifecycle columns (workflow: Post PO / Cancel PO / Cancel Transfer).
    try {
      await pool.query(`
        ALTER TABLE public.stock_allocated_table
          ADD COLUMN IF NOT EXISTS po_status       TEXT NOT NULL DEFAULT 'Pending',
          ADD COLUMN IF NOT EXISTS po_reference_no TEXT,
          ADD COLUMN IF NOT EXISTS po_number       TEXT,
          ADD COLUMN IF NOT EXISTS dc_date         DATE,
          ADD COLUMN IF NOT EXISTS inventory_no    TEXT
      `);
      await pool.query(`
        UPDATE public.stock_allocated_table
           SET inventory_no = document_number
         WHERE inventory_no IS NULL OR TRIM(inventory_no) = ''
      `);
    } catch (colErr) {
      console.error('[PostgreSQL] stock_allocated_table PO columns:', colErr.message);
    }
    try {
      await pool.query(`
    CREATE TABLE IF NOT EXISTS public.stock_allocation_batches (
      id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      allocation_id  BIGINT NOT NULL,
      batch_no       VARCHAR(100) NOT NULL,
      allocation_qty NUMERIC(14,4) NOT NULL
    )
  `);
      await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_stock_allocation_batches_alloc
    ON public.stock_allocation_batches (allocation_id)
  `);
    } catch (batchTableErr) {
      console.error('[PostgreSQL] stock_allocation_batches:', batchTableErr.message);
    }
    console.log('[PostgreSQL] stock_allocated_table ready for stock allocation API');
  } catch (err) {
    console.error('[Server] Could not initialise database. Check PG_PASSWORD in .env.', err.message);
  }
})();

// =============================================================================
// 0. Database Connection Status
// =============================================================================
app.get('/api/RDBMS/connection', async (req, res) => {
  try {
    const status = await pingRDBMS();
    res.json({
      connected: status.connected,
      version: status.version || null,
      error: status.error || null,
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || '5432',
      database: process.env.PG_DATABASE || 'AE_WebApp',
      user: process.env.PG_USER || 'postgres',
      engine: 'PostgreSQL',
    });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

// =============================================================================
// 1. Finished Goods Catalog
// =============================================================================
app.get('/api/fg-items', async (req, res) => {
  try {
    const search = String(req.query.q || '').trim();
    const pattern = `%${search}%`;

    const result = await pool.query(`
      SELECT
        fg_item_code     AS code,
        fg_item_name     AS name,
        drawing_revision AS revision,
        fg_quantity      AS "fgQuantity"
      FROM public.item_masterstock
      WHERE ($1 = ''
        OR fg_item_code ILIKE $2
        OR fg_item_name ILIKE $2)
        AND fg_item_code IS NOT NULL
        AND TRIM(fg_item_code::text) <> ''
      ORDER BY fg_item_code
      LIMIT 50
    `, [search, pattern]);

    res.json(result.rows);
  } catch (err) {
    console.error('[FG ITEMS] item_masterstock query failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fg-items', async (req, res) => {
  res.status(405).json({
    error: 'FG items are managed in item_masterstock and cannot be created here.'
  });
});

// Stock Order Planning routing cards sourced from routing_stocks.
app.get('/api/stock-order-planning/routing/:fgItemCode', async (req, res) => {
  try {
    const fgItemCode = String(req.params.fgItemCode || '').trim();
    if (!fgItemCode) return res.json([]);

    const result = await pool.query(`
      SELECT
        item_code     AS code,
        item_name     AS subtitle,
        bom_operation AS operation,
        machine_code  AS "machineCode",
        machine_name  AS "machineName"
      FROM public.routing_stocks
      WHERE item_code = $1 OR item_code ILIKE $2
      ORDER BY CASE WHEN item_code = $1 THEN 1 ELSE 0 END, item_code
    `, [fgItemCode, `${fgItemCode}-%`]);

    res.json(result.rows);
  } catch (err) {
    console.error('[STOCK ROUTING GET] routing_stocks query failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// Stock Order Planning – List + Create
// Table: public.createstock_list
// =============================================================================

app.get('/api/stock-order-planning/stock-orders', async (req, res) => {
  try {
    const { status, unit, search } = req.query;

    let where = [];
    let params = [];
    let idx = 1;

    if (status && status !== 'All') {
      where.push(`status = $${idx++}`);
      params.push(status);
    }
    if (unit && unit !== 'All Units') {
      where.push(`unit = $${idx++}`);
      params.push(unit);
    }
    if (search && String(search).trim()) {
      where.push(`(
        stock_order_no ILIKE $${idx} OR
        item_code ILIKE $${idx} OR
        item_description ILIKE $${idx} OR
        order_type ILIKE $${idx}
      )`);
      params.push(`%${String(search).trim()}%`);
      idx++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        stock_order_no   AS number,
        creation_date    AS created,
        item_code        AS "itemCode",
        item_description AS "itemDescription",
        planned_qty      AS "plannedQty",
        order_type       AS "orderType",
        unit,
        status,
        routing_changes  AS "routingChanges"
      FROM public.createstock_list
      ${whereClause}
      ORDER BY created_at DESC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('[STOCK ORDERS GET] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock-order-planning/planning', async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};

    const stockOrderNo = String(body.stock_order_no || body.number || '').trim();
    if (!stockOrderNo) {
      return res.status(400).json({ error: 'stock_order_no (number) is required' });
    }

    const creationDate = body.creation_date || body.created || null;
    const itemCode = body.item_code || body.itemCode || '';
    const itemDescription = body.item_description || body.itemDescription || '';
    const plannedQty = Number(body.planned_qty ?? body.plannedQty ?? 0) || 0;
    const orderType = body.order_type || body.orderType || 'For Stock (FG)';
    const unit = body.unit || '';
    const status = body.status || 'Draft';
    const routingChanges = body.routing_changes ?? body.routingChanges ?? null;

    const result = await client.query(`
      INSERT INTO public.createstock_list (
        stock_order_no, creation_date, item_code, item_description,
        planned_qty, order_type, unit, status, routing_changes, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9, CURRENT_TIMESTAMP
      )
      ON CONFLICT (stock_order_no) DO UPDATE SET
        creation_date      = EXCLUDED.creation_date,
        item_code          = EXCLUDED.item_code,
        item_description   = EXCLUDED.item_description,
        planned_qty        = EXCLUDED.planned_qty,
        order_type         = EXCLUDED.order_type,
        unit               = EXCLUDED.unit,
        status             = EXCLUDED.status,
        routing_changes    = COALESCE(EXCLUDED.routing_changes, createstock_list.routing_changes),
        updated_at         = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      stockOrderNo,
      creationDate,
      itemCode,
      itemDescription,
      plannedQty,
      orderType,
      unit,
      status,
      routingChanges
    ]);

    if (String(status).toLowerCase() === 'released') {
      try {
        await snapshotStockRouting(client, stockOrderNo, itemCode, routingChanges, plannedQty, {
          onlyIfMissing: !routingChanges,
        });
      } catch (snapshotErr) {
        console.error('[STOCK ROUTING] snapshot failed:', snapshotErr.message);
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[STOCK PLANNING POST] Failed:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/stock-order-planning/stock-orders/:stockOrderNo', async (req, res) => {
  const client = await pool.connect();
  try {
    const stockOrderNo = String(req.params.stockOrderNo || '').trim();
    if (!stockOrderNo) {
      return res.status(400).json({ error: 'stockOrderNo is required' });
    }

    await client.query('BEGIN');
    const result = await client.query(
      'DELETE FROM public.createstock_list WHERE stock_order_no = $1 RETURNING stock_order_no',
      [stockOrderNo]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Stock order not found', stockOrderNo });
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Stock order deleted permanently',
      stockOrderNo: result.rows[0].stock_order_no,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[STOCK ORDER DELETE] Failed:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// =============================================================================
// 2. Planners Catalog
// =============================================================================
app.get('/api/planners', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM planners ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/planners', async (req, res) => {
  try {
    const { id, name } = req.body;
    await pool.query(
      `INSERT INTO planners (id, name) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [id, name]
    );
    res.status(201).json({ message: 'Planner saved', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// Dashboard
// =============================================================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const totalResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM public.created_wo_list
    `);

    const statusResult = await pool.query(`
      SELECT status AS name, COUNT(*)::int AS value
      FROM public.created_wo_list
      GROUP BY status
      ORDER BY status
    `);

    const orderTypeResult = await pool.query(`
      SELECT order_type AS name, COUNT(*)::int AS value
      FROM public.created_wo_list
      GROUP BY order_type
      ORDER BY order_type
    `);

    const unitResult = await pool.query(`
      SELECT COALESCE(unit, 'Unassigned') AS name, COUNT(*)::int AS value
      FROM public.created_wo_list
      GROUP BY COALESCE(unit, 'Unassigned')
      ORDER BY name
    `);

    res.json({
      totalWorkOrders: totalResult.rows[0]?.total || 0,
      status: statusResult.rows,
      orderType: orderTypeResult.rows,
      unit: unitResult.rows,
    });
  } catch (err) {
    console.error('[DASHBOARD GET] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 3. Work Orders
// =============================================================================
app.get('/api/work-orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        work_order_no AS "workOrderNo",
        creation_date AS "createDate",
        item_code AS "itemCode",
        item_description AS "itemName",
        planned_qty AS "plannedQty",
        order_type AS "orderType",
        unit,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM public.created_wo_list
      ORDER BY created_at DESC, work_order_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[WORK ORDERS GET] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/work-orders/:woNo', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.fgitem_code AS "fgItemCode",
        p.fgitem_name AS "fgItemName",
        '' AS "itemType",
        p.card_code AS "cardCode",
        p.card_name AS "cardName",
        p.drawing_revision AS "drawingRev",
        p.unit_selection AS unit,
        p.order_type AS "orderType",
        p.ordered_qty AS "orderedQty",
        p.planned_qty AS "plannedQty",
        p.so_openqty AS "openQty",
        p.so_pendingqty AS "pendingQty",
        p.work_order_no AS "workOrderNo",
        TO_CHAR(p.work_order_date, 'DD-MM-YYYY') AS "workOrderDate",
        TO_CHAR(p.projection_completion_date, 'DD-MM-YYYY') AS "projCompDate",
        p.planner,
        p.remarks,
        p.work_order_priority AS priority,
        c.status
      FROM public.planning_blueprints p
      LEFT JOIN public.created_wo_list c
        ON c.work_order_no = p.work_order_no
      WHERE p.work_order_no = $1
      LIMIT 1
    `, [req.params.woNo]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[WORK ORDER DETAIL GET] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function toISODate(value, fallback = null) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  const raw = String(value).trim();
  const ddmmyyyy = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  const iso = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return fallback;
}

async function savePlanningBundle(client, body, status, isNew) {
  const workOrderNo = String(body.workOrderNo || '').trim();
  const fgItemCode = String(body.fgItemCode || '').trim();
  const orderType = String(body.orderType || '').trim();
  if (!workOrderNo || !fgItemCode || !orderType) {
    const error = new Error('workOrderNo, fgItemCode, and orderType are required');
    error.code = 'VALIDATION';
    throw error;
  }

  await client.query(`
    INSERT INTO public.creatework_order (fgitem_code, order_type)
    VALUES ($1, $2)
    ON CONFLICT (fgitem_code, order_type) DO NOTHING
  `, [fgItemCode, orderType]);

  const workOrderDate = toISODate(body.workOrderDate, new Date().toISOString().slice(0, 10));
  const completionDate = toISODate(body.projCompDate, workOrderDate);

  await client.query(
    'DELETE FROM public.planning_blueprints WHERE work_order_no = $1',
    [workOrderNo]
  );
  await client.query(`
    INSERT INTO public.planning_blueprints (
      fgitem_code, order_type, unit_selection, fgitem_name,
      drawing_revision, card_code, card_name, work_order_no,
      work_order_priority, ordered_qty, planned_qty, so_openqty,
      so_pendingqty, work_order_date, projection_completion_date,
      planner, remarks
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
  `, [
    fgItemCode,
    orderType,
    body.unit || 'Unit-1',
    body.fgItemName || '',
    body.drawingRev || '',
    body.cardCode || null,
    body.cardName || null,
    workOrderNo,
    body.priority || 'Normal',
    Number(body.orderedQty || 0),
    Number(body.plannedQty || 0),
    Number(body.openQty || body.soOpenQty || 0),
    Number(body.pendingQty || body.soPendingQty || 0),
    workOrderDate,
    completionDate,
    body.planner || null,
    body.remarks || null
  ]);

  await client.query(`
    INSERT INTO public.created_wo_list (
      work_order_no, creation_date, item_code, item_description,
      planned_qty, order_type, unit, status, updated_at
    ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    ON CONFLICT (work_order_no) DO UPDATE SET
      item_code = EXCLUDED.item_code,
      item_description = EXCLUDED.item_description,
      planned_qty = EXCLUDED.planned_qty,
      order_type = EXCLUDED.order_type,
      unit = EXCLUDED.unit,
      status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP
  `, [
    workOrderNo,
    fgItemCode,
    body.fgItemName || '',
    Number(body.plannedQty || 0),
    orderType,
    body.unit || 'Unit-1',
    status || 'Draft'
  ]);
}

// =============================================================================
// Routing snapshots – public.update_salerouting / public.update_stockrouting
// Written when an order is released/updated; read by Stock Allocation.
// =============================================================================
const jobCardNumber = (base, i) => `${base}-${String(i + 1).padStart(2, '0')}`;
const saleJobCardBase = (woNo) => String(woNo || '').trim().replace(/^WO-?/i, '');
const stockJobCardBase = (no) => String(no || '').trim().replace(/^WO-ST-/i, '');
const toNum = (v) => Number(v) || 0;
// Only the FIRST job card of a released order is 'Open'; the rest stay blank for now.
// Before release every card is blank; after release only the first one is 'Open'.
const firstCardStatus = (i, released = false) => (released && i === 0 ? 'Open' : '');

// Is this sale work order currently Released?
// The status of a work order lives in public.created_wo_list (written by savePlanningBundle).
async function isWorkOrderReleased(db, workOrderNo) {
  const woNo = String(workOrderNo || '').trim();
  const r = await db.query(
    `SELECT LOWER(COALESCE(status, '')) AS status FROM public.created_wo_list WHERE work_order_no = $1`,
    [woNo]
  );
  return r.rows[0]?.status === 'released';
}
const normalizeProcessType = (p) => {
  const raw = String(p || '').trim();
  if (!raw) return 'In-House';
  return /^sub[-\s]?con$/i.test(raw) ? 'Sub-Con' : raw;
};
const defaultUnitFor = (processType) => (processType === 'Inter-Unit' ? 'Unit-2' : 'Unit-1');
const defaultWarehouseFor = (processType, unit) => {
  if (processType === 'Sub-Con') return 'SC-U1';
  if (unit === 'Unit-2') return 'QC-U2';
  if (unit === 'Unit-3') return 'QC-U3';
  return 'QC-U1';
};

// Run a snapshot AFTER the main save has committed, in its own transaction, so a snapshot
// problem can never affect (or roll back) the routing / work-order save itself.
async function runSnapshot(client, label, fn) {
  try {
    await client.query('BEGIN');
    await fn();
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error(`[${label}] snapshot failed:`, err.message);
    return false;
  }
}

// Copy the current routing_steps of an FG item into update_salerouting for one work order.
// Called when a work order is released: first job card -> 'Open', all others stay blank.
async function openFirstSaleJobCard(client, workOrderNo) {
  const woNo = String(workOrderNo || '').trim();
  // Already progressed (e.g. a card was allocated -> 'Released')? Leave it alone.
  const progressed = await client.query(
    `SELECT 1 FROM public.update_salerouting
      WHERE work_order_no = $1 AND COALESCE(job_card_status, '') <> '' LIMIT 1`, [woNo]);
  if (progressed.rowCount > 0) return;
  await client.query(
    `UPDATE public.update_salerouting SET job_card_status = '' WHERE work_order_no = $1`, [woNo]);
  await client.query(
    `UPDATE public.update_salerouting SET job_card_status = 'Open'
      WHERE id = (SELECT id FROM public.update_salerouting
                   WHERE work_order_no = $1 ORDER BY job_card_no LIMIT 1)`, [woNo]);
}

async function snapshotSaleRouting(client, workOrderNo, fgItemCode, { onlyIfMissing = false, routes = null } = {}) {
  const woNo = String(workOrderNo || '').trim();
  const fg = String(fgItemCode || '').trim();
  if (!woNo || !fg) return 0;

  if (onlyIfMissing) {
    const existing = await client.query(
      'SELECT 1 FROM public.update_salerouting WHERE work_order_no = $1 LIMIT 1',
      [woNo]
    );
    if (existing.rowCount > 0) return 0;
  }

  const base = saleJobCardBase(woNo);
  const released = await isWorkOrderReleased(client, woNo);
  const prevStatus = {};
  if (released) {
    const prev = await client.query(
      `SELECT job_card_no, job_card_status FROM public.update_salerouting WHERE work_order_no = $1`, [woNo]);
    prev.rows.forEach((r) => { if (r.job_card_status) prevStatus[r.job_card_no] = r.job_card_status; });
  }

  // Routing was just saved from the Card Routing screen: snapshot exactly what was submitted.
  if (Array.isArray(routes) && routes.length > 0) {
    await client.query('DELETE FROM public.update_salerouting WHERE work_order_no = $1', [woNo]);
    let count = 0;
    for (let i = 0; i < Math.min(routes.length, 7); i += 1) {
      const r = routes[i] || {};
      const processType = normalizeProcessType(r.processType || r.process_type);
      const unit = r.unit || defaultUnitFor(processType);
      await client.query(`
        INSERT INTO public.update_salerouting (
          work_order_no, fg_item_code, job_card_no, op_item_code, op_item_name, operation_name,
          process_type, unit, warehouse, machine_code, machine_name,
          setting_time, process_time, total_time, planned_qty,
          start_date, start_time, end_date, end_time, remarks, job_card_status, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,CURRENT_TIMESTAMP)
      `, [
        woNo, fg, String(r.jobCardNo || '').trim() || jobCardNumber(base, i),
        r.opItemCode || r.item_code || fg, r.opItemName || r.item_name || '',
        r.operationName || r.operation || r.bomOperation || '',
        processType, unit, r.warehouse || defaultWarehouseFor(processType, unit),
        r.plannedMachineCode || r.machine_code || '', r.plannedMachineName || r.machine_name || '',
        toNum(r.settingTimeMinutes ?? r.setting_time), toNum(r.processTimePerUnitMins ?? r.cycleTimeMinutes ?? r.process_time),
        toNum(r.totalTimeMinutes ?? r.total_time), toNum(r.plannedQty ?? r.planned_qty),
        r.startDate || r.start_date || null, r.startTime || r.start_time || null,
        r.endDate || r.end_date || null, r.endTime || r.end_time || null,
        r.remarks || null,
        prevStatus[String(r.jobCardNo || '').trim() || jobCardNumber(base, i)] || firstCardStatus(i, released),
      ]);
      count += 1;
    }
    return count;
  }

  // Otherwise (e.g. on release) copy the current routing_steps.
  // Same selection/order/limit as GET /api/routing so job card numbers match.
  const steps = await client.query(`
    SELECT to_jsonb(r) AS row_data
    FROM public.routing_steps r
    WHERE r.item_code = $1 OR r.item_code LIKE $1 || '-%'
    ORDER BY (r.item_code = $1), r.item_code, COALESCE(to_jsonb(r)->>'bom_operation', '')
    LIMIT 7
  `, [fg]);

  await client.query('DELETE FROM public.update_salerouting WHERE work_order_no = $1', [woNo]);

  let inserted = 0;
  for (let i = 0; i < steps.rows.length; i += 1) {
    const d = steps.rows[i].row_data || {};
    const processType = normalizeProcessType(d.process_type);
    const unit = d.unit || defaultUnitFor(processType);
    await client.query(`
      INSERT INTO public.update_salerouting (
        work_order_no, fg_item_code, job_card_no, op_item_code, op_item_name, operation_name,
        process_type, unit, warehouse, machine_code, machine_name,
        setting_time, process_time, total_time, planned_qty,
        start_date, start_time, end_date, end_time, remarks, job_card_status, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,CURRENT_TIMESTAMP)
    `, [
      woNo, fg, jobCardNumber(base, i),
      d.item_code || fg, d.item_name || '', d.bom_operation || '',
      processType, unit, d.warehouse || defaultWarehouseFor(processType, unit),
      d.machine_code || '', d.machine_name || '',
      toNum(d.setting_time), toNum(d.process_time), toNum(d.total_time), toNum(d.planned_qty),
      d.start_date || null, d.start_time || null, d.end_date || null, d.end_time || null,
      d.remarks || null, prevStatus[jobCardNumber(base, i)] || firstCardStatus(i, released),
    ]);
    inserted += 1;
  }
  return inserted;
}

// Build update_stockrouting for a stock order from routing_stocks + the saved routing_changes.
async function snapshotStockRouting(client, stockOrderNo, itemCode, routingChanges, plannedQty, { onlyIfMissing = false } = {}) {
  const orderNo = String(stockOrderNo || '').trim();
  const fg = String(itemCode || '').trim();
  if (!orderNo || !fg) return 0;

  if (onlyIfMissing) {
    const existing = await client.query(
      'SELECT 1 FROM public.update_stockrouting WHERE stock_order_no = $1 LIMIT 1',
      [orderNo]
    );
    if (existing.rowCount > 0) return 0;
  }

  // Same selection/order as GET /api/stock-order-planning/routing/:fgItemCode.
  const steps = await client.query(`
    SELECT
      item_code     AS code,
      item_name     AS subtitle,
      bom_operation AS operation,
      machine_code  AS "machineCode",
      machine_name  AS "machineName"
    FROM public.routing_stocks
    WHERE item_code = $1 OR item_code ILIKE $2
    ORDER BY CASE WHEN item_code = $1 THEN 1 ELSE 0 END, item_code
  `, [fg, `${fg}-%`]);

  let changes = routingChanges;
  if (typeof changes === 'string') {
    try { changes = JSON.parse(changes); } catch { changes = null; }
  }

  const prevStock = await client.query(
    'SELECT job_card_no, job_card_status FROM public.update_stockrouting WHERE stock_order_no = $1', [orderNo]);
  const prevStatus = {};
  prevStock.rows.forEach((r) => { if (r.job_card_status) prevStatus[r.job_card_no] = r.job_card_status; });

  await client.query('DELETE FROM public.update_stockrouting WHERE stock_order_no = $1', [orderNo]);

  const base = stockJobCardBase(orderNo);
  let inserted = 0;
  for (let i = 0; i < steps.rows.length; i += 1) {
    const row = steps.rows[i];
    const jobCardNo = jobCardNumber(base, i);
    const sel = changes?.selections?.[jobCardNo] || {};
    const det = changes?.details?.[jobCardNo] || {};
    const processType = normalizeProcessType(sel.processType);
    const unit = sel.unit || defaultUnitFor(processType);
    await client.query(`
      INSERT INTO public.update_stockrouting (
        stock_order_no, fg_item_code, job_card_no, op_item_code, op_item_name, operation_name,
        process_type, unit, warehouse, machine_code, machine_name,
        setting_time, process_time, total_time, planned_qty,
        start_date, start_time, end_date, end_time, remarks, job_card_status, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,CURRENT_TIMESTAMP)
    `, [
      orderNo, fg, jobCardNo,
      row.code || fg, row.subtitle || '', row.operation || '',
      processType, unit, det.warehouse || defaultWarehouseFor(processType, unit),
      det.machineCode || row.machineCode || '', det.machineName || row.machineName || '',
      toNum(det.settingTime), toNum(det.processTime),
      toNum(det.settingTime) + toNum(det.processTime) * toNum(plannedQty),
      toNum(plannedQty),
      det.startDate || null, det.startTime || null, det.endDate || null, det.endTime || null,
      det.remarks || null, prevStatus[jobCardNo] || firstCardStatus(i, true),
    ]);
    inserted += 1;
  }
  return inserted;
}

app.post('/api/work-orders', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await savePlanningBundle(client, req.body, req.body.status || 'Draft', true);
    await client.query('COMMIT');
    if (String(req.body.status || '').toLowerCase() === 'released') {
      await runSnapshot(client, 'SALE ROUTING', async () => {
        await snapshotSaleRouting(client, req.body.workOrderNo, req.body.fgItemCode, { onlyIfMissing: true });
        await openFirstSaleJobCard(client, req.body.workOrderNo);
      });
    }
    res.status(201).json({ message: 'Work order created successfully', workOrderNo: req.body.workOrderNo });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[WORK ORDER POST] Failed:', { code: err.code, detail: err.detail, message: err.message });
    res.status(err.code === 'VALIDATION' ? 400 : 500).json({ error: err.message, code: err.code || null, detail: err.detail || null });
  } finally {
    client.release();
  }
});

app.put('/api/work-orders/:woNo', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await savePlanningBundle(client, { ...req.body, workOrderNo: req.params.woNo }, req.body.status || 'Draft', false);
    await client.query('COMMIT');
    if (String(req.body.status || '').toLowerCase() === 'released') {
      await runSnapshot(client, 'SALE ROUTING', async () => {
        await snapshotSaleRouting(client, req.params.woNo, req.body.fgItemCode, { onlyIfMissing: true });
        await openFirstSaleJobCard(client, req.params.woNo);
      });
    }
    res.json({ message: 'Work order updated successfully', woNo: req.params.woNo });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[WORK ORDER PUT] Failed:', { code: err.code, detail: err.detail, message: err.message });
    res.status(err.code === 'VALIDATION' ? 400 : 500).json({ error: err.message, code: err.code || null, detail: err.detail || null });
  } finally {
    client.release();
  }
});

app.put('/api/work-orders/:woNo/cancel', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE public.created_wo_list SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE work_order_no = $1`,
      [req.params.woNo]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Work order not found' });
    res.json({ success: true, message: 'Work Order Cancelled Successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/work-orders/:woNo', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM public.planning_blueprints WHERE work_order_no = $1', [req.params.woNo]);
    const result = await client.query('DELETE FROM public.created_wo_list WHERE work_order_no = $1', [req.params.woNo]);
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Work order not found' });
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Work order deleted successfully', woNo: req.params.woNo });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[DELETE WORK ORDER] Failed:', { code: err.code, detail: err.detail, message: err.message });
    res.status(500).json({ error: err.message, code: err.code || null, detail: err.detail || null });
  } finally {
    client.release();
  }
});

// =============================================================================
// 6. Routing Steps  (FIXED GET + PUT for Released WO updates)
// =============================================================================

app.get('/api/routing', async (req, res) => {
  try {
    const fgItemCode = String(req.query.fgItemCode || '').trim();
    const workOrderNo = String(req.query.workOrderNo || '').trim();

    if (!fgItemCode) {
      return res.json([]);
    }
    if (!workOrderNo) {
      return res.status(400).json({ error: 'workOrderNo is required' });
    }

    await reopenStaleReleasedCards('work', workOrderNo);

    // FIX: a work order that was released/updated has its exact saved routing in
    // update_salerouting (written by PUT /api/routing/work-order/:woNo and on Release).
    // Read that first so reopening the Released work order shows what was saved,
    // even if routing_steps is missing some of the columns.
    try {
      const snap = await pool.query(`
        SELECT
          job_card_no                    AS "jobCardNo",
          op_item_code                   AS "opItemCode",
          op_item_name                   AS "opItemName",
          operation_name                 AS "operationName",
          process_type                   AS "processType",
          unit,
          warehouse,
          machine_code                   AS "plannedMachineCode",
          machine_name                   AS "plannedMachineName",
          setting_time::float8           AS "settingTimeMinutes",
          process_time::float8           AS "processTimePerUnitMins",
          total_time::float8             AS "totalTimeMinutes",
          planned_qty::float8            AS "plannedQty",
          start_date                     AS "startDate",
          start_time                     AS "startTime",
          end_date                       AS "endDate",
          end_time                       AS "endTime",
          remarks,
          COALESCE(job_card_status, '') AS "jobCardStatus"
        FROM public.update_salerouting
        WHERE work_order_no = $1
          AND (fg_item_code = $2 OR fg_item_code IS NULL)
        ORDER BY job_card_no
      `, [workOrderNo, fgItemCode]);

      if (snap.rows.length > 0) {
        const releasedNow = await isWorkOrderReleased(pool, workOrderNo);
        return res.json(
          snap.rows.map((row, idx) => {
            const card = {
              ...row,
              jobCardStatus: releasedNow ? (row.jobCardStatus || (idx === 0 ? 'Open' : '')) : '',
              bomOperation: row.operationName,
              cycleTimeMinutes: row.processTimePerUnitMins,
            };
            return Object.fromEntries(
              Object.entries(card).filter(([, v]) => v !== null && v !== undefined)
            );
          })
        );
      }
    } catch (snapErr) {
      console.error('[ROUTING GET] update_salerouting read failed, using routing_steps:', snapErr.message);
    }

    const result = await pool.query(`
      SELECT json_strip_nulls(
        json_build_object(
          'opItemCode', row_data->>'item_code',
          'opItemName', row_data->>'item_name',
          'plannedQty', row_data->>'planned_qty',
          'processType', row_data->>'process_type',
          'unit', row_data->>'unit',
          'operationName', row_data->>'bom_operation',
          'bomOperation', row_data->>'bom_operation',
          'jobCardNo', CONCAT(REGEXP_REPLACE($2::text, '^WO-?', '', 'i'), '-', LPAD(ROW_NUMBER() OVER (
            ORDER BY (item_code = $1), item_code, COALESCE(row_data->>'bom_operation', '')
          )::text, 2, '0')),
          'jobCardStatus', COALESCE(row_data->>'job_cardstatus', row_data->>'job_card_status', ''),
          'warehouse', row_data->>'warehouse',
          'plannedMachineCode', row_data->>'machine_code',
          'plannedMachineName', row_data->>'machine_name',
          'settingTimeMinutes', row_data->>'setting_time',
          'processTimePerUnitMins', row_data->>'process_time',
          'cycleTimeMinutes', row_data->>'process_time',
          'startDate', row_data->>'start_date',
          'startTime', row_data->>'start_time',
          'endDate', row_data->>'end_date',
          'endTime', row_data->>'end_time',
          'totalTimeMinutes', row_data->>'total_time',
          'remarks', row_data->>'remarks'
        )
          
      ) AS card_data
      FROM (
        SELECT r, r.item_code, to_jsonb(r) AS row_data
        FROM public.routing_steps r
        WHERE r.item_code = $1 OR r.item_code LIKE $1 || '-%'
      ) AS source_rows
      ORDER BY (item_code = $1), item_code, COALESCE(row_data->>'bom_operation', '')
      LIMIT 7
    `, [fgItemCode, workOrderNo]);

    const releasedNow = await isWorkOrderReleased(pool, workOrderNo);
    res.json(result.rows.map((row, idx) => ({
      ...row.card_data,
      jobCardStatus: releasedNow && idx === 0 ? 'Open' : '',
    })));
  } catch (err) {
    console.error('[ROUTING GET] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Explicit INSERT — no jsonb_populate_record (avoids silent column drops)
app.put('/api/routing/work-order/:woNo', async (req, res) => {
  const client = await pool.connect();
  try {
    const { routes = [], fgItemCode = '' } = req.body || {};
    const itemCode = String(fgItemCode || '').trim();
    if (!itemCode) {
      return res.status(400).json({ error: 'fgItemCode is required' });
    }
    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({ error: 'routes array is required and must not be empty' });
    }

    await client.query('BEGIN');

    await client.query(
      `DELETE FROM public.routing_steps
       WHERE item_code = $1 OR item_code LIKE $1 || '-%'`,
      [itemCode]
    );

    const colRes = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'routing_steps'`
    );
    const routingStepColumns = new Set(colRes.rows.map((r) => r.column_name));

    let inserted = 0;

    for (const route of routes) {
      const opItemCode =
        String(route.opItemCode || route.item_code || '').trim() || itemCode;
      const processTime =
        Number(route.processTimePerUnitMins ?? route.cycleTimeMinutes ?? 0) || 0;
      const settingTime =
        Number(route.settingTimeMinutes ?? route.setting_time ?? 0) || 0;
      const totalTime =
        Number(route.totalTimeMinutes ?? route.total_time ?? 0) || 0;
      // Status is derived from the work order's release state, never taken from the client.
      const jobCardStatus = '';

      // Only write columns that exist in the real routing_steps table.
      const candidate = [
        ['item_code', opItemCode],
        ['item_name', route.opItemName || route.item_name || ''],
        ['planned_qty', Number(route.plannedQty ?? route.planned_qty ?? 0) || 0],
        ['process_type', route.processType || route.process_type || 'In-House'],
        ['unit', route.unit || 'Unit-1'],
        ['bom_operation', route.operationName || route.bomOperation || route.bom_operation || ''],
        ['warehouse', route.warehouse || ''],
        ['machine_code', route.plannedMachineCode || route.machine_code || ''],
        ['machine_name', route.plannedMachineName || route.machine_name || ''],
        ['setting_time', settingTime],
        ['process_time', processTime],
        ['start_date', route.startDate || route.start_date || null],
        ['start_time', route.startTime || route.start_time || null],
        ['end_date', route.endDate || route.end_date || null],
        ['end_time', route.endTime || route.end_time || null],
        ['total_time', totalTime],
        ['remarks', route.remarks || null],
        // FIX: persist job card status (whichever column name the table uses)
        ['job_cardstatus', jobCardStatus],
        ['job_card_status', jobCardStatus],
      ].filter(([col]) => routingStepColumns.has(col));

      await client.query(
        `INSERT INTO public.routing_steps (${candidate.map(([c]) => c).join(', ')})
         VALUES (${candidate.map((_, i) => `$${i + 1}`).join(', ')})`,
        candidate.map(([, v]) => v)
      );
      inserted += 1;
    }

    await client.query('COMMIT');

    const snapshotSaved = await runSnapshot(client, 'SALE ROUTING', () =>
      snapshotSaleRouting(client, req.params.woNo, itemCode, { routes }));

    console.log(
      `[ROUTING PUT] WO=${req.params.woNo} FG=${itemCode} inserted=${inserted} snapshotSaved=${snapshotSaved}`
    );

    res.json({
      success: true,
      snapshotSaved,
      count: inserted,
      workOrderNo: req.params.woNo,
      fgItemCode: itemCode,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[ROUTING PUT] Failed:', err.message, err.detail || '');
    res.status(500).json({
      error: err.message,
      detail: err.detail || null,
      code: err.code || null,
    });
  } finally {
    client.release();
  }
});

app.delete('/api/routing/:id', async (req, res) => {
  res.status(405).json({
    error: 'routing_steps has no primary-key id column; delete routing cards through the work-order replace endpoint.'
  });
});

// =============================================================================
// 7. RDBMS Database Explorer Endpoints
// =============================================================================

app.get('/api/RDBMS/tables', async (req, res) => {
  try {
    const tableRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = await Promise.all(tableRes.rows.map(async (t) => {
      const name = t.table_name;

      const countRes = await pool.query(`SELECT COUNT(*) AS c FROM "${name}"`);
      const rowCount = parseInt(countRes.rows[0].c, 10);

      const colRes = await pool.query(`
        SELECT
          c.ordinal_position - 1          AS cid,
          c.column_name                   AS name,
          c.udt_name                      AS type,
          CASE WHEN c.is_nullable = 'NO' THEN 1 ELSE 0 END AS notnull,
          c.column_default                AS dflt_value,
          CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END AS pk
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema   = kcu.table_schema
          WHERE tc.table_name       = $1
            AND tc.table_schema     = 'public'
            AND tc.constraint_type  = 'PRIMARY KEY'
        ) pk ON pk.column_name = c.column_name
        WHERE c.table_name   = $1
          AND c.table_schema = 'public'
        ORDER BY c.ordinal_position
      `, [name]);

      return { name, rowCount, columns: colRes.rows };
    }));

    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/RDBMS/table/:name', async (req, res) => {
  try {
    const tableName = req.params.name;

    const colRes = await pool.query(`
      SELECT
        c.ordinal_position - 1          AS cid,
        c.column_name                   AS name,
        c.udt_name                      AS type,
        CASE WHEN c.is_nullable = 'NO' THEN 1 ELSE 0 END AS notnull,
        c.column_default                AS dflt_value,
        CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END AS pk
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema   = kcu.table_schema
        WHERE tc.table_name       = $1
          AND tc.table_schema     = 'public'
          AND tc.constraint_type  = 'PRIMARY KEY'
      ) pk ON pk.column_name = c.column_name
      WHERE c.table_name   = $1
        AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `, [tableName]);

    const rowRes = await pool.query(`SELECT * FROM "${tableName}" LIMIT 200`);

    res.json({ tableName, columns: colRes.rows, rows: rowRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/RDBMS/query', async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL query string required' });
    }

    const trimmed = sql.trim().toUpperCase();
    const isRead = trimmed.startsWith('SELECT') || trimmed.startsWith('EXPLAIN') || trimmed.startsWith('SHOW') || trimmed.startsWith('WITH');

    const result = await pool.query(sql.trim());

    if (isRead) {
      const columns = result.fields ? result.fields.map(f => f.name) : [];
      res.json({ type: 'SELECT', rows: result.rows, columns, count: result.rowCount });
    } else {
      res.json({ type: 'MUTATION', changes: result.rowCount, command: result.command });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/RDBMS/table/:name/truncate', async (req, res) => {
  try {
    const tableName = req.params.name;

    const check = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: `Table "${tableName}" not found` });
    }

    const result = await pool.query(`DELETE FROM "${tableName}"`);
    res.json({ message: `All rows deleted from "${tableName}"`, changes: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/RDBMS/table/:name/insert', async (req, res) => {
  try {
    const tableName = req.params.name;
    const rowData = req.body;

    if (!rowData || Object.keys(rowData).length === 0) {
      return res.status(400).json({ error: 'Row data is required' });
    }

    const check = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: `Table "${tableName}" not found` });
    }

    const columns = Object.keys(rowData);
    const values = Object.values(rowData).map(v => (v === '' ? null : v));
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const colList = columns.map(c => `"${c}"`).join(', ');

    const result = await pool.query(
      `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    res.status(201).json({ message: 'Row inserted successfully', row: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// BOM Stock – input material allocation (public.bom_stock)
// =============================================================================
app.get('/api/bom-stock', async (req, res) => {
  try {
    const search = String(req.query.q || '').trim();
    const result = await pool.query(`
      SELECT
        id,
        ip_item_code AS "ipItemCode",
        ip_item_name AS "ipItemName",
        base_qty::float8 AS "baseQty",
        req_qty::float8  AS "reqQty"
      FROM public.bom_stock
      WHERE ($1 = '' OR ip_item_code ILIKE $2 OR ip_item_name ILIKE $2)
      ORDER BY id
    `, [search, `%${search}%`]);
    res.json(result.rows);
  } catch (err) {
    console.error('[BOM STOCK GET] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// Load Stock [BOM] – batch-wise available stock (load_stockbom)
// =============================================================================
app.get('/api/load-stock-bom', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        batch,
        available_stock::float8 AS "availableStock"
      FROM load_stockbom
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[LOAD STOCK BOM GET] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// Stock Allocation – job cards saved at release/update (update_salerouting / update_stockrouting)
// =============================================================================
// Job card statuses of a stock order (used by Stock Order Planning).
app.get('/api/stock-order-planning/job-card-status/:stockOrderNo', async (req, res) => {
  try {
    const stockOrderNo = String(req.params.stockOrderNo || '').trim();
    await reopenStaleReleasedCards('stock', stockOrderNo);
    const r = await pool.query(
      `SELECT job_card_no, COALESCE(job_card_status, '') AS status
         FROM public.update_stockrouting WHERE stock_order_no = $1 ORDER BY job_card_no`,
      [stockOrderNo]);
    res.json(Object.fromEntries(r.rows.map((x) => [x.job_card_no, x.status])));
  } catch (err) {
    console.error('[STOCK JOB CARD STATUS] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stock-allocation/job-cards', async (req, res) => {
  try {
    const kind = String(req.query.kind || '').toLowerCase() === 'stock' ? 'stock' : 'work';
    const orderNo = String(req.query.orderNo || '').trim();
    if (!orderNo) return res.json([]);

    const table = kind === 'stock' ? 'update_stockrouting' : 'update_salerouting';
    const orderCol = kind === 'stock' ? 'stock_order_no' : 'work_order_no';

    await reopenStaleReleasedCards(kind, orderNo);

    const result = await pool.query(`
      SELECT
        job_card_no          AS "jobCardNo",
        op_item_code         AS "opItemCode",
        op_item_name         AS "opItemName",
        operation_name       AS "operationName",
        process_type         AS "processType",
        unit,
        warehouse,
        machine_code         AS "plannedMachineCode",
        machine_name         AS "plannedMachineName",
        machine_name         AS "machineName",
        setting_time::float8 AS "settingTimeMinutes",
        process_time::float8 AS "processTimePerUnitMins",
        total_time::float8   AS "totalTimeMinutes",
        NULLIF(planned_qty, 0)::float8 AS "plannedQty",
        remarks,
        COALESCE(NULLIF(job_card_status, ''), 'Open') AS "jobCardStatus"
      FROM public.${table}
      WHERE ${orderCol} = $1
        AND job_card_status IN ('Open', 'Released')
      ORDER BY job_card_no
      LIMIT 1
    `, [orderNo]);

    res.json(result.rows);
  } catch (err) {
    console.error('[STOCK ALLOCATION JOB CARDS GET] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

async function saveAllocationBatches(allocationId, batches) {
  const list = (Array.isArray(batches) ? batches : [])
    .map((x) => ({
      batchNo: String(x?.batchNo ?? '').trim(),
      qty: Number(x?.allocationQty),
    }))
    .filter((x) => x.batchNo && Number.isFinite(x.qty) && x.qty > 0);

  await pool.query(
    'DELETE FROM public.stock_allocation_batches WHERE allocation_id = $1',
    [allocationId]
  );
  for (const x of list) {
    await pool.query(
      `INSERT INTO public.stock_allocation_batches (allocation_id, batch_no, allocation_qty)
       VALUES ($1, $2, $3)`,
      [allocationId, x.batchNo, x.qty]
    );
  }
}

// =============================================================================
// Stock Allocations – list + Post Transfer (public.stock_allocated_table)
// =============================================================================
// Saves one row per RM batch for an allocation (replaces any existing rows).
app.get('/api/stock-allocations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        document_number  AS "documentNo",
        TO_CHAR(doc_date, 'DD-MM-YYYY') AS "docDate",
        jobcard_number   AS "jobCardNo",
        workorder_number AS "workOrderNo",
        process_type     AS "processType",
        bp_code          AS "bpCode",
        bp_name          AS "bpName",
        operation_item   AS "operationItem",
        to_unit          AS "toUnit",
        planned_qty::float8    AS "plannedQty",
        allocation_qty::float8 AS "allocationQty",
        item_code        AS "itemCode",
        item_name        AS "itemName",
        batch_no         AS "batchNo",
                COALESCE((
          SELECT json_agg(
                   json_build_object('batchNo', sb.batch_no, 'allocationQty', sb.allocation_qty::float8)
                   ORDER BY sb.id)
            FROM public.stock_allocation_batches sb
           WHERE sb.allocation_id = stock_allocated_table.id
        ), '[]'::json) AS batches,
        fg_item_code     AS "fgItemCode",
        fg_item_name     AS "fgItemName",
        operation_item_name AS "operationItemName",
        allocation_type  AS "allocationType",
        from_unit        AS "fromUnit",
        from_whs         AS "fromWhs",
        to_whs           AS "toWhs",
        remarks,
        status,
        COALESCE(NULLIF(TRIM(inventory_no), ''), document_number) AS "inventoryNo",
        COALESCE(po_status, 'Pending') AS "poStatus",
        po_reference_no  AS "poReferenceNo",
        po_number        AS "poNumber",
        TO_CHAR(dc_date, 'DD-MM-YYYY') AS "dcDate"
      FROM public.stock_allocated_table
      ORDER BY created_at DESC, id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[STOCK ALLOCATIONS GET] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock-allocations', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.workOrderNo || !b.jobCardNo || !b.itemCode || !b.batchNo) {
      return res.status(400).json({ error: 'workOrderNo, jobCardNo, itemCode and batchNo are required' });
    }
    const allocQty = Number(b.allocationQty);
    if (!Number.isFinite(allocQty) || allocQty <= 0) {
      return res.status(400).json({ error: 'allocationQty must be greater than zero' });
    }

    // Only the open (first) job card of a released work order can be allocated.
    const openCard = await pool.query(
      `SELECT job_card_no FROM public.update_salerouting
       WHERE work_order_no = $1 AND job_card_status IN ('Open', 'Released')
       ORDER BY job_card_no LIMIT 1`,
      [b.workOrderNo]
    );
    if (openCard.rowCount > 0 && openCard.rows[0].job_card_no !== b.jobCardNo) {
      return res.status(400).json({ error: 'Only the first (Open) job card can be allocated for this work order' });
    }

    const result = await pool.query(`
      INSERT INTO public.stock_allocated_table (
        document_number, doc_date, workorder_number, jobcard_number, process_type,
        bp_code, bp_name, fg_item_code, fg_item_name, operation_item, operation_item_name,
        planned_qty, item_code, item_name, batch_no, allocation_qty, allocation_type,
        from_unit, from_whs, to_unit, to_whs, remarks, status
      ) VALUES (
        'SA-' || LPAD(nextval('public.stock_allocation_doc_seq')::text, 5, '0'),
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'Released'
      )
      RETURNING id, document_number AS "documentNo"
    `, [
      toISODate(b.docDate, new Date().toISOString().slice(0, 10)),
      b.workOrderNo,
      b.jobCardNo,
      b.processType || null,
      b.bpCode || null,
      b.bpName || null,
      b.fgItemCode || null,
      b.fgItemName || null,
      b.opItemCode || null,
      b.opItemName || null,
      Number(b.plannedQty) || 0,
      b.itemCode,
      b.itemName || null,
      b.batchNo,
      allocQty,
      b.allocationType || 'BOM',
      b.fromUnit || null,
      b.fromWhs || null,
      b.toUnit || null,
      b.toWhs || null,
      b.remarks || null,
    ]);
    await saveAllocationBatches(result.rows[0].id, b.batches);
    // Stock is now allocated to this job card: Open -> Released (sale WO or stock order).
    try {
      await pool.query(
        `UPDATE public.update_salerouting SET job_card_status = 'Released', updated_at = NOW()
          WHERE work_order_no = $1 AND job_card_no = $2 AND job_card_status = 'Open'`,
        [b.workOrderNo, b.jobCardNo]);
      await pool.query(
        `UPDATE public.update_stockrouting SET job_card_status = 'Released', updated_at = NOW()
          WHERE stock_order_no = $1 AND job_card_no = $2 AND job_card_status = 'Open'`,
        [b.workOrderNo, b.jobCardNo]);
    } catch (statusErr) {
      console.error('[STOCK ALLOCATIONS POST] job card status update failed:', statusErr.message);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[STOCK ALLOCATIONS POST] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Modify a posted allocation: Work Order / Job Card stay locked, only the
// BOM input item, batch, quantity, units, warehouses and remarks can change.
app.put('/api/stock-allocations/:id', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.itemCode || !b.batchNo) {
      return res.status(400).json({ error: 'itemCode and batchNo are required' });
    }
    const allocQty = Number(b.allocationQty);
    if (!Number.isFinite(allocQty) || allocQty <= 0) {
      return res.status(400).json({ error: 'allocationQty must be greater than zero' });
    }
    const result = await pool.query(
      `UPDATE public.stock_allocated_table
          SET item_code = $1, item_name = $2, batch_no = $3, allocation_qty = $4,
              allocation_type = $5, process_type = $6, from_unit = $7, from_whs = $8,
              to_unit = $9, to_whs = $10, remarks = $11
        WHERE id = $12
        RETURNING id, document_number AS "documentNo"`,
      [
        b.itemCode,
        b.itemName || null,
        b.batchNo,
        allocQty,
        b.allocationType || 'BOM',
        b.processType || null,
        b.fromUnit || null,
        b.fromWhs || null,
        b.toUnit || null,
        b.toWhs || null,
        b.remarks || null,
        req.params.id,
      ]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Stock allocation not found' });
    }
    await saveAllocationBatches(result.rows[0].id, b.batches);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[STOCK ALLOCATIONS PUT] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// Post PO – save PO fields and mark po_status = Posted (workflow only).
app.post('/api/stock-allocations/:id/post-po', async (req, res) => {
  try {
    const b = req.body || {};
    const result = await pool.query(
      `UPDATE public.stock_allocated_table
          SET po_status = 'Posted',
              po_reference_no = COALESCE($1, po_reference_no),
              po_number = COALESCE($2, po_number),
              dc_date = COALESCE($3::date, dc_date),
              remarks = COALESCE($4, remarks)
        WHERE id = $5
        RETURNING id, document_number AS "documentNo",
                  COALESCE(inventory_no, document_number) AS "inventoryNo",
                  po_status AS "poStatus"`,
      [
        b.poReferenceNo || null,
        b.poNumber || null,
        toISODate(b.dcDate, null),
        b.remarks || null,
        req.params.id,
      ]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Stock allocation not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[STOCK ALLOCATIONS POST-PO] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Cancel PO – mark po_status = Cancelled (workflow only).
app.post('/api/stock-allocations/:id/cancel-po', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE public.stock_allocated_table
          SET po_status = 'Cancelled'
        WHERE id = $1
        RETURNING id, document_number AS "documentNo",
                  COALESCE(inventory_no, document_number) AS "inventoryNo",
                  po_status AS "poStatus"`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Stock allocation not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[STOCK ALLOCATIONS CANCEL-PO] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Cancel Transfer – mark allocation status = Cancelled (workflow only).
app.post('/api/stock-allocations/:id/cancel', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE public.stock_allocated_table
          SET status = 'Cancelled'
        WHERE id = $1
        RETURNING id, document_number AS "documentNo",
                  COALESCE(inventory_no, document_number) AS "inventoryNo",
                  status`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Stock allocation not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[STOCK ALLOCATIONS CANCEL] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// Sale Orders – cards for the Sale Order Management Console (public.sale_orders)
// =============================================================================
const SALE_ORDER_SELECT = `
  SELECT
    so_key                          AS id,
    po_number                       AS "poNumber",
    customer_name                   AS "customerName",
    card_code                       AS "cardCode",
    part_no                         AS "partNo",
    part_description                AS "partDescription",
    po_line_id                      AS "poLineId",
    item_type                       AS "itemType",
    drawing_rev                     AS "drawingRev",
    TO_CHAR(po_date,   'DD/MM/YY')  AS "poDate",
    TO_CHAR(ship_date, 'DD/MM/YY')  AS "shipDate",
    TO_CHAR(dock_date, 'DD/MM/YY')  AS "dockDate",
    quantity::float8                AS quantity,
    open_qty::float8                AS "openQty",
    pending_qty::float8             AS "pendingQty",
    mode_of_dispatch                AS "modeOfDispatch",
    logo_src                        AS "logoSrc",
    logo_alt                        AS "logoAlt",
    logo_width                      AS "logoWidth"
  FROM public.sale_orders
`;

app.get('/api/sale-orders', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const dispatch = String(req.query.dispatch || '').trim();
    const result = await pool.query(`
      ${SALE_ORDER_SELECT}
      WHERE ($1 = '' OR customer_name ILIKE $2 OR po_number ILIKE $2 OR part_no ILIKE $2)
        AND ($3 = '' OR $3 = 'All Dispatches' OR mode_of_dispatch = $3)
      ORDER BY id
    `, [q, `%${q}%`, dispatch]);
    res.json(result.rows);
  } catch (err) {
    console.error('[SALE ORDERS GET] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sale-orders/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE pending_qty = 0)::int AS completed
      FROM public.sale_orders
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[SALE ORDERS SUMMARY] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// Start Server
// =============================================================================
app.listen(PORT, () => {
  console.log(`[Autocrat ERP API] Server running on http://localhost:${PORT}`);
  console.log(`[PostgreSQL] Connecting to ${process.env.PG_DATABASE || 'AE_WebApp'} @ ${process.env.PG_HOST || 'localhost'}:${process.env.PG_PORT || 5432}`);
});