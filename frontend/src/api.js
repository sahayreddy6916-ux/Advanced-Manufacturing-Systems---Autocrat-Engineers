const API_BASE = '/api';

// =============================================================================
// Work Order CRUD
// =============================================================================

export async function fetchFGItemsRDBMS() {
  try {
    const res = await fetch(`${API_BASE}/fg-items`);

    if (!res.ok) {
      const errorBody = await res.text();
      console.warn('FG items fetch failed (table may not exist):', {
        status: res.status,
        response: errorBody,
      });
      return [];
    }

    return await res.json();
  } catch (err) {
    console.warn('Database fetch error (fg-items) - continuing without master list:', err);
    return [];
  }
}

export async function fetchPlannersRDBMS() {
  try {
    const res = await fetch(`${API_BASE}/planners`);

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('Planners fetch failed:', {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });

      throw new Error(
        `Failed to fetch planners (${res.status} ${res.statusText}): ${errorBody || 'No error details returned by server'
        }`
      );
    }

    return await res.json();
  } catch (err) {
    console.error('Database fetch error (planners):', err);
    return [];
  }
}

export async function fetchWorkOrdersRDBMS() {
  try {
    const res = await fetch(`${API_BASE}/work-orders`);

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('Work orders fetch failed:', {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });

      throw new Error(
        `Failed to fetch work orders (${res.status} ${res.statusText}): ${errorBody || 'No error details returned by server'
        }`
      );
    }

    const data = await res.json();

    return (Array.isArray(data) ? data : []).map((order) => ({
      ...order,

      status:
        order.status ??
        order.workOrderStatus ??
        order.work_order_status ??
        order.state ??
        'Planned',

      createDate:
        order.createDate ??
        order.createdAt ??
        order.created_at ??
        order.create_date ??
        order.workOrderDate ??
        order.work_order_date ??
        '',

      createdAt:
        order.createdAt ??
        order.created_at ??
        order.createDate ??
        order.create_date ??
        '',

      updatedAt:
        order.updatedAt ??
        order.updated_at ??
        order.updatedDate ??
        order.updated_date ??
        order.modifiedAt ??
        order.modified_at ??
        order.lastUpdated ??
        order.last_updated ??
        '',
    }));
  } catch (err) {
    console.error('Database fetch error (work-orders):', err);
    return [];
  }
}

