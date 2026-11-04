export const MOCK_FG_ITEMS = [
  {
    code: "FG-8092-A1",
    name: "Precision Steel Mounting Bracket",
    type: "Manufactured Parts",
    drawingRev: "Rev 3.2",
    defaultUnit: "PCS",
    defaultOrderType: "For Order (Sales)",
    defaultQty: 150
  },
  {
    code: "FG-4412-B2",
    name: "High-Temp Pressure Control Valve",
    type: "Sub-Assembly",
    drawingRev: "Rev 1.0",
    defaultUnit: "SET",
    defaultOrderType: "For Stock (FG)",
    defaultQty: 45
  },
  {
    code: "FG-7011-C5",
    name: "Microprocessor Embedded Controller",
    type: "Electronics",
    drawingRev: "Rev 2.1-B",
    defaultUnit: "PCS",
    defaultOrderType: "Inter-company",
    defaultQty: 250
  },
  {
    code: "FG-1052-D9",
    name: "Heavy Duty Reinforced Alloy Gearset",
    type: "Manufactured Parts",
    drawingRev: "Rev 4.5",
    defaultUnit: "PCS",
    defaultOrderType: "For Order (Sales)",
    defaultQty: 80
  },
  {
    code: "FG-3022-X7",
    name: "Pneumatic Cylindrical Actuator Hub",
    type: "Pneumatics",
    drawingRev: "Rev 2.0",
    defaultUnit: "SET",
    defaultOrderType: "Export",
    defaultQty: 120
  }
];

export const MOCK_PLANNERS = [
  { id: "P1", name: "Alex Chen (Senior Planner)" },
  { id: "P2", name: "Sarah Jenkins (Production Lead)" },
  { id: "P3", name: "Marcus Vance (Materials Coordinator)" },
  { id: "P4", name: "Elena Rostova (Operations Manager)" }
];

export const MOCK_UNITS = ["Unit-1", "Unit-2", "Unit-3"];
export const MOCK_ORDER_TYPES = ["For Order (Sales)", "For Stock (FG)", "Sample (FA)"];

// Predefined routing steps based on item code to make Page 2 feel reactive and fully integrated
export const ROUTING_TEMPLATES = {
  "FG-8092-A1": [
    { id: "r1", sequence: 10, operation: "Laser Cutting", workCenter: "WC-LASER-01", machineId: "L-CUT-3000", cycleTimeMinutes: 2.5, assignedOperator: "John Davis" },
    { id: "r2", sequence: 20, operation: "CNC Bending", workCenter: "WC-BEND-02", machineId: "B-BEND-120", cycleTimeMinutes: 4.0, assignedOperator: "Markus Aurel" },
    { id: "r3", sequence: 30, operation: "Robotic Welding", workCenter: "WC-WELD-05", machineId: "W-ROBOT-A", cycleTimeMinutes: 5.5, assignedOperator: "Kenji Sato" },
    { id: "r4", sequence: 40, operation: "Powder Coating", workCenter: "WC-PAINT-01", machineId: "P-LINE-04", cycleTimeMinutes: 8.0, assignedOperator: "Clara Oswald" },
    { id: "r5", sequence: 50, operation: "Quality Audit & Pack", workCenter: "WC-QA-01", machineId: "QA-STATION-2", cycleTimeMinutes: 3.0, assignedOperator: "Alex Mercer" }
  ],
  "FG-4412-B2": [
    { id: "r1", sequence: 10, operation: "Alloy Casting Cleanse", workCenter: "WC-CAST-03", machineId: "C-WASH-1", cycleTimeMinutes: 6.0, assignedOperator: "Dave Bautista" },
    { id: "r2", sequence: 20, operation: "Precision Boring", workCenter: "WC-CNC-04", machineId: "CNC-MILL-8", cycleTimeMinutes: 12.5, assignedOperator: "Lisa Su" },
    { id: "r3", sequence: 30, operation: "Valve Sub-Assembly", workCenter: "WC-ASSY-02", machineId: "ASSY-BENCH-5", cycleTimeMinutes: 15.0, assignedOperator: "Tom Holland" },
    { id: "r4", sequence: 40, operation: "Hydrostatic Pressure Test", workCenter: "WC-QA-02", machineId: "H-TEST-09", cycleTimeMinutes: 7.5, assignedOperator: "Steve Rogers" }
  ],
  "FG-7011-C5": [
    { id: "r1", sequence: 10, operation: "PCB Solder Paste Screen", workCenter: "WC-SMT-01", machineId: "SMT-SCREEN-1", cycleTimeMinutes: 1.5, assignedOperator: "Grace Hopper" },
    { id: "r2", sequence: 20, operation: "High-Speed Pick-and-Place", workCenter: "WC-SMT-01", machineId: "SMT-PNP-5", cycleTimeMinutes: 2.2, assignedOperator: "Grace Hopper" },
    { id: "r3", sequence: 30, operation: "Reflow Oven Bake", workCenter: "WC-SMT-01", machineId: "OVEN-REFLOW-2", cycleTimeMinutes: 5.0, assignedOperator: "Alan Turing" },
    { id: "r4", sequence: 40, operation: "Firmware Flash & Functional Test", workCenter: "WC-TEST-03", machineId: "FIRM-STATION-B", cycleTimeMinutes: 4.5, assignedOperator: "Linus Torvalds" }
  ],
  "DEFAULT": [
    { id: "r1", sequence: 10, operation: "Material Preparation", workCenter: "WC-PREP-01", machineId: "PREP-SAW-02", cycleTimeMinutes: 5.0, assignedOperator: "Bob Builder" },
    { id: "r2", sequence: 20, operation: "Primary Machining", workCenter: "WC-CNC-01", machineId: "CNC-LATHE-3", cycleTimeMinutes: 10.0, assignedOperator: "Ada Lovelace" },
    { id: "r3", sequence: 30, operation: "Deburring & Polishing", workCenter: "WC-FINISH-02", machineId: "POL-BUFF-1", cycleTimeMinutes: 4.5, assignedOperator: "Arthur Dent" },
    { id: "r4", sequence: 40, operation: "Final Inspection", workCenter: "WC-QA-01", machineId: "QA-INSPECT-3", cycleTimeMinutes: 3.5, assignedOperator: "Sherlock Holmes" }
  ]
};

