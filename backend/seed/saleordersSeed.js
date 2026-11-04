// One-time seed data for public.sale_orders (inserted only when the table is empty).
// Tuple order: [id, poNumber, customerName, partNo, quantity, shipDate, logoSrc, logoAlt, logoWidth,
//               poLineId, partDescription, dockDate, openQty, pendingQty, modeOfDispatch, cardCode, drawingRev]
const rows = [
    ['so-1', 'DIICPO/2026-27/547', 'DOVER INDIA PVT LTD - BLR', 'OPW-233', 140, '20/10/26', '/dover-private.png', 'Dover India Private Limited', 'w-[88px]', '10', 'OPW Fueling Nozzle Assembly', '18/10/26', 140, 140, 'Road', 'C00001', 'A'],
    ['so-2', '1161544', 'HASKEL INTERNATIONAL LLC', 'BB-52', 120, '30/11/26', '/haskel-logo.png', 'Haskel International LLC', 'w-[85px]', '20', 'High Pressure Pump Body', '28/11/26', 95, 95, 'Air', 'C00002', 'B'],
    ['so-3', '1161544', 'ALTO-SHAAM, INC', 'ALT-04', 140, '24/12/26', '/Alto-shaam.png', 'Alto Shaam', 'w-[88px]', '30', 'Heating Element Module', '22/12/26', 140, 140, 'Sea', 'C00003', '1.0'],
    ['so-4', '4501123078', 'ABB INC PRU - CANADA', 'CA-46', 80, '09/12/26', '/ABB.png', 'ABB INC PRU - CANADA', 'w-[80px]', '40', 'Control Panel Unit', '07/12/26', 80, 80, 'Air', 'C00004', 'C'],
    ['so-5', '4501123078', 'WIPRO GE HEALTHCARE PVT LTD (WHITEFIELD)', '76205-190', 80, '21/06/26', 'GE.png', 'WIPRO GE HEALTHCARE', 'w-[79px]', '50', 'Medical Imaging Component', '19/06/26', 80, 80, 'Road', 'C00005', '2.1'],
    ['so-6', '260076613', 'OPW FUELING COMPONENTS LLC', 'OPW-292', 200, '24/08/26', 'OPW Fueling.png', 'OPW FUELING COMPONENTS LLC', 'w-[140px]', '60', 'Fuel Dispenser Valve', '22/08/26', 200, 200, 'Sea', 'C00006', 'A'],
    ['so-7', 'AS02-4501846358', 'ABB LTD UK', 'UK-248', 80, '09/12/26', '/ABB.png', 'ABB LTD UK', 'w-[80px]', '70', 'Circuit Breaker Module', '07/12/26', 80, 80, 'Air', 'C00007', 'B'],
    ['so-8', '2491197', 'MILTON ROY', 'MTR-320', 220, '30/08/26', 'miltonroy.png', 'MILTON ROY', 'w-[120px]', '80', 'Metering Pump Assembly', '28/08/26', 220, 220, 'Road', 'C00008', '1.2'],
    ['so-9', '4575458187', 'ABB - AB SWEDEN', 'SW-51', 1000, '09/12/26', '/ABB.png', 'ABB - AB SWEDEN', 'w-[80px]', '90', 'Power Distribution Unit', '07/12/26', 1000, 1000, 'Sea', 'C00009', 'D'],
    ['so-10', '2009012', 'GRAVER TECHNOLOGIES LLC', 'MAR-01', 1000, '09/12/26', '/graver-technologies.png', 'GRAVER TECHNOLOGIES LLC', 'w-[117px]', '100', 'Filter Cartridge Housing', '07/12/26', 1000, 1000, 'Air', 'C00010', 'A'],
    ['so-11', 'MX35294', 'SPECTRUM CONTROL INC', 'APT-US-02', 1000, '09/12/26', 'Spectrum.png', 'SPECTRUM CONTROL INC', 'w-[100px]', '110', 'EMI Filter Module', '07/12/26', 1000, 1000, 'Road', 'C00011', '3.0'],
    ['so-12', '14018-258', 'GE BE PVT.LTD', 'GE-78', 250, '09/12/26', 'GE.png', 'GE BE PVT.LTD', 'w-[120px]', '120', 'Bearing Assembly Unit', '07/12/26', 250, 250, 'Sea', 'C00012', 'B'],
    ['so-13', '525031567', 'FIBRELITE COMPOSITES LTD', 'OPW-03', 250, '09/12/26', 'fibrelite.png', 'FIBRELITE COMPOSITES LTD', 'w-[120px]', '130', 'Composite Access Cover', '07/12/26', 250, 250, 'Road', 'C00013', '1.0'],
    ['so-14', '691258828', 'VEHICLE SERVICE GROUP, LLC', 'VSG-06', 250, '09/12/26', 'VSG.png', 'VEHICLE SERVICE GROUP, LLC', 'w-[82px]', '140', 'Lift Arm Component', '07/12/26', 250, 250, 'Air', 'C00014', 'C'],
    ['so-15', '261078', 'SECURE SYSTEMS & TECHNOLOGIES', 'APT-130', 250, '09/12/26', 'sst.png', 'SECURE SYSTEMS & TECHNOLOGIES', 'w-[80px]', '150', 'Security Sensor Module', '07/12/26', 250, 250, 'Road', 'C00015', 'A'],
    ['so-16', '261078', 'INGERSOLL RAND', 'IGR-47', 250, '09/12/26', 'IR.png', 'INGERSOLL RAND', 'w-[88px]', '160', 'Compressor Valve Plate', '07/12/26', 250, 250, 'Sea', 'C00016', '2.0'],
    ['so-17', '210088052', 'KNAPPCO CORPORATION- OPW', 'OPW-05', 2500, '09/12/26', 'Knappco.png', 'KNAPPCO CORPORATION- OPW', 'w-[110px]', '170', 'Tank Truck Valve', '07/12/26', 2500, 2500, 'Road', 'C00017', 'B'],
    ['so-18', 'STC-1150908', 'SHENTIN INDUSTRIAL CO., LTD', 'OPW-05', 2500, '09/12/26', 'Shentin.png', 'SHENTIN INDUSTRIAL CO., LTD', 'w-[120px]', '180', 'Industrial Coupling', '07/12/26', 2500, 2500, 'Sea', 'C00018', '1.1'],
    ['so-19', 'STC-1150908', 'INDUSTRIAL TECHNOLOGIES AND SERVICES LLC.', 'MP-17', 8, '09/12/26', 'ITS.png', 'INDUSTRIAL TECHNOLOGIES AND SERVICES LLC.', 'w-[120px]', '190', 'Precision Machined Housing', '07/12/26', 8, 8, 'Air', 'C00019', 'A'],
    ['so-20', 'STC-1150908', 'LIQUIP INTERNATIONAL PTY LTD', 'OPW-05-LIQ', 8, '09/12/26', 'Liquip.png', 'LIQUIP INTERNATIONAL PTY LTD', 'w-[120px]', '200', 'Liquid Handling Adapter', '07/12/26', 8, 8, 'Sea', 'C00020', 'C'],
    ['so-21', '251135449', 'PSG CALIFORNIA LLC', 'PSG-NEP-10', 80, '09/12/26', 'PSG.png', 'PSG CALIFORNIA LLC', 'w-[80px]', '210', 'Pump Seal Kit', '07/12/26', 80, 80, 'Air', 'C00021', '1.0'],
    ['so-22', 'STC-1150908', 'SFO TECHNOLOGIES PVT.LTD., COCHIN', 'GE-99', 80, '09/12/26', 'SFO.png', 'SFO TECHNOLOGIES PVT.LTD., COCHIN', 'w-[120px]', '220', 'Electronic Control Board', '07/12/26', 80, 80, 'Road', 'C00022', 'B'],
    ['so-23', '1161544', 'HASKEL INTERNATIONAL LLC', 'BB-52', 120, '30/11/26', '/haskel-logo.png', 'Haskel International LLC', 'w-[85px]', '20', 'High Pressure Pump Body', '28/11/26', 95, 95, 'Air', 'C00002', 'B'],
    ['so-24', '1161544', 'HASKEL INTERNATIONAL LLC', 'BB-52', 290, '30/11/26', '/haskel-logo.png', 'Haskel International LLC', 'w-[85px]', '20', 'High Pressure Pump Body', '28/11/26', 95, 95, 'Air', 'C00002', 'B'],
];

const saleOrdersSeed = rows.map(
    ([id, poNumber, customerName, partNo, quantity, shipDate, logoSrc, logoAlt, logoWidth,
        poLineId, partDescription, dockDate, openQty, pendingQty, modeOfDispatch, cardCode, drawingRev]) => ({
            id, poNumber, customerName, partNo, quantity, shipDate, logoSrc, logoAlt, logoWidth,
            poLineId, partDescription, dockDate, openQty, pendingQty, modeOfDispatch, cardCode, drawingRev,
            poDate: '12/11/26',
            itemType: 'Customer_PO',
        })
);

export default saleOrdersSeed;