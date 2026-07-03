import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  BookOpen, 
  FileBarChart2, 
  Settings as SettingsIcon,
  Menu, 
  X,
  Navigation
} from 'lucide-react';
import type { Vehicle, Transaction } from './types';
import { getVehicles, getTransactions, initSampleData, importData } from './utils/storage';
import { Dashboard } from './components/Dashboard';
import { Vehicles } from './components/Vehicles';
import { Ledger } from './components/Ledger';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Trips } from './components/Trips';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            vehicles={vehicles} 
            transactions={transactions} 
            setActiveTab={setActiveTab}
            setSelectedVehicleId={setSelectedVehicleId}
          />
        );
      case 'vehicles':
        return (
          <Vehicles 
            vehicles={vehicles} 
            transactions={transactions}
            refreshData={refreshData}
            setActiveTab={setActiveTab}
            setSelectedVehicleId={setSelectedVehicleId}
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
      case 'settings':
        return (
          <Settings 
            refreshData={refreshData} 
          />
        );
      default:
        return (
          <Dashboard 
            vehicles={vehicles} 
            transactions={transactions} 
            setActiveTab={setActiveTab}
            setSelectedVehicleId={setSelectedVehicleId}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Top Header (hidden on desktop) */}
      <div 
        style={{ 
          display: 'none', 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          height: '60px', 
          backgroundColor: 'var(--bg-sidebar)', 
          borderBottom: '1px solid var(--border-color)',
          zIndex: 200,
          alignItems: 'center',
          padding: '0 20px',
          justifyContent: 'space-between'
        }}
        className="mobile-header"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sidebar-logo" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>T</div>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>TRANS-ACC</span>
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '6px' }}
          onClick={toggleSidebar}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Overlay (dim background when sidebar is open on mobile) */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Navigation Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">T</div>
          <span className="sidebar-title">TransAccount</span>
        </div>

        <ul className="sidebar-menu">
          <li>
            <button 
              className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              style={{ width: '100%', border: 'none', textAlign: 'left', background: 'transparent' }}
            >
              <LayoutDashboard className="sidebar-item-icon" />
              <span className="sidebar-item-text">Dashboard</span>
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-item ${activeTab === 'vehicles' ? 'active' : ''}`}
              onClick={() => { setActiveTab('vehicles'); setIsSidebarOpen(false); }}
              style={{ width: '100%', border: 'none', textAlign: 'left', background: 'transparent' }}
            >
              <Truck className="sidebar-item-icon" />
              <span className="sidebar-item-text">Vehicles List</span>
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-item ${activeTab === 'trips' ? 'active' : ''}`}
              onClick={() => { setActiveTab('trips'); setIsSidebarOpen(false); }}
              style={{ width: '100%', border: 'none', textAlign: 'left', background: 'transparent' }}
            >
              <Navigation className="sidebar-item-icon" />
              <span className="sidebar-item-text">Trip Registers</span>
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-item ${activeTab === 'ledger' ? 'active' : ''}`}
              onClick={() => { setActiveTab('ledger'); setIsSidebarOpen(false); }}
              style={{ width: '100%', border: 'none', textAlign: 'left', background: 'transparent' }}
            >
              <BookOpen className="sidebar-item-icon" />
              <span className="sidebar-item-text">Ledger Entries</span>
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
              style={{ width: '100%', border: 'none', textAlign: 'left', background: 'transparent' }}
            >
              <FileBarChart2 className="sidebar-item-icon" />
              <span className="sidebar-item-text">Reports & PDF</span>
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
              style={{ width: '100%', border: 'none', textAlign: 'left', background: 'transparent' }}
            >
              <SettingsIcon className="sidebar-item-icon" />
              <span className="sidebar-item-text">Settings</span>
            </button>
          </li>
        </ul>

        <div className="sidebar-footer">
          <p>© 2026 TransAccount</p>
          <p style={{ fontSize: '0.7rem', marginTop: '4px' }}>v1.0.0 (Local)</p>
        </div>
      </aside>

      {/* Main Body Window */}
      <main className="main-content">
        {renderActiveComponent()}
      </main>

    </div>
  );
}

export default App;
