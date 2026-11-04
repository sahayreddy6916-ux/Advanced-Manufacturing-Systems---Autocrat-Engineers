import pg from 'pg';
import dotenv from 'dotenv';
import saleOrdersSeed from '../seed/saleOrdersSeed.js';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'AE_WebApp',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool] Unexpected client error:', err.message);
});

export async function initRDBMS() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS planners (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS make_to_inventory (
        id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        work_order_no VARCHAR(50),
        job_card_no   VARCHAR(50),
        to_unit       VARCHAR(50),
        op_item_code  VARCHAR(50),
        op_item_name  VARCHAR(255),
        bp_code       VARCHAR(50),
        bp_name       VARCHAR(255),
        process_type  VARCHAR(100),
        target_whs    VARCHAR(50),
        fg_item_code  VARCHAR(50),
        doc_no        VARCHAR(50),
        doc_date      DATE,
        planned_qty   NUMERIC(12,2)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.stock_allocated_table (
        id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        document_number     VARCHAR(50),
        doc_date            DATE,
        jobcard_number      VARCHAR(50),
        workorder_number    VARCHAR(50),
        process_type        VARCHAR(100),
        bp_code             VARCHAR(50),
        bp_name             VARCHAR(255),
        fg_item_code        VARCHAR(50),
        fg_item_name        VARCHAR(255),
        operation_item      VARCHAR(255),
        operation_item_name VARCHAR(255),
        planned_qty         NUMERIC(12,4),
        item_code           VARCHAR(50),
        item_name           VARCHAR(255),
        batch_no            VARCHAR(50),
        allocation_qty      NUMERIC(12,4),
        allocation_type     VARCHAR(50),
        from_unit           VARCHAR(50),
        from_whs            VARCHAR(50),
        to_unit             VARCHAR(50),
        to_whs              VARCHAR(50),
        remarks             TEXT,
        status              TEXT NOT NULL DEFAULT 'Released',
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Upgrade the existing table in place so older installations retain their rows.
    const stockAllocationColumns = [
      ['doc_date', 'DATE'],
      ['fg_item_code', 'VARCHAR(50)'],
      ['fg_item_name', 'VARCHAR(255)'],
      ['operation_item_name', 'VARCHAR(255)'],
      ['planned_qty', 'NUMERIC(12,4)'],
      ['item_code', 'VARCHAR(50)'],
      ['item_name', 'VARCHAR(255)'],
      ['batch_no', 'VARCHAR(50)'],
      ['allocation_qty', 'NUMERIC(12,4)'],
      ['allocation_type', 'VARCHAR(50)'],
      ['from_unit', 'VARCHAR(50)'],
      ['from_whs', 'VARCHAR(50)'],
      ['to_whs', 'VARCHAR(50)'],
      ['remarks', 'TEXT'],
      ['status', "TEXT NOT NULL DEFAULT 'Released'"],
      ['created_at', 'TIMESTAMPTZ NOT NULL DEFAULT NOW()'],
    ];
    for (const [name, type] of stockAllocationColumns) {
      await client.query(`ALTER TABLE public.stock_allocated_table ADD COLUMN IF NOT EXISTS ${name} ${type}`);
    }
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_allocated_created_at ON public.stock_allocated_table (created_at DESC, id DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_allocated_order_jobcard ON public.stock_allocated_table (workorder_number, jobcard_number)`);

    for (const [table, orderCol] of [
      ['update_salerouting', 'work_order_no'],
      ['update_stockrouting', 'stock_order_no'],
    ]) {
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS public.${table} (
            id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            ${orderCol}   VARCHAR(50)
          );
        `);
        // The table may already exist with an older layout: CREATE TABLE IF NOT EXISTS
        // leaves it untouched, so the order-number column must be added explicitly.
        await client.query(`ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${orderCol} VARCHAR(50)`);

        const cols = [
          ['fg_item_code', 'VARCHAR(50)'],
          ['job_card_no', 'VARCHAR(80)'],
          ['op_item_code', 'VARCHAR(80)'],
          ['op_item_name', 'VARCHAR(255)'],
          ['operation_name', 'VARCHAR(255)'],
          ['process_type', 'VARCHAR(50)'],
          ['unit', 'VARCHAR(50)'],
          ['warehouse', 'VARCHAR(50)'],
          ['machine_code', 'VARCHAR(80)'],
          ['machine_name', 'VARCHAR(255)'],
          ['setting_time', 'NUMERIC(12,2)'],
          ['process_time', 'NUMERIC(12,2)'],
          ['total_time', 'NUMERIC(12,2)'],
          ['planned_qty', 'NUMERIC(12,2)'],
          ['start_date', 'TEXT'],
          ['start_time', 'TEXT'],
          ['end_date', 'TEXT'],
          ['end_time', 'TEXT'],
          ['remarks', 'TEXT'],
          ["job_card_status", "VARCHAR(30) DEFAULT ''"],
          ['updated_at', 'TIMESTAMPTZ DEFAULT NOW()'],
        ];
        for (const [name, type] of cols) {
          await client.query(`ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${name} ${type}`);
        }
        // Job cards are blank until released; only the first becomes 'Open'.
        await client.query(`ALTER TABLE public.${table} ALTER COLUMN job_card_status SET DEFAULT ''`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${table}_order ON public.${table} (${orderCol})`);
      } catch (snapshotSetupErr) {
        console.error(`[PostgreSQL] ${table} setup failed:`, snapshotSetupErr.message);
      }
    }
    // Sale orders shown as cards on the Sale Order Management Console.
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.sale_orders (
        id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        so_key            VARCHAR(20) UNIQUE,
        po_number         VARCHAR(50)  NOT NULL,
        customer_name     VARCHAR(255) NOT NULL,
        card_code         VARCHAR(50),
        part_no           VARCHAR(50),
        part_description  VARCHAR(255),
        po_line_id        VARCHAR(20),
        item_type         VARCHAR(50) DEFAULT 'Customer_PO',
        drawing_rev       VARCHAR(20),
        po_date           DATE,
        ship_date         DATE,
        dock_date         DATE,
        quantity          NUMERIC(12,2) NOT NULL DEFAULT 0,
        open_qty          NUMERIC(12,2) NOT NULL DEFAULT 0,
        pending_qty       NUMERIC(12,2) NOT NULL DEFAULT 0,
        mode_of_dispatch  VARCHAR(20),
        logo_src          VARCHAR(255),
        logo_alt          VARCHAR(255),
        logo_width        VARCHAR(30)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sale_orders_po ON public.sale_orders (po_number, customer_name, ship_date)`);

    // Seed once, only when the table is empty (duplicates included).
    const seedCount = await client.query('SELECT COUNT(*)::int AS c FROM public.sale_orders');
    if (seedCount.rows[0].c === 0) {
      const toDate = (d) => {
        if (!d) return null;
        const [dd, mm, yy] = d.split('/');
        return `20${yy}-${mm}-${dd}`;
      };
      for (const s of saleOrdersSeed) {
        await client.query(`
          INSERT INTO public.sale_orders
            (so_key, po_number, customer_name, card_code, part_no, part_description, po_line_id,
             item_type, drawing_rev, po_date, ship_date, dock_date, quantity, open_qty, pending_qty,
             mode_of_dispatch, logo_src, logo_alt, logo_width)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
          ON CONFLICT (so_key) DO NOTHING
        `, [
          s.id, s.poNumber, s.customerName, s.cardCode, s.partNo, s.partDescription, s.poLineId,
          s.itemType, s.drawingRev, toDate(s.poDate), toDate(s.shipDate), toDate(s.dockDate),
          s.quantity, s.openQty, s.pendingQty, s.modeOfDispatch, s.logoSrc, s.logoAlt, s.logoWidth,
        ]);
      }
      console.log(`[PostgreSQL] Seeded ${saleOrdersSeed.length} rows into sale_orders`);
    }

    console.log('[PostgreSQL] Schema initialised — planners, make_to_inventory, stock_allocated_table, update_salerouting, update_stockrouting, sale_orders ready in AE_WebApp.');
  } finally {
    client.release();
  }
}

export async function pingRDBMS() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT version()');
    return { connected: true, version: result.rows[0].version };
  } catch (err) {
    return { connected: false, error: err.message };
  } finally {
    client.release();
  }
}

export default pool;