// -----------------------------------------------------------------------------
// Next work order number: WO-1, WO-2, WO-3, ...
// The number comes from a PostgreSQL SEQUENCE on the server, so it never goes
// backwards and is never reused, even after a work order is deleted.
// Returns null if the server could not provide a number.
// -----------------------------------------------------------------------------
export async function getNextWorkOrderNo() {
  // 1) Preferred: dedicated server route (POST /api/work-orders/next-number)
  try {
    const res = await fetch(`${API_BASE}/work-orders/next-number`, {
      method: 'POST',
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.workOrderNo) return String(data.workOrderNo);
    } else {
      console.warn(
        `next-number route returned ${res.status}; falling back to the SQL endpoint.`
      );
    }
  } catch (err) {
    console.warn('next-number route unreachable; falling back to the SQL endpoint.', err);
  }

  // 2) Fallback: use the existing /api/RDBMS/query endpoint with a PostgreSQL
  //    sequence. A sequence never repeats a number, even after deletions.
  try {
    // Create the sequence once (does nothing if it already exists).
    await executeSQLQuery(
      'CREATE SEQUENCE IF NOT EXISTS work_order_no_seq START 1'
    );

    const result = await executeSQLQuery(
      "SELECT nextval('work_order_no_seq') AS n"
    );

    if (!result || result.type === 'ERROR' || result.error) {
      console.error('Next work order number (SQL fallback) failed:', result);
      return null;
    }

    const rows = result.rows ?? result.data ?? result.result?.rows ?? [];
    const first = Array.isArray(rows) ? rows[0] : null;

    const raw = Array.isArray(first)
      ? first[0]
      : first && typeof first === 'object'
        ? (first.n ?? first.nextval ?? Object.values(first)[0])
        : first;

    const digits = String(raw ?? '').replace(/\D/g, '');

    if (!digits) {
      console.error('Next work order number: unexpected SQL result shape:', result);
      return null;
    }

    return `WO-${parseInt(digits, 10)}`;
  } catch (err) {
    console.error('Next work order number error:', err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Next stock order number: WO-ST-1, WO-ST-2, WO-ST-3, ...
// Uses its own PostgreSQL sequence (stock_order_no_seq), so numbers are never
// reused, even after a stock order is deleted. Returns null on failure.
// -----------------------------------------------------------------------------
export async function getNextStockOrderNo() {
  // 1) Preferred: dedicated server route (optional)
  try {
    const res = await fetch(`${API_BASE}/stock-order-planning/next-number`, {
      method: 'POST',
    });

    if (res.ok) {
      const data = await res.json();
      const value = data?.stockOrderNo ?? data?.workOrderNo;
      if (value) return String(value);
    }
  } catch {
    // fall through to the SQL fallback
  }

  // 2) Fallback: existing /api/RDBMS/query endpoint with a sequence
  try {
    await executeSQLQuery(
      'CREATE SEQUENCE IF NOT EXISTS stock_order_no_seq START 1'
    );

    const result = await executeSQLQuery(
      "SELECT nextval('stock_order_no_seq') AS n"
    );

    if (!result || result.type === 'ERROR' || result.error) {
      console.error('Next stock order number (SQL fallback) failed:', result);
      return null;
    }

    const rows = result.rows ?? result.data ?? result.result?.rows ?? [];
    const first = Array.isArray(rows) ? rows[0] : null;

    const raw = Array.isArray(first)
      ? first[0]
      : first && typeof first === 'object'
        ? (first.n ?? first.nextval ?? Object.values(first)[0])
        : first;

    const digits = String(raw ?? '').replace(/\D/g, '');

    if (!digits) {
      console.error('Next stock order number: unexpected SQL result shape:', result);
      return null;
    }

    return `WO-ST-${parseInt(digits, 10)}`;
  } catch (err) {
    console.error('Next stock order number error:', err);
    return null;
  }
}

export async function fetchWorkOrderDetailsRDBMS(woNo) {
  try {
    const res = await fetch(
      `${API_BASE}/work-orders/${encodeURIComponent(woNo)}`
    );

    if (!res.ok) {
      const errorBody = await res.text();

      console.error(`Work-order details fetch failed (${woNo}):`, {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });

      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`Database fetch error (work-orders/${woNo}):`, err);
    return null;
  }
}

export async function saveWorkOrderRDBMS(wo, isNew) {
  try {
    const method = isNew ? 'POST' : 'PUT';

    const url = isNew
      ? `${API_BASE}/work-orders`
      : `${API_BASE}/work-orders/${encodeURIComponent(wo.workOrderNo)}`;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wo),
    });

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('Work-order save failed:', {
        status: res.status,
        statusText: res.statusText,
        method,
        url,
        response: errorBody,
        payload: wo,
      });

      return false;
    }

    return true;
  } catch (err) {
    console.error('Database save error (work-order):', err);
    return false;
  }
}

export async function deleteWorkOrderRDBMS(woNo) {
  try {
    const res = await fetch(
      `${API_BASE}/work-orders/${encodeURIComponent(woNo)}`,
      { method: 'DELETE' }
    );

    if (!res.ok) {
      const errorBody = await res.text();

      console.error(`Work-order delete failed (${woNo}):`, {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });
    }

    return res.ok;
  } catch (err) {
    console.error(`Database delete error (${woNo}):`, err);
    return false;
  }
}

export async function cancelWorkOrderRDBMS(woNo) {
  try {
    const res = await fetch(
      `${API_BASE}/work-orders/${encodeURIComponent(woNo)}/cancel`,
      { method: 'PUT' }
    );

    if (!res.ok) {
      const errorBody = await res.text();

      console.error(`Cancel Work Order failed (${woNo}):`, {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });
    }

    return res.ok;
  } catch (err) {
    console.error('Cancel Work Order Error:', err);
    return false;
  }
}

// =============================================================================
// Routing Steps
// =============================================================================