export const MATERIAL_TEMPLATES = {
  "FG-8092-A1": [
    { itemCode: "RM-STL-4x8-01", description: "Hot Rolled Carbon Steel Sheet 4'x8'x2mm", requiredQty: 30, availableQty: 120, allocatedQty: 30, unit: "SHT" },
    { itemCode: "RM-BOLT-M8-15", description: "High Tensile Bolt M8 x 15mm Grade 8.8", requiredQty: 600, availableQty: 5000, allocatedQty: 600, unit: "PCS" },
    { itemCode: "RM-WSHR-M8-FL", description: "Flat Washer M8 Zinc Plated", requiredQty: 600, availableQty: 4200, allocatedQty: 600, unit: "PCS" },
    { itemCode: "RM-PDR-BLK-05", description: "Epoxy Polyester Powder Coating Paint - Satin Black", requiredQty: 15, availableQty: 80, allocatedQty: 15, unit: "KG" }
  ],
  "FG-4412-B2": [
    { itemCode: "RM-BRS-CST-03", description: "Cast Brass Valve Body Pre-Mold", requiredQty: 45, availableQty: 50, allocatedQty: 45, unit: "PCS" },
    { itemCode: "RM-SST-ROD-12", description: "Stainless Steel stem core rod 12mm", requiredQty: 45, availableQty: 210, allocatedQty: 45, unit: "MTR" },
    { itemCode: "RM-SEAL-VIT-12", description: "Viton O-Ring High Temp Seal 12mm ID", requiredQty: 90, availableQty: 400, allocatedQty: 90, unit: "PCS" },
    { itemCode: "RM-PLG-CHRM-12", description: "Chrome Plated Brass Flow Plug Cylinder", requiredQty: 45, availableQty: 15, allocatedQty: 15, unit: "PCS" } // Partial allocation demo!
  ],
  "FG-7011-C5": [
    { itemCode: "RM-FR4-PCB-04", description: "4-Layer FR4 Bare PCB Panels (10x10cm)", requiredQty: 250, availableQty: 1200, allocatedQty: 250, unit: "PCS" },
    { itemCode: "RM-MCU-STM32-48", description: "STM32F401 Cortex-M4 MCU 48-QFN IC", requiredQty: 250, availableQty: 840, allocatedQty: 250, unit: "PCS" },
    { itemCode: "RM-REG-LDO-33", description: "3.3V Low-Dropout Linear Voltage Regulator", requiredQty: 250, availableQty: 3100, allocatedQty: 250, unit: "PCS" },
    { itemCode: "RM-SDR-PST-SAC", description: "Lead-Free Solder Paste SAC305 Type 4", requiredQty: 2.5, availableQty: 18.0, allocatedQty: 2.5, unit: "KG" }
  ],
  "DEFAULT": [
    { itemCode: "RM-ALU-ROD-50", description: "Aluminum Hexagonal Rod stock 50mm", requiredQty: 10, availableQty: 40, allocatedQty: 10, unit: "MTR" },
    { itemCode: "RM-PKG-BX-04", description: "Corrugated CarRDBMSoard Box - Medium Duty", requiredQty: 100, availableQty: 850, allocatedQty: 100, unit: "PCS" },
    { itemCode: "RM-LBL-THERM-3", description: "Thermal Transfer Label roll 3\"x4\"", requiredQty: 100, availableQty: 1200, allocatedQty: 100, unit: "PCS" }
  ]
};

