# 🚀 Lovable.dev API Integration Reference

## Base URL
```
https://tally-sync-vyaapari360-production.up.railway.app/api/v1
```

## 📋 All Available Endpoints

### 1. **Health Check**
```http
GET /health
```
**Purpose**: Check if API is running and get system status  
**Response**:
```json
{
  "success": true,
  "message": "Tally XML API is running",
  "timestamp": "2025-09-14T14:47:14.842Z",
  "version": "1.0.0",
  "environment": "production",
  "storage": {
    "totalVouchers": 12,
    "companies": ["SKM"]
  }
}
```

### 2. **Sync Data from Tally**
```http
POST /sync/{companyId}/{divisionId}
```
**Purpose**: Fetch fresh data from Tally ERP  
**Parameters**:
- `companyId`: Company identifier (e.g., "SKM")
- `divisionId`: Division identifier (e.g., "MAIN")

**Request Body**:
```json
{
  "fromDate": "20250901",
  "toDate": "20250930"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "data": {
    "totalVouchers": 12,
    "storedVouchers": 12,
    "errorCount": 0,
    "companyId": "SKM",
    "divisionId": "MAIN",
    "dateRange": {
      "fromDate": "20250901",
      "toDate": "20250930"
    }
  }
}
```

### 3. **List Vouchers (with Filtering)**
```http
GET /vouchers/{companyId}/{divisionId}
```
**Purpose**: Get paginated list of vouchers with filtering options  
**Parameters**:
- `companyId`: Company identifier
- `divisionId`: Division identifier

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `from`: Start date (YYYY-MM-DD)
- `to`: End date (YYYY-MM-DD)
- `type`: Voucher type filter
- `search`: Search term

**Example**:
```
GET /vouchers/SKM/MAIN?page=1&limit=10&type=Payment&search=AKEYEM
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "pages": 2,
    "vouchers": [
      {
        "id": "59653",
        "vchkey": "",
        "alterId": "59653",
        "date": "20250901",
        "type": "Payment",
        "number": "4",
        "narration": "Updated via Railway deployment test",
        "isInvoice": false,
        "isModify": false,
        "isDeleted": false,
        "isOptional": false,
        "effectiveDate": "20250901",
        "voucherTypeId": "",
        "voucherTypeName": "Payment",
        "partyLedgerName": "AKEYEM SONS (P)",
        "entries": [],
        "inventoryEntries": []
      }
    ]
  }
}
```