export async function fetchRoutingStepsRDBMS(workOrderNo, fgItemCode) {
  try {
    const query = new URLSearchParams();

    if (workOrderNo) query.append('workOrderNo', workOrderNo);
    if (fgItemCode) query.append('fgItemCode', fgItemCode);

    const res = await fetch(`${API_BASE}/routing?${query.toString()}`);

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('Routing fetch failed:', {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });

      return [];
    }

    const data = await res.json();

    return (Array.isArray(data) ? data : []).map((route) => ({
      ...route,

      routingStepId:
        route.routingStepId ??
        route.routing_step_id ??
        (route.id != null ? Number(route.id) : undefined),

      bomOperationId: route.bomOperationId ?? route.bom_operation_id,

      sequence: route.sequence ?? route.sequenceNo ?? route.sequence_no,

      operation:
        route.operation ?? route.operationName ?? route.operation_name ?? '',

      operationName:
        route.operationName ?? route.operation_name ?? route.operation ?? '',

      fgItemCode: route.fgItemCode ?? route.fg_item_code ?? fgItemCode ?? '',

      fgItemName: route.fgItemName ?? route.fg_item_name ?? '',

      opItemCode: route.opItemCode ?? route.op_item_code ?? '',

      opItemName: route.opItemName ?? route.op_item_name ?? '',

      workOrderNo: route.workOrderNo ?? route.work_order_no ?? workOrderNo ?? '',

      plannedQty: Number(route.plannedQty ?? route.planned_qty ?? 0),

      processTimePerUnitMins: Number(
        route.processTimePerUnitMins ??
        route.process_time_per_unit_mins ??
        route.cycleTimeMinutes ??
        route.cycle_time_minutes ??
        0
      ),

      cycleTimeMinutes: Number(
        route.cycleTimeMinutes ??
        route.cycle_time_minutes ??
        route.processTimePerUnitMins ??
        route.process_time_per_unit_mins ??
        0
      ),

      settingTimeMinutes: Number(
        route.settingTimeMinutes ??
        route.setting_time_minutes ??
        route.setting_time ??
        0
      ),

      totalTimeMinutes: Number(route.totalTimeMinutes ?? route.total_time_minutes ?? 0),

      startDate: route.startDate ?? route.start_date ?? '',
      startTime: route.startTime ?? route.start_time ?? '',
      endDate: route.endDate ?? route.end_date ?? '',
      endTime: route.endTime ?? route.end_time ?? '',

      processType: route.processType ?? route.process_type ?? '',
      unit: route.unit ?? '',
      warehouse: route.warehouse ?? '',

      machineId: route.machineId ?? route.machine_id ?? '',

      plannedMachineCode:
        route.plannedMachineCode ?? route.planned_machine_code ?? '',

      plannedMachineName:
        route.plannedMachineName ?? route.planned_machine_name ?? '',

      assignedOperator: route.assignedOperator ?? route.assigned_operator ?? '',

      jobCardNo: route.jobCardNo ?? route.job_card_no ?? '',

      jobCardStatus: route.jobCardStatus ?? route.job_card_status ?? '',

      remarks: route.remarks ?? '',
    }));
  } catch (err) {
    console.error('Database fetch error (routing):', err);
    return [];
  }
}

