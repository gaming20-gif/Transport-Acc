import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  FileBarChart2, 
  ClipboardList
} from 'lucide-react';
import type { Vehicle, Transaction } from './types';
import { getVehicles, getTransactions, initSampleData, importData } from './utils/storage';
import { Dashboard } from './components/Dashboard';
import { Vehicles } from './components/Vehicles';
import { Ledger } from './components/Ledger';
import { Reports } from './components/Reports';
import { Trips } from './components/Trips';
import { Pending } from './components/Pending';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Initialize data on mount
  useEffect(() => {
    const runAutoMigrate = async () => {
      try {
        const localVehicles = localStorage.getItem('transport_acc_vehicles');
        const localTransactions = localStorage.getItem('transport_acc_transactions');
        const localTrips = localStorage.getItem('transport_acc_trips');

        if (localVehicles && localVehicles !== '[]' || 
            localTransactions && localTransactions !== '[]' || 
            localTrips && localTrips !== '[]') {
          
          console.log("Auto-migrating legacy local storage data to MongoDB backend...");
          
          const migrationData = {
            vehicles: localVehicles ? JSON.parse(localVehicles) : [],
            transactions: localTransactions ? JSON.parse(localTransactions) : [],
            trips: localTrips ? JSON.parse(localTrips) : []
          };
          
          const success = await importData(JSON.stringify(migrationData));
          
          if (success) {
            console.log("Migration successful! Clearing local storage...");
            localStorage.removeItem('transport_acc_vehicles');
            localStorage.removeItem('transport_acc_transactions');
            localStorage.removeItem('transport_acc_trips');
          }
        }
      } catch (err) {
        console.error("Auto-migration failed:", err);
      }
      
      await initSampleData();
      await refreshData();
    };
    
    runAutoMigrate();
  }, []);

  const refreshData = async () => {
    const v = await getVehicles();
    const t = await getTransactions();
    setVehicles(v);
    setTransactions(t);
  };


  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            vehicles={vehicles} 
            transactions={transactions} 
            refreshData={refreshData}
          />
        );
      case 'vehicles':
        return (
          <Vehicles 
            vehicles={vehicles} 
            refreshData={refreshData}
          />
        );
      case 'trips':
        return (
          <Trips 
            vehicles={vehicles}
            refreshData={refreshData}
          />
        );
      case 'ledger':
        return (
          <Ledger 
            vehicles={vehicles} 
            transactions={transactions}
            selectedVehicleId={selectedVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
            refreshData={refreshData}
          />
        );
      case 'reports':
        return (
          <Reports 
            vehicles={vehicles} 
            transactions={transactions}
          />
        );
      case 'pending':
        return (
          <Pending 
            vehicles={vehicles}
            transactions={transactions}
            refreshData={refreshData}
          />
        );

      default:
        return (
          <Dashboard 
            vehicles={vehicles} 
            transactions={transactions} 
            refreshData={refreshData}
          />
        );
    }
  };

  const pendingCount = transactions.filter(t => 
    t.paymentStatus === 'Pending' || t.paymentStatus === 'Partial' || (!t.paymentStatus && t.paymentMode === 'Pending')
  ).length;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <nav className="top-navbar">
        <div className="top-navbar-brand">
          <div className="top-navbar-logo">T</div>
          <span className="top-navbar-title">TransAccount</span>
        </div>

        <ul className="top-navbar-menu">
          <li>
            <button 
              className={`top-navbar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              style={{ border: 'none', background: 'transparent' }}
            >
              <LayoutDashboard className="top-navbar-item-icon" />
              <span className="top-navbar-item-text">Dashboard</span>
            </button>
          </li>
          <li>
            <button 
              className={`top-navbar-item ${activeTab === 'vehicles' ? 'active' : ''}`}
              onClick={() => setActiveTab('vehicles')}
              style={{ border: 'none', background: 'transparent' }}
            >
              <Truck className="top-navbar-item-icon" />
              <span className="top-navbar-item-text">My Vehicle</span>
            </button>
          </li>
          <li>
            <button 
              className={`top-navbar-item ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
              style={{ border: 'none', background: 'transparent', position: 'relative' }}
            >
              <ClipboardList className="top-navbar-item-icon" />
              <span className="top-navbar-item-text">Pending Dues</span>
              {pendingCount > 0 && (
                <span 
                  className="badge-count" 
                  style={{ 
                    position: 'absolute', 
                    top: '8px', 
                    right: '12px', 
                    backgroundColor: 'var(--color-danger)', 
                    color: '#fff', 
                    borderRadius: '10px', 
                    padding: '2px 6px', 
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          </li>
          <li>
            <button 
              className={`top-navbar-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
              style={{ border: 'none', background: 'transparent' }}
            >
              <FileBarChart2 className="top-navbar-item-icon" />
              <span className="top-navbar-item-text">P&L (Profit and Loss)</span>
            </button>
          </li>

        </ul>

        <div className="top-navbar-footer">
          <button 
            type="button"
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-navbar-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <span>v1.0.0 (Local)</span>
        </div>
      </nav>

      {/* Main Body Window */}
      <main className="main-content">
        {renderActiveComponent()}
      </main>

    </div>
  );
}

export default App;