### 4. **Get Single Voucher**
```http
GET /voucher/{companyId}/{divisionId}/{voucherId}
```
**Purpose**: Get detailed information about a specific voucher  
**Parameters**:
- `companyId`: Company identifier
- `divisionId`: Division identifier
- `voucherId`: Voucher ID

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "59653",
    "vchkey": "",
    "alterId": "59653",
    "date": "20250901",
    "type": "Payment",
    "number": "4",
    "narration": "Updated via Railway deployment test",
    "isInvoice": false,
    "isModify": false,
    "isDeleted": false,
    "isOptional": false,
    "effectiveDate": "20250901",
    "voucherTypeId": "",
    "voucherTypeName": "Payment",
    "partyLedgerName": "AKEYEM SONS (P)",
    "entries": [],
    "inventoryEntries": []
  }
}
```

### 5. **Update Voucher**
```http
PUT /voucher/{companyId}/{divisionId}/{voucherId}
```
**Purpose**: Update voucher information  
**Parameters**:
- `companyId`: Company identifier
- `divisionId`: Division identifier
- `voucherId`: Voucher ID

**Request Body**:
```json
{
  "narration": "Updated narration text",
  "entries": [
    {
      "index": 1,
      "amount": 1000.00,
      "ledgerName": "Cash Account"
    }
  ],
  "inventoryEntries": [
    {
      "index": 1,
      "rate": 50.00,
      "amount": 500.00,
      "billedQuantity": 10
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Voucher updated successfully",
  "data": {
    "id": "59653",
    "narration": "Updated narration text",
    "entries": [...],
    "inventoryEntries": [...]
  }
}
```

### 6. **Export Voucher as XML**
```http
GET /voucher/{companyId}/{divisionId}/{voucherId}/xml
```
**Purpose**: Get voucher in Tally XML format for import  
**Parameters**:
- `companyId`: Company identifier
- `divisionId`: Division identifier
- `voucherId`: Voucher ID

**Response**: XML content for Tally import

## 🎯 Lovable.dev Integration Examples

### 1. **API Service Class**
```javascript
class TallyAPIService {
  constructor() {
    this.baseURL = 'https://tally-sync-vyaapari360-production.up.railway.app/api/v1';
  }

  async getHealth() {
    const response = await fetch(`${this.baseURL}/health`);
    return response.json();
  }

  async syncData(companyId, divisionId, fromDate, toDate) {
    const response = await fetch(`${this.baseURL}/sync/${companyId}/${divisionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromDate, toDate })
    });
    return response.json();
  }

  async getVouchers(companyId, divisionId, options = {}) {
    const params = new URLSearchParams({
      page: options.page || 1,
      limit: options.limit || 50,
      ...(options.from && { from: options.from }),
      ...(options.to && { to: options.to }),
      ...(options.type && { type: options.type }),
      ...(options.search && { search: options.search })
    });

    const response = await fetch(`${this.baseURL}/vouchers/${companyId}/${divisionId}?${params}`);
    return response.json();
  }

  async getVoucher(companyId, divisionId, voucherId) {
    const response = await fetch(`${this.baseURL}/voucher/${companyId}/${divisionId}/${voucherId}`);
    return response.json();
  }

  async updateVoucher(companyId, divisionId, voucherId, updates) {
    const response = await fetch(`${this.baseURL}/voucher/${companyId}/${divisionId}/${voucherId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }
}
```

### 2. **React Hook for Vouchers**
```javascript
import { useState, useEffect } from 'react';

function useVouchers(companyId, divisionId) {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const api = new TallyAPIService();

  const fetchVouchers = async (options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.getVouchers(companyId, divisionId, {
        ...pagination,
        ...options
      });
      
      if (result.success) {
        setVouchers(result.data.vouchers);
        setPagination({
          page: result.data.page,
          limit: result.data.limit,
          total: result.data.total,
          pages: result.data.pages
        });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateVoucher = async (voucherId, updates) => {
    try {
      const result = await api.updateVoucher(companyId, divisionId, voucherId, updates);
      
      if (result.success) {
        setVouchers(prev => 
          prev.map(v => v.id === voucherId ? result.data : v)
        );
        return result;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const syncFromTally = async (fromDate, toDate) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.syncData(companyId, divisionId, fromDate, toDate);
      
      if (result.success) {
        await fetchVouchers();
        return result;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    vouchers,
    loading,
    error,
    pagination,
    fetchVouchers,
    updateVoucher,
    syncFromTally
  };
}
```

### 3. **Sample React Component**
```javascript
import React, { useState, useEffect } from 'react';
import { useVouchers } from './hooks/useVouchers';

function VoucherManager() {
  const {
    vouchers,
    loading,
    error,
    pagination,
    fetchVouchers,
    updateVoucher,
    syncFromTally
  } = useVouchers('SKM', 'MAIN');

  const [filters, setFilters] = useState({
    from: '',
    to: '',
    type: '',
    search: ''
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleSync = async () => {
    const result = await syncFromTally('20250901', '20250930');
    if (result) {
      alert(`Synced ${result.data.storedVouchers} vouchers!`);
    }
  };

  const handleUpdateNarration = async (voucherId, newNarration) => {
    const result = await updateVoucher(voucherId, { narration: newNarration });
    if (result) {
      alert('Voucher updated successfully!');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={handleSync}>Sync from Tally</button>
      
      <div>
        <input
          type="text"
          placeholder="Search vouchers..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
        />
        <button onClick={() => fetchVouchers(filters)}>Search</button>
      </div>

      <div>
        {vouchers.map(voucher => (
          <div key={voucher.id}>
            <h3>{voucher.type} #{voucher.number}</h3>
            <p>Date: {voucher.date}</p>
            <p>Party: {voucher.partyLedgerName}</p>
            <p>Narration: {voucher.narration}</p>
            <button 
              onClick={() => handleUpdateNarration(voucher.id, 'Updated via Lovable.dev')}
            >
              Update Narration
            </button>
          </div>
        ))}
      </div>

      <div>
        Page {pagination.page} of {pagination.pages} 
        (Total: {pagination.total} vouchers)
      </div>
    </div>
  );
}

export default VoucherManager;
```

## 🔧 Configuration for Lovable.dev

### Environment Variables
```javascript
const config = {
  apiBaseURL: 'https://tally-sync-vyaapari360-production.up.railway.app/api/v1',
  defaultCompanyId: 'SKM',
  defaultDivisionId: 'MAIN'
};
```

### Error Handling
```javascript
const handleApiError = (error) => {
  if (error.response?.status === 404) {
    return 'Voucher not found';
  } else if (error.response?.status === 500) {
    return 'Server error. Please try again.';
  } else {
    return 'Network error. Please check your connection.';
  }
};
```

## 📊 Data Structure Reference

### Voucher Object
```typescript
interface Voucher {
  id: string;
  vchkey: string;
  alterId: string;
  date: string;
  type: string;
  number: string;
  narration: string;
  isInvoice: boolean;
  isModify: boolean;
  isDeleted: boolean;
  isOptional: boolean;
  effectiveDate: string;
  voucherTypeId: string;
  voucherTypeName: string;
  partyLedgerName: string;
  entries: LedgerEntry[];
  inventoryEntries: InventoryEntry[];
}

interface LedgerEntry {
  index: number;
  ledgerName: string;
  amount: number;
  isDeemedPositive: boolean;
  isPartyLedger: boolean;
  ledgerId: string;
}

interface InventoryEntry {
  index: number;
  stockItemName: string;
  stockItemId: string;
  rate: number;
  amount: number;
  billedQuantity: number;
  actualQuantity: number;
  unit: string;
  godownName: string;
  godownId: string;
}
```

## 🚀 Quick Start for Lovable.dev

1. **Copy the API service class** into your Lovable.dev project
2. **Use the React hook** for state management
3. **Create components** using the sample component as a template
4. **Test with the health endpoint** first
5. **Implement sync functionality** for data fetching
6. **Add filtering and search** using query parameters
7. **Implement real-time updates** using the update endpoint

Your Tally XML API is ready for full integration with Lovable.dev! 🎉