export async function addRoutingStepRDBMS(step, workOrderNo, fgItemCode) {
  try {
    const res = await fetch(`${API_BASE}/routing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...step,
        workOrderNo,
        fgItemCode,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('Routing insert failed:', {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });
    }

    return res.ok;
  } catch (err) {
    console.error('Database save error (routing step):', err);
    return false;
  }
}

export async function saveRoutingStepsRDBMS(routes, workOrderNo, fgItemCode) {
  try {
    const payloadRoutes = routes.map((route) => ({
      ...route,

      routingStepId: route.routingStepId ?? (route.id ? Number(route.id) : null),
      routing_step_id: route.routingStepId ?? (route.id ? Number(route.id) : null),

      bomOperationId: route.bomOperationId ?? null,
      bom_operation_id: route.bomOperationId ?? null,

      workOrderNo,
      work_order_no: workOrderNo,

      fgItemCode: route.fgItemCode ?? fgItemCode ?? '',
      fg_item_code: route.fgItemCode ?? fgItemCode ?? '',

      operation: route.operation ?? route.operationName ?? '',
      operationName: route.operationName ?? route.operation ?? '',
      operation_name: route.operationName ?? route.operation ?? '',

      plannedQty: Number(route.plannedQty ?? 0),
      planned_qty: Number(route.plannedQty ?? 0),

      processTimePerUnitMins: Number(
        route.processTimePerUnitMins ?? route.cycleTimeMinutes ?? 0
      ),
      process_time_per_unit_mins: Number(
        route.processTimePerUnitMins ?? route.cycleTimeMinutes ?? 0
      ),

      cycleTimeMinutes: Number(
        route.cycleTimeMinutes ?? route.processTimePerUnitMins ?? 0
      ),
      cycle_time_minutes: Number(
        route.cycleTimeMinutes ?? route.processTimePerUnitMins ?? 0
      ),

      settingTimeMinutes: Number(route.settingTimeMinutes ?? 0),
      setting_time_minutes: Number(route.settingTimeMinutes ?? 0),

      totalTimeMinutes: Number(route.totalTimeMinutes ?? 0),
      total_time_minutes: Number(route.totalTimeMinutes ?? 0),

      startDate: route.startDate || null,
      start_date: route.startDate || null,
      startTime: route.startTime || null,
      start_time: route.startTime || null,
      endDate: route.endDate || null,
      end_date: route.endDate || null,
      endTime: route.endTime || null,
      end_time: route.endTime || null,

      processType: route.processType ?? '',
      process_type: route.processType ?? '',

      machineId: route.machineId ?? '',
      machine_id: route.machineId ?? '',

      plannedMachineCode: route.plannedMachineCode ?? '',
      planned_machine_code: route.plannedMachineCode ?? '',

      plannedMachineName: route.plannedMachineName ?? '',
      planned_machine_name: route.plannedMachineName ?? '',

      assignedOperator: route.assignedOperator ?? '',
      assigned_operator: route.assignedOperator ?? '',

      jobCardNo: route.jobCardNo ?? '',
      job_card_no: route.jobCardNo ?? '',

      jobCardStatus: route.jobCardStatus ?? '',
      job_card_status: route.jobCardStatus ?? '',
    }));

    const res = await fetch(
      `${API_BASE}/routing/work-order/${encodeURIComponent(workOrderNo)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderNo,
          fgItemCode,
          routes: payloadRoutes,
        }),
      }
    );

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('Routing PostgreSQL update failed:', {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
        workOrderNo,
        fgItemCode,
      });

      return false;
    }

    return true;
  } catch (err) {
    console.error('Database save error (routing cards):', err);
    return false;
  }
}

export async function deleteRoutingStepRDBMS(id) {
  try {
    const res = await fetch(`${API_BASE}/routing/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('Routing delete failed:', {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });
    }

    return res.ok;
  } catch (err) {
    console.error('Database delete error (routing step):', err);
    return false;
  }
}

// =============================================================================
// Allocated Materials
// =============================================================================

export async function fetchAllocatedMaterialsRDBMS(workOrderNo, fgItemCode) {
  try {
    const query = new URLSearchParams();

    if (workOrderNo) query.append('workOrderNo', workOrderNo);
    if (fgItemCode) query.append('fgItemCode', fgItemCode);

    const res = await fetch(`${API_BASE}/materials?${query.toString()}`);

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('Materials fetch failed:', {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });

      throw new Error(
        `Failed to fetch allocated materials (${res.status} ${res.statusText})`
      );
    }

    return await res.json();
  } catch (err) {
    console.error('Database fetch error (materials):', err);
    return [];
  }
}

// =============================================================================
// RDBMS Explorer — API Helpers
// =============================================================================

export async function fetchRDBMSConnection() {
  try {
    const res = await fetch(`${API_BASE}/RDBMS/connection`);

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('RDBMS connection check failed:', {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });

      throw new Error(
        `Connection check failed (${res.status} ${res.statusText})`
      );
    }

    return await res.json();
  } catch (err) {
    console.error('RDBMS connection error:', err);

    return {
      connected: false,
      error: err?.message || 'Cannot reach API server',
    };
  }
}

export async function fetchRDBMSTables() {
  try {
    const res = await fetch(`${API_BASE}/RDBMS/tables`);

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('RDBMS tables fetch failed:', {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });

      throw new Error(
        `Failed to fetch RDBMS tables list (${res.status} ${res.statusText})`
      );
    }

    return await res.json();
  } catch (err) {
    console.error('Database fetch error (RDBMS/tables):', err);
    return [];
  }
}

export async function fetchTableData(tableName) {
  const url = `${API_BASE}/RDBMS/table/${encodeURIComponent(tableName)}`;

  try {
    console.log(`Fetching RDBMS table "${tableName}"...`, url);

    const res = await fetch(url);

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('RDBMS table fetch failed:', {
        tableName,
        url,
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });

      throw new Error(
        `Failed to fetch table data (${res.status} ${res.statusText}): ${errorBody || 'No error details returned by server'
        }`
      );
    }

    const data = await res.json();

    console.log(`RDBMS table "${tableName}" fetched successfully:`, {
      columns: Array.isArray(data?.columns) ? data.columns.length : 0,
      rows: Array.isArray(data?.rows) ? data.rows.length : 0,
    });

    return data;
  } catch (err) {
    console.error(`Database fetch error (RDBMS/table/${tableName}):`, err);
    return null;
  }
}

export async function fetchSORecordsRDBMS() {
  try {
    const result = await fetchTableData('so_table');

    return Array.isArray(result?.rows) ? result.rows : [];
  } catch (err) {
    console.error('Database fetch error (so_table):', err);
    return [];
  }
}

// =============================================================================
// SQL Query
// =============================================================================

export async function executeSQLQuery(sql) {
  try {
    const res = await fetch(`${API_BASE}/RDBMS/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });

    const responseText = await res.text();

    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = {
        type: 'ERROR',
        error: responseText || 'Invalid server response',
      };
    }

    if (data?.type === 'ERROR' || data?.error || !res.ok) {
      console.error('Query execution error:', {
        sql,
        status: res.status,
        statusText: res.statusText,
        response: data,
      });
    }

    return data;
  } catch (err) {
    console.error('Database query error:', err);

    return {
      type: 'ERROR',
      error: err instanceof Error ? err.message : 'Unknown database error',
    };
  }
}

