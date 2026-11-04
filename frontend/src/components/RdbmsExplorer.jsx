import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  Table as TableIcon,
  Search,
  Play,
  Terminal,
  RefreshCw,
  Key,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Layers,
  Server,
  Wifi,
  WifiOff,
  Activity,
  Lock,
} from 'lucide-react';
import {
  fetchRDBMSConnection,
  fetchRDBMSTables,
  fetchTableData,
  executeSQLQuery,
  truncateTableRDBMS,
  insertTableRowRDBMS,
} from '../api';

export default function RDBMSExplorer() {

  // Connection
  const [connInfo, setConnInfo] = useState(null);
  const [connLoading, setConnLoading] = useState(true);

  // Tables
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('sale_order');
  const [tableDetails, setTableDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  // SQL Console
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM work_orders LIMIT 10;');
  const [queryResult, setQueryResult] = useState(null);
  const [executing, setExecuting] = useState(false);
  // Tabs
  const [activeTab, setActiveTab] = useState('data');

  // Truncate modal
  const [showTruncateConfirm, setShowTruncateConfirm] = useState(false);
  const [truncating, setTruncating] = useState(false);
  // Insert form
  const [insertValues, setInsertValues] = useState({});
  const [inserting, setInserting] = useState(false);
  // Toast
  const [toast, setToast] = useState(null);
  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const loadConnection = useCallback(async () => {
    setConnLoading(true);
    const info = await fetchRDBMSConnection();
    setConnInfo(info);
    setConnLoading(false);
  }, []);

  const loadTables = useCallback(async () => {
    setLoading(true);
    const data = await fetchRDBMSTables();
    setTables(data);
    setLoading(false);
  }, []);

  const loadCurrentTableData = useCallback(async (tableName) => {
    const data = await fetchTableData(tableName);
    if (data) {
      setTableDetails({ columns: data.columns, rows: data.rows });
      const blank = {};
      data.columns.forEach(col => { blank[col.name] = ''; });
      setInsertValues(blank);
    }
  }, []);

  useEffect(() => {
    loadConnection();
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadCurrentTableData(selectedTable);
      setSqlQuery(`SELECT * FROM "${selectedTable}" LIMIT 20;`);
      setActiveTab('data');
    }
  }, [selectedTable]);

  // ── Action Handlers ───────────────────────────────────────────────────────
  const handleRunSQL = async () => {
    if (!sqlQuery.trim()) return;
    setExecuting(true);
    const res = await executeSQLQuery(sqlQuery);
    setQueryResult(res);
    setExecuting(false);
    setActiveTab('console');
    loadTables();
    if (selectedTable) loadCurrentTableData(selectedTable);
  };

  const handleTruncate = async () => {
    setTruncating(true);
    const result = await truncateTableRDBMS(selectedTable);
    setTruncating(false);
    setShowTruncateConfirm(false);
    if (result.error) {
      showToast('error', `Clear failed: ${result.error}`);
    } else {
      showToast('success', `✓ "${selectedTable}" cleared — ${result.changes ?? 0} row(s) deleted.`);
      loadTables();
      loadCurrentTableData(selectedTable);
    }
  };
  const handleInsertRow = async () => {
    const payload = {};
    tableDetails?.columns.forEach(col => {
      const val = insertValues[col.name];
      if (val !== undefined && val !== '') {
        const t = col.type.toLowerCase();
        if (t === 'int4' || t === 'int8' || t === 'integer' || t === 'int2') {
          payload[col.name] = parseInt(val, 10);
        } else if (t === 'float4' || f === 'float8' || t === 'numeric') {
          payload[col.name] = parseFloat(val);
        } else {
          payload[col.name] = val;
        }
      }
    });

    if (Object.keys(payload).length === 0) {
      showToast('error', 'Please fill at least one field before inserting.');
      return;
    }

    setInserting(true);
    const result = await insertTableRowRDBMS(selectedTable, payload);
    setInserting(false);

    if (result.error) {
      showToast('error', `Insert failed: ${result.error}`);
    } else {
      showToast('success', `✓ Row inserted successfully into "${selectedTable}".`);
      const blank = {};
      tableDetails?.columns.forEach(col => { blank[col.name] = ''; });
      setInsertValues(blank);
      loadTables();
      loadCurrentTableData(selectedTable);
      setActiveTab('data');
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const filteredRows = tableDetails?.rows.filter(row => {
    if (!searchFilter.trim()) return true;
    return Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchFilter.toLowerCase())
    );
  }) || [];

  const totalRecordsCount = tables.reduce((acc, t) => acc + t.rowCount, 0);
  const isConnected = connInfo?.connected === true;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5" id="RDBMS-explorer-container">

      {/* ── Inline Toast ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-5 right-5 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border ${toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
          >
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Truncate Confirmation Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showTruncateConfirm && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-7 max-w-md w-full mx-4 border border-rose-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Clear All Table Data?</h3>
                  <p className="text-xs text-slate-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                All rows in{' '}
                <code className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                  {selectedTable}
                </code>{' '}
                will be permanently deleted. The table schema remains intact.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowTruncateConfirm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTruncate}
                  disabled={truncating}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Trash2 className={`w-4 h-4 ${truncating ? 'animate-spin' : ''}`} />
                  {truncating ? 'Clearing...' : 'Yes, Clear Table'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PostgreSQL Connection Status Banner ────────────────────────── */}
      <div className={`rounded-2xl border shadow-md overflow-hidden ${isConnected ? 'bg-slate-900 border-slate-800' : 'bg-rose-950 border-rose-900'
        }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isConnected
              ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
              : 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
              }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  RDBMS Database Explorer &amp; SQL Console
                </h2>
                {connLoading ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    Connecting…
                  </span>
                ) : isConnected ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    PostgreSQL Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <WifiOff className="w-2.5 h-2.5" />
                    Connection Failed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live inspection of <strong className="text-slate-200 font-mono">{connInfo?.database || 'AE_WebApp'}</strong> — view tables, insert rows &amp; run SQL queries
              </p>
            </div>
          </div>

          <button
            onClick={() => { loadConnection(); loadTables(); }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Tables
          </button>
        </div>

        {/* Error message if not connected */}
        {!connLoading && !isConnected && (
          <div className="px-6 py-3 border-t border-rose-900 bg-rose-950/50 flex items-center gap-2 text-xs text-rose-300">
            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              <strong>Connection error:</strong> {connInfo?.error || 'Could not connect to PostgreSQL.'}{' '}
              — Check your <code className="font-mono bg-rose-900/40 px-1 rounded">.env</code> file and ensure PostgreSQL is running.
            </span>
          </div>
        )}
      </div>

      {/* ── Quick Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">DATABASE STORAGE</span>
          <span className="text-sm font-extrabold mt-1 block font-mono text-slate-800">{connInfo?.database || 'AE_WebApp'}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL TABLES</span>
          <span className="text-sm font-extrabold mt-1 block font-mono text-purple-600">{tables.length} Relational Tables</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL DB RECORDS</span>
          <span className="text-sm font-extrabold mt-1 block font-mono text-slate-800">{totalRecordsCount} Rows</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">JOURNAL MODE</span>
          <span className="text-sm font-extrabold mt-1 block font-mono text-sky-600">WAL Mode Active</span>
        </div>
      </div>

      {/* ── Main Layout ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LHS: Tables Navigator */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <TableIcon className="w-4 h-4 text-slate-400" />
            DATABASE TABLES
          </h3>

          {loading ? (
            <div className="text-xs text-slate-400 flex items-center gap-2 py-4">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading tables…
            </div>
          ) : tables.length === 0 ? (
            <div className="text-xs text-slate-400 py-4 text-center">
              {isConnected ? 'No tables found in public schema.' : 'Connect to PostgreSQL to see tables.'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {tables.map(table => (
                <button
                  key={table.name}
                  onClick={() => setSelectedTable(table.name)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer ${selectedTable === table.name
                    ? 'bg-[#6b21a8] text-white font-bold shadow-md shadow-purple-900/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold'
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <TableIcon className="w-4 h-4 shrink-0 opacity-80" />
                    <span className="text-xs font-mono truncate">{table.name}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${selectedTable === table.name ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                    {table.rowCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RHS: Table Inspector */}
        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">

          {/* Sub Nav */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'data', label: 'Data Grid', icon: <Layers className="w-3 h-3" /> },
                { id: 'insert', label: 'Insert Row', icon: <Plus className="w-3 h-3" /> },
                { id: 'schema', label: `Schema (${tableDetails?.columns.length ?? 0} cols)`, icon: <FileCode className="w-3 h-3" /> },
                { id: 'console', label: 'SQL Terminal', icon: <Terminal className="w-3 h-3" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${activeTab === tab.id
                    ? tab.id === 'insert'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'data' && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filter rows…"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
              <button
                onClick={() => setShowTruncateConfirm(true)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                title={`Delete all rows from ${selectedTable}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Table
              </button>
            </div>
          </div>

          {/* ── Data Grid ──────────────────────────────────────────────── */}
          {activeTab === 'data' && (
            <div className="p-6 overflow-x-auto flex-1">
              {!tableDetails || tableDetails.rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <TableIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">Table is empty</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No records in <code className="font-mono">{selectedTable}</code>.
                      Use the <strong>Insert Row</strong> tab or SQL Terminal to add data.
                    </p>
                  </div>
                  {/* Show column headers even when empty */}
                  {tableDetails && tableDetails.columns.length > 0 && (
                    <div className="w-full overflow-x-auto mt-2">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                            {tableDetails.columns.map(col => (
                              <th key={col.name} className="px-4 py-2.5 font-bold font-mono tracking-wide whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  {col.pk === 1 && <Key className="w-3 h-3 text-amber-500 shrink-0" />}
                                  <span>{col.name}</span>
                                  <span className="text-[9px] text-slate-400 font-sans ml-1">({col.type})</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td
                              colSpan={tableDetails.columns.length}
                              className="px-4 py-6 text-center text-xs text-slate-400 italic"
                            >
                              — no rows —
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button
                    onClick={() => setActiveTab('insert')}
                    className="px-5 py-2.5 bg-[#00a86b] hover:bg-[#008f5b] text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Insert First Row
                  </button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      {tableDetails.columns.map(col => (
                        <th key={col.name} className="px-4 py-2.5 text-xs font-bold font-mono tracking-wider whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {col.pk === 1 && <Key className="w-3 h-3 text-amber-500" />}
                            <span>{col.name}</span>
                            <span className="text-[9px] text-slate-400 font-sans ml-0.5">({col.type})</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono">
                    {filteredRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        {tableDetails.columns.map(col => (
                          <td key={col.name} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                            {row[col.name] !== null && row[col.name] !== undefined
                              ? String(row[col.name])
                              : <span className="text-slate-300 italic">NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Insert Row ──────────────────────────────────────────────── */}
          {activeTab === 'insert' && (
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-extrabold text-slate-800">
                  Insert New Row into{' '}
                  <code className="font-mono text-indigo-700">{selectedTable}</code>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Fields left blank are stored as <code className="font-mono">NULL</code>.
                Fields marked <span className="text-rose-500 font-bold">*</span> are NOT NULL.
              </p>

              {tableDetails && tableDetails.columns.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {tableDetails.columns.map(col => (
                      <div key={col.name} className="space-y-1">
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-700">
                          {col.pk === 1 && <Key className="w-3 h-3 text-amber-500" />}
                          <span className="font-mono">{col.name}</span>
                          <span className="text-slate-400 font-normal font-sans">({col.type})</span>
                          {col.notnull === 1 && col.pk !== 1 && (
                            <span className="text-rose-500 font-bold ml-0.5">*</span>
                          )}
                        </label>
                        <input
                          type={
                            ['int4', 'int8', 'int2', 'integer', 'numeric', 'float4', 'float8'].includes(col.type.toLowerCase())
                              ? 'number'
                              : 'text'
                          }
                          placeholder={col.dflt_value ? `default: ${col.dflt_value}` : `Enter ${col.name}…`}
                          value={insertValues[col.name] ?? ''}
                          onChange={e => setInsertValues(prev => ({ ...prev, [col.name]: e.target.value }))}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 placeholder:text-slate-300"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleInsertRow}
                      disabled={inserting}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-60 shadow-md shadow-emerald-600/20"
                    >
                      {inserting
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <Plus className="w-4 h-4" />}
                      {inserting ? 'Inserting…' : 'Insert Row'}
                    </button>
                    <button
                      onClick={() => {
                        const blank = {};
                        tableDetails?.columns.forEach(col => { blank[col.name] = ''; });
                        setInsertValues(blank);
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer"
                    >
                      Clear Form
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 py-8 text-center">No schema available.</p>
              )}
            </div>
          )}

          {/* ── Schema Inspector ──────────────────────────────────────── */}
          {activeTab === 'schema' && (
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="px-4 py-2.5">CID</th>
                    <th className="px-4 py-2.5">Column Name</th>
                    <th className="px-4 py-2.5">PG Type</th>
                    <th className="px-4 py-2.5">Primary Key</th>
                    <th className="px-4 py-2.5">Not Null</th>
                    <th className="px-4 py-2.5">Default</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {tableDetails?.columns.map(col => (
                    <tr key={col.name} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-400">{col.cid}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          {col.pk === 1 && <Key className="w-3 h-3 text-amber-500" />}
                          {col.name}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-indigo-600 font-bold">{col.type}</td>
                      <td className="px-4 py-2.5">
                        {col.pk === 1
                          ? <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">PRIMARY KEY</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {col.notnull === 1
                          ? <span className="text-rose-600 font-bold">YES</span>
                          : 'NO'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {col.dflt_value
                          ? <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{String(col.dflt_value)}</code>
                          : <span className="text-slate-300 italic">NULL</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── SQL Terminal ──────────────────────────────────────────── */}
          {activeTab === 'console' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  PostgreSQL Interactive Console
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: 'Work Orders', sql: `SELECT * FROM work_orders LIMIT 20;` },
                    { label: 'FG Catalog', sql: `SELECT * FROM item_master;` },
                    { label: 'Planners', sql: `SELECT * FROM planners;` },
                    { label: 'Routing', sql: `SELECT * FROM routing_steps;` },
                  ].map(q => (
                    <button
                      key={q.label}
                      onClick={() => setSqlQuery(q.sql)}
                      className="text-[10px] font-mono px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  value={sqlQuery}
                  onChange={e => setSqlQuery(e.target.value)}
                  className="w-full p-4 font-mono text-xs bg-slate-900 text-emerald-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner resize-none"
                  placeholder="SELECT * FROM work_orders WHERE status = 'In Progress';"
                />
                <button
                  onClick={handleRunSQL}
                  disabled={executing}
                  className="absolute bottom-3 right-3 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className={`w-3.5 h-3.5 ${executing ? 'animate-spin' : ''}`} />
                  {executing ? 'Running…' : 'Run SQL'}
                </button>
              </div>

              {/* Result */}
              {queryResult && (
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <span className="text-xs font-bold text-slate-700 block">Execution Output:</span>
                  {queryResult.error ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-mono">
                      PostgreSQL Error: {queryResult.error}
                    </div>
                  ) : queryResult.type === 'SELECT' ? (
                    <div className="overflow-x-auto max-h-64 border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                            {queryResult.columns?.map(col => (
                              <th key={col} className="px-3 py-2 font-bold whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {queryResult.rows?.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              {queryResult.columns?.map(c => (
                                <td key={c} className="px-3 py-1.5 whitespace-nowrap">{String(r[c] ?? 'NULL')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-3 py-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                        {queryResult.count} row(s) returned
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-mono">
                      ✓ Query executed. {queryResult.changes} row(s) affected.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
