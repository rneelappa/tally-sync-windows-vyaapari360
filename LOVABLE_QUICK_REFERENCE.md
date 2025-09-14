# 🚀 Lovable.dev Quick Reference - Tally XML API

## Base URL
```
https://tally-sync-vyaapari360-production.up.railway.app/api/v1
```

## 📋 Essential Endpoints

### 1. Health Check
```http
GET /health
```
**Response**: System status and storage info

### 2. Sync Data from Tally
```http
POST /sync/SKM/MAIN
Content-Type: application/json

{
  "fromDate": "20250901",
  "toDate": "20250930"
}
```

### 3. List Vouchers
```http
GET /vouchers/SKM/MAIN?page=1&limit=10&type=Payment&search=AKEYEM
```

### 4. Get Single Voucher
```http
GET /voucher/SKM/MAIN/59653
```

### 5. Update Voucher
```http
PUT /voucher/SKM/MAIN/59653
Content-Type: application/json

{
  "narration": "Updated narration",
  "entries": [
    {
      "index": 1,
      "amount": 1000.00,
      "ledgerName": "Cash Account"
    }
  ]
}
```

### 6. Export Voucher XML
```http
GET /voucher/SKM/MAIN/59653/xml
```

## 🎯 Lovable.dev Instructions

### Copy this API service class:
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

### Sample React Component:
```javascript
import React, { useState, useEffect } from 'react';

function VoucherManager() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const api = new TallyAPIService();

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const result = await api.getVouchers('SKM', 'MAIN', { page: 1, limit: 10 });
      if (result.success) {
        setVouchers(result.data.vouchers);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const syncFromTally = async () => {
    try {
      const result = await api.syncData('SKM', 'MAIN', '20250901', '20250930');
      if (result.success) {
        alert(`Synced ${result.data.storedVouchers} vouchers!`);
        fetchVouchers();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const updateVoucher = async (voucherId, narration) => {
    try {
      const result = await api.updateVoucher('SKM', 'MAIN', voucherId, { narration });
      if (result.success) {
        alert('Voucher updated!');
        fetchVouchers();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={syncFromTally}>Sync from Tally</button>
      
      {vouchers.map(voucher => (
        <div key={voucher.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
          <h3>{voucher.type} #{voucher.number}</h3>
          <p>Date: {voucher.date}</p>
          <p>Party: {voucher.partyLedgerName}</p>
          <p>Narration: {voucher.narration}</p>
          <button onClick={() => updateVoucher(voucher.id, 'Updated via Lovable.dev')}>
            Update Narration
          </button>
        </div>
      ))}
    </div>
  );
}

export default VoucherManager;
```

## 🔧 Quick Test Commands

```bash
# Test health
curl "https://tally-sync-vyaapari360-production.up.railway.app/api/v1/health"

# Test sync
curl -X POST "https://tally-sync-vyaapari360-production.up.railway.app/api/v1/sync/SKM/MAIN" \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "20250901", "toDate": "20250930"}'

# Test vouchers
curl "https://tally-sync-vyaapari360-production.up.railway.app/api/v1/vouchers/SKM/MAIN?limit=5"
```

## 📊 Data Structure

Each voucher contains:
- `id`: Voucher ID
- `type`: Voucher type (Payment, Purchase, etc.)
- `number`: Voucher number
- `date`: Voucher date (YYYYMMDD)
- `partyLedgerName`: Party name
- `narration`: Voucher narration
- `entries`: Ledger entries array
- `inventoryEntries`: Inventory entries array

## 🚀 Ready to Use!

Your Tally XML API is fully functional and ready for Lovable.dev integration! 🎉