export async function truncateTableRDBMS(tableName) {
  try {
    const res = await fetch(
      `${API_BASE}/RDBMS/table/${encodeURIComponent(tableName)}/truncate`,
      { method: 'DELETE' }
    );

    const responseText = await res.text();

    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { error: responseText || 'Invalid server response' };
    }

    if (!res.ok) {
      console.error('RDBMS truncate failed:', {
        tableName,
        status: res.status,
        statusText: res.statusText,
        response: data,
      });

      return {
        error:
          data?.error ||
          data?.message ||
          `HTTP ${res.status} ${res.statusText}`,
      };
    }

    return data;
  } catch (err) {
    console.error('RDBMS truncate error:', err);

    return { error: err?.message || 'Truncate error' };
  }
}

// =============================================================================
// Insert Table Row
// =============================================================================

export async function insertTableRowRDBMS(tableName, rowData) {
  try {
    const res = await fetch(
      `${API_BASE}/RDBMS/table/${encodeURIComponent(tableName)}/insert`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowData),
      }
    );

    const responseText = await res.text();

    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { error: responseText || 'Invalid server response' };
    }

    if (!res.ok) {
      console.error('RDBMS table insert failed:', {
        tableName,
        status: res.status,
        statusText: res.statusText,
        response: data,
        rowData,
      });

      return {
        error:
          data?.error ||
          data?.message ||
          `HTTP ${res.status} ${res.statusText}`,
      };
    }

    return data;
  } catch (err) {
    console.error('RDBMS table insert error:', err);

    return { error: err?.message || 'Insert error' };
  }
}

// =============================================================================
// Dashboard
// =============================================================================

export async function fetchDashboardRDBMS() {
  try {
    const res = await fetch(`${API_BASE}/dashboard`);

    if (!res.ok) {
      const errorBody = await res.text();

      console.error('Dashboard fetch failed:', {
        status: res.status,
        statusText: res.statusText,
        response: errorBody,
      });

      throw new Error(
        `Failed to fetch dashboard (${res.status} ${res.statusText})`
      );
    }

    return await res.json();
  } catch (err) {
    console.error('Database fetch error (dashboard):', err);

    return {
      totalWorkOrders: 0,
      status: [],
      orderType: [],
      unit: [],
    };
  }
}

// =============================================================================
// Stock Order Planning (additive — does not change helpers above)
// Tables: item_masterstock, createstock_list, planning_stockblueprints, routing_stocks
// =============================================================================

