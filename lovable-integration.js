// Lovable.dev Integration for Tally XML API
// This shows how to integrate the Railway API with Lovable.dev frontend

const TALLY_API_BASE = 'https://your-railway-url.railway.app/api/v1';

// API Service for Lovable.dev
class TallyAPIService {
  constructor(apiBase = TALLY_API_BASE) {
    this.apiBase = apiBase;
  }

  // Health check
  async getHealth() {
    const response = await fetch(`${this.apiBase}/health`);
    return response.json();
  }

  // Sync data from Tally
  async syncData(companyId, divisionId, fromDate, toDate) {
    const response = await fetch(`${this.apiBase}/sync/${companyId}/${divisionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fromDate, toDate })
    });
    return response.json();
  }

  // Get vouchers with filtering
  async getVouchers(companyId, divisionId, options = {}) {
    const params = new URLSearchParams({
      page: options.page || 1,
      limit: options.limit || 50,
      ...(options.from && { from: options.from }),
      ...(options.to && { to: options.to }),
      ...(options.type && { type: options.type }),
      ...(options.search && { search: options.search })
    });

    const response = await fetch(`${this.apiBase}/vouchers/${companyId}/${divisionId}?${params}`);
    return response.json();
  }

  // Get single voucher
  async getVoucher(companyId, divisionId, voucherId) {
    const response = await fetch(`${this.apiBase}/voucher/${companyId}/${divisionId}/${voucherId}`);
    return response.json();
  }

  // Update voucher
  async updateVoucher(companyId, divisionId, voucherId, updates) {
    const response = await fetch(`${this.apiBase}/voucher/${companyId}/${divisionId}/${voucherId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  // Export voucher as XML for Tally
  async exportVoucherXML(companyId, divisionId, voucherId) {
    const response = await fetch(`${this.apiBase}/voucher/${companyId}/${divisionId}/${voucherId}/xml`);
    return response.text();
  }
}

// React Hook for Voucher Management (Lovable.dev compatible)
function useTallyVouchers(companyId, divisionId) {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const service = new TallyAPIService();

  const fetchVouchers = async (options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.getVouchers(companyId, divisionId, {
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
      const result = await service.updateVoucher(companyId, divisionId, voucherId, updates);
      
      if (result.success) {
        // Update local state
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
      const result = await service.syncData(companyId, divisionId, fromDate, toDate);
      
      if (result.success) {
        // Refresh vouchers after sync
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

// Example Lovable.dev Component
function TallyVoucherManager({ companyId, divisionId }) {
  const {
    vouchers,
    loading,
    error,
    pagination,
    fetchVouchers,
    updateVoucher,
    syncFromTally
  } = useTallyVouchers(companyId, divisionId);

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
      alert(`Synced ${result.data.storedVouchers} vouchers successfully!`);
    }
  };

  const handleUpdateNarration = async (voucherId, newNarration) => {
    const result = await updateVoucher(voucherId, { narration: newNarration });
    if (result) {
      alert('Voucher updated successfully!');
    }
  };

  const handleFilter = () => {
    fetchVouchers(filters);
  };

  if (loading) return <div>Loading vouchers...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="tally-voucher-manager">
      <div className="controls">
        <button onClick={handleSync} className="sync-btn">
          🔄 Sync from Tally
        </button>
        
        <div className="filters">
          <input
            type="date"
            placeholder="From Date"
            value={filters.from}
            onChange={(e) => setFilters({...filters, from: e.target.value})}
          />
          <input
            type="date"
            placeholder="To Date"
            value={filters.to}
            onChange={(e) => setFilters({...filters, to: e.target.value})}
          />
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
          <button onClick={handleFilter}>Filter</button>
        </div>
      </div>

      <div className="voucher-grid">
        {vouchers.map(voucher => (
          <div key={voucher.id} className="voucher-card">
            <h3>{voucher.type} - {voucher.number}</h3>
            <p><strong>Date:</strong> {voucher.date}</p>
            <p><strong>Party:</strong> {voucher.partyLedgerName}</p>
            <p><strong>Narration:</strong> {voucher.narration || 'No narration'}</p>
            
            <div className="voucher-actions">
              <button 
                onClick={() => handleUpdateNarration(voucher.id, 'Updated via Lovable.dev')}
                className="update-btn"
              >
                Update Narration
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <span>Page {pagination.page} of {pagination.pages}</span>
        <span>Total: {pagination.total} vouchers</span>
      </div>
    </div>
  );
}

// Usage in Lovable.dev
function App() {
  return (
    <div className="app">
      <h1>Tally ERP Integration</h1>
      <TallyVoucherManager companyId="SKM" divisionId="MAIN" />
    </div>
  );
}

// Export for use in Lovable.dev
export { TallyAPIService, useTallyVouchers, TallyVoucherManager };

// Configuration for different environments
const config = {
  development: {
    apiBase: 'http://localhost:3000/api/v1'
  },
  production: {
    apiBase: 'https://your-railway-url.railway.app/api/v1'
  }
};

// Auto-configure based on environment
const environment = process.env.NODE_ENV || 'development';
const apiService = new TallyAPIService(config[environment].apiBase);

console.log('Tally API Integration Ready for Lovable.dev!');
console.log('Environment:', environment);
console.log('API Base:', config[environment].apiBase);
