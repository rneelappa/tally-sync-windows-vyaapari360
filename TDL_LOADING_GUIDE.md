# TDL Loading Guide - Based on tally-database-loader Reference Project

## **TDL Files Created (Based on Reference Project Structure):**

1. **`TallyDatabaseLoaderReportLedger.tdl`** - Ledger/Account master data ✅ FIXED
2. **`TallyDatabaseLoaderReportGroup.tdl`** - Group master data ✅ FIXED
3. **`TallyDatabaseLoaderReportStockItem.tdl`** - Stock item master data ✅ FIXED
4. **`TallyDatabaseLoaderReportVoucherType.tdl`** - Voucher type master data ✅ FIXED
5. **`TallyDatabaseLoaderReportUnit.tdl`** - Unit of measure master data ✅ FIXED
6. **`TallyDatabaseLoaderReportGodown.tdl`** - Godown/warehouse master data ✅ FIXED
7. **`TallyDatabaseLoaderReportCostCentre.tdl`** - Cost center master data ✅ FIXED
8. **`TallyDatabaseLoaderReportVoucher.tdl`** - Enhanced voucher data with AlterId ✅ NEW
9. **`VyaapariDateFilteredReport.tdl`** - Voucher transaction data (already working - 6,724 vouchers!) ✅ WORKING

## **How to Load TDL Files in Tally Prime:**

### **Step 1: Copy TDL Files**
Copy all `.tdl` files to Tally Prime's TDL folder:
```
C:\Users\[Username]\AppData\Local\Tally Solutions\Tally Prime\TDL\
```

### **Step 2: Load in Tally Prime**
1. Open Tally Prime
2. Press **F11** (Features)
3. Go to **TDL & Add-Ons** → **TDL Management**
4. Select **Load TDL on Startup** → **Yes**
5. Browse and select each `.tdl` file
6. Click **Accept** for each file

### **Step 3: Verify Loading**
1. Press **Alt+F12** (Configure)
2. Go to **Reports** 
3. You should see the new reports:
   - `TallyDatabaseLoaderReportLedger`
   - `TallyDatabaseLoaderReportGroup`
   - `TallyDatabaseLoaderReportStockItem`
   - `TallyDatabaseLoaderReportVoucherType`
   - `TallyDatabaseLoaderReportUnit`
   - `TallyDatabaseLoaderReportGodown`
   - `TallyDatabaseLoaderReportCostCentre`
   - `TallyDatabaseLoaderReportVoucher`
   - `VyaapariDateFilteredReport` (already loaded)

### **Step 4: Test Reports**
1. Go to **Reports** → **TDL Reports**
2. Select each report to verify it loads without errors
3. Check that data is displayed correctly

## **Server-Side Changes Required:**

After loading the TDL files, update the server to use these new report IDs:

```javascript
// Update createTallyRequest function to use new TDL reports
if (reportType === 'Ledger') {
  requestXml = `<ID>TallyDatabaseLoaderReport-Ledger</ID>`;
} else if (reportType === 'Group') {
  requestXml = `<ID>TallyDatabaseLoaderReport-Group</ID>`;
} else if (reportType === 'StockItem') {
  requestXml = `<ID>TallyDatabaseLoaderReport-StockItem</ID>`;
} else if (reportType === 'VoucherType') {
  requestXml = `<ID>TallyDatabaseLoaderReport-VoucherType</ID>`;
} else if (reportType === 'Unit') {
  requestXml = `<ID>TallyDatabaseLoaderReport-Unit</ID>`;
} else if (reportType === 'Godown') {
  requestXml = `<ID>TallyDatabaseLoaderReport-Godown</ID>`;
} else if (reportType === 'CostCentre') {
  requestXml = `<ID>TallyDatabaseLoaderReport-CostCentre</ID>`;
}
```

## **Expected Results:**

After loading and using these TDL files:
- **Ledgers**: Should return all company ledgers with full details
- **Groups**: Should return all account groups with hierarchy
- **Stock Items**: Should return all inventory items with quantities/values
- **Voucher Types**: Should return all configured voucher types
- **Units**: Should return all units of measure
- **Godowns**: Should return all warehouses/locations
- **Cost Centres**: Should return all cost centers

## **Data Structure:**

Each TDL returns data in `F01`, `F02`, `F03`... format that maps to:
- **F01**: GUID (unique identifier)
- **F02**: Name
- **F03**: Parent (hierarchy)
- **F04+**: Additional fields specific to each master data type

## **Reference:**
Based on [tally-database-loader](https://github.com/dhananjay1405/tally-database-loader) project structure and YAML configuration approach.