/** FG items from item_masterstock → code, name, revision, fgQuantity */
export async function fetchStockFgItemsRDBMS(search = '') {
  try {
    // The backend exposes the DB.js item_master mapping at /api/fg-items.
    // Do not call /api/stock-order-planning/fg-items because that route is not
    // registered by the current Express server and returns 404/empty results.
    const res = await fetch(`${API_BASE}/fg-items`);

    if (!res.ok) {
      console.warn('FG items fetch failed:', res.status, await res.text());
      return [];
    }

    const data = await res.json();
    const query = String(search || '').trim().toLowerCase();

    return (Array.isArray(data) ? data : [])
      .map((item) => ({
        code: String(item.code ?? item.fg_item_code ?? '').trim(),
        name: String(item.name ?? item.fg_item_name ?? '').trim(),
        revision: item.revision ?? item.drawingRevision ?? item.drawing_rev ?? item.drawingRev ?? '',
        fgQuantity: Number(item.fgQuantity ?? item.fg_quantity ?? item.defaultQty ?? 0),
      }))
      .filter((item) =>
        !query ||
        item.code.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query)
      )
      .slice(0, 50);
  } catch (err) {
    console.warn('FG items error:', err);
    return [];
  }
}


export async function fetchStockOrdersRDBMS({ status, unit, search } = {}) {
  try {
    const params = new URLSearchParams();

    if (status) params.set('status', status);
    if (unit) params.set('unit', unit);
    if (search) params.set('search', search);

    const qs = params.toString() ? `?${params}` : '';
    const res = await fetch(
      `${API_BASE}/stock-order-planning/stock-orders${qs}`
    );

    if (!res.ok) {
      console.error('Stock orders fetch failed:', res.status, await res.text());
      return [];
    }

    const data = await res.json();

    return (Array.isArray(data) ? data : []).map((o) => ({
      // Existing fields
      number: o.number ?? o.stock_order_no ?? '',
      created: o.created ?? o.creation_date ?? '',
      itemCode: o.itemCode ?? o.item_code ?? '',
      itemDescription: o.itemDescription ?? o.item_description ?? '',
      plannedQty: Number(o.plannedQty ?? o.planned_qty ?? 0),
      orderType: o.orderType ?? o.order_type ?? '',
      unit: o.unit ?? '',
      status: o.status ?? 'Draft',

      // Additional planning fields
      drawingRevision:
        o.drawingRevision ??
        o.drawing_revision ??
        o.drawingRevisionNo ??
        '',

      fgQuantity:
        o.fgQuantity ??
        o.fg_quantity ??
        '',

      completionDate:
        o.completionDate ??
        o.completion_date ??
        '',

      planner:
        o.planner ??
        o.selectPlanner ??
        o.select_planner ??
        '',

      priority: o.priority ?? '',
      remarks: o.remarks ?? '',

      // FIX: keep saved routing edits so a Released order reopens with them
      routingChanges: o.routingChanges ?? o.routing_changes ?? null,
    }));
  } catch (err) {
    console.error('Stock orders error:', err);
    return [];
  }
}

export async function saveStockPlanningRDBMS(payload) {
  try {
    const res = await fetch(`${API_BASE}/stock-order-planning/planning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('Stock planning save failed:', res.status, await res.text());
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Stock planning save error:', err);
    return null;
  }
}

export async function fetchStockRoutingRDBMS(fgItemCode) {
  try {
    const res = await fetch(
      `${API_BASE}/stock-order-planning/routing/${encodeURIComponent(fgItemCode)}`
    );

    if (!res.ok) {
      console.error('Stock routing fetch failed:', res.status, await res.text());
      return [];
    }

    const data = await res.json();

    return (Array.isArray(data) ? data : []).map((r, i) => ({
      code: r.code ?? r.item_code ?? '',
      subtitle: r.subtitle ?? r.item_name ?? '',
      operation: r.operation ?? r.bom_operation ?? '',
      machineCode: r.machineCode ?? r.machine_code ?? '',
      machineName: r.machineName ?? r.machine_name ?? '',
      qty: Number(r.qty ?? r.plannedQty ?? 0),
      jobCard:
        r.jobCard ??
        r.job_card ??
        `${fgItemCode}-${String(i + 1).padStart(2, '0')}`,
    }));
  } catch (err) {
    console.error('Stock routing error:', err);
    return [];
  }
}
// Permanently delete one Stock Order Planning record.
export async function deleteStockOrderRDBMS(stockOrderNo) {
  try {
    const value = String(stockOrderNo || '').trim();
    if (!value) return false;

    const res = await fetch(
      `${API_BASE}/stock-order-planning/stock-orders/${encodeURIComponent(value)}`,
      { method: 'DELETE' }
    );

    if (!res.ok) {
      console.error('Stock order delete failed:', res.status, await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error('Stock order delete error:', err);
    return false;
  }
}