export const MOCK_WORK_ORDERS = [
  {
    workOrderNo: "WO-684-SW",
    createDate: "17-07-2026",
    itemCode: "SW-02",
    itemName: "CARTRIDGE (SNH 526)",
    plannedQty: 15,
    orderType: "Sales Order",
    unit: "Unit-1",
    status: "Open"
  },
  {
    workOrderNo: "WO-683-LWB",
    createDate: "16-07-2026",
    itemCode: "LWB-121",
    itemName: "PLATE, COVER, PLATED ALLOY",
    plannedQty: 184,
    orderType: "Internal Order",
    unit: "Unit-1",
    status: "Open"
  },
  {
    workOrderNo: "WO-682-BB",
    createDate: "16-07-2026",
    itemCode: "BB-150",
    itemName: "BARREL,AIR,8\";316SS",
    plannedQty: 2,
    orderType: "Internal Order",
    unit: "Unit-1",
    status: "Open"
  },
  {
    workOrderNo: "WO-681-UK",
    createDate: "16-07-2026",
    itemCode: "UK-181",
    itemName: "CELLBODY HIGH TEMPERATURE",
    plannedQty: 240,
    orderType: "Sales Order",
    unit: "Unit-1",
    status: "Open"
  },
  {
    workOrderNo: "WO-680-UK",
    createDate: "16-07-2026",
    itemCode: "UK-170",
    itemName: "METERING AND PORTING VALVE",
    plannedQty: 16,
    orderType: "Sales Order",
    unit: "Unit-1",
    status: "Open"
  },
  {
    workOrderNo: "WO-679-UK",
    createDate: "16-07-2026",
    itemCode: "UK-211",
    itemName: "TIE BAR (AQUAPROBE)",
    plannedQty: 520,
    orderType: "Sales Order",
    unit: "Unit-1",
    status: "Open"
  },
  {
    workOrderNo: "WO-678-IND",
    createDate: "16-07-2026",
    itemCode: "IND-13",
    itemName: "Interfaccia DM Minden",
    plannedQty: 105,
    orderType: "Sales Order",
    unit: "Unit-1",
    status: "Open"
  },
  {
    workOrderNo: "WO-677-GE",
    createDate: "16-07-2026",
    itemCode: "GE-02",
    itemName: "POWER MODULE HEAT EXCHANGER",
    plannedQty: 200,
    orderType: "Sales Order",
    unit: "Unit-2",
    status: "Open"
  },
  {
    workOrderNo: "WO-676-OPW",
    createDate: "16-07-2026",
    itemCode: "OPW-198",
    itemName: "Cardioid Latch design",
    plannedQty: 54,
    orderType: "Sales Order",
    unit: "Unit-1",
    status: "Open"
  },
  {
    workOrderNo: "WO-675-IND",
    createDate: "16-07-2026",
    itemCode: "IND-13",
    itemName: "Interfaccia DM Minden",
    plannedQty: 105,
    orderType: "Sales Order",
    unit: "Unit-1",
    status: "Cancelled"
  },
  {
    workOrderNo: "WO-674-GE",
    createDate: "16-07-2026",
    itemCode: "GE-03",
    itemName: "IGBTS PLATE 100KW",
    plannedQty: 200,
    orderType: "Sales Order",
    unit: "Unit-2",
    status: "Open"
  },
  {
    workOrderNo: "WO-673-UK",
    createDate: "16-07-2026",
    itemCode: "UK-05",
    itemName: "HEATER BLOCK ANODISED",
    plannedQty: 200,
    orderType: "Sales Order",
    unit: "Unit-1",
    status: "Open"
  },
  {
    workOrderNo: "WO-672-LWB",
    createDate: "16-07-2026",
    itemCode: "LWB-177",
    itemName: "Nipple Modification, S.S.T.",
    plannedQty: 29,
    orderType: "Sales Order",
    unit: "Unit-1",
    status: "Open"
  },
  {
    workOrderNo: "WO-671-APT",
    createDate: "15-07-2026",
    itemCode: "APT-US-76",
    itemName: "SHELL, MS27508E20---NICKEL",
    plannedQty: 30,
    orderType: "Internal Order",
    unit: "Unit-1",
    status: "Open"
  },
  {
    workOrderNo: "WO-670-APT",
    createDate: "15-07-2026",
    itemCode: "APT-141",
    itemName: "MIC CONE ASSEMBLY",
    plannedQty: 45,
    orderType: "Sales Order",
    unit: "Unit-1",
    status: "Open"
  }
];

