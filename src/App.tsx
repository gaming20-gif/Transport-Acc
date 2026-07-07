import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  FileBarChart2, 
  ClipboardList,
  LogOut,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';
import type { Vehicle, Transaction, User } from './types';
import { getVehicles, getTransactions, initSampleData, importData, getMe } from './utils/storage';
import { Dashboard } from './components/Dashboard';
import { Vehicles } from './components/Vehicles';
import { Ledger } from './components/Ledger';
import { Reports } from './components/Reports';
import { Trips } from './components/Trips';
import { Pending } from './components/Pending';
import { Auth } from './components/Auth';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);

  // Close dropdown on click outside
  useEffect(() => {
    if (!profileDropdownOpen) return;
    const handleOutsideClick = () => {
      setProfileDropdownOpen(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [profileDropdownOpen]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auth check on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const user = await getMe();
          setCurrentUser(user);
        } catch (e) {
          console.error("Token invalid, logging out", e);
          localStorage.removeItem('token');
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  // Fetch data and auto-migrate when currentUser changes
  useEffect(() => {
    if (!currentUser) return;

    const initAndLoad = async () => {
      try {
        const localVehicles = localStorage.getItem('transport_acc_vehicles');
        const localTransactions = localStorage.getItem('transport_acc_transactions');
        const localTrips = localStorage.getItem('transport_acc_trips');

        if ((localVehicles && localVehicles !== '[]') || 
            (localTransactions && localTransactions !== '[]') || 
            (localTrips && localTrips !== '[]')) {
          
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

    initAndLoad();
  }, [currentUser]);

  const refreshData = async () => {
    const v = await getVehicles();
    const t = await getTransactions();
    setVehicles(v);
    setTransactions(t);
  };

  const handleLoginSuccess = (user: User, token: string) => {
    localStorage.setItem('token', token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setVehicles([]);
    setTransactions([]);
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

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        gap: '16px'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--border-color)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ fontWeight: 600 }}>Loading TransAccount...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

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

        <div className="top-navbar-user-section">
          <button 
            type="button"
            className={`profile-trigger-btn ${profileDropdownOpen ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setProfileDropdownOpen(prev => !prev);
            }}
            aria-haspopup="true"
            aria-expanded={profileDropdownOpen}
          >
            <div className="user-avatar">
              {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
            </div>
            <span className="profile-username">{currentUser.username}</span>
            <ChevronDown size={14} className="profile-chevron" />
          </button>

          {profileDropdownOpen && (
            <div className="profile-dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="dropdown-user-info">
                <span className="dropdown-user-label">Signed in as</span>
                <span className="dropdown-user-name">{currentUser.username}</span>
              </div>
              
              <button 
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setTheme(prev => prev === 'light' ? 'dark' : 'light');
                  setProfileDropdownOpen(false);
                }}
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>

              <div className="dropdown-divider"></div>

              <button
                type="button"
                className="dropdown-item dropdown-item-danger"
                onClick={() => {
                  handleLogout();
                  setProfileDropdownOpen(false);
                }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>

              <div className="dropdown-divider"></div>
              
              <div className="dropdown-footer">
                v1.0.0 (Local)
              </div>
            </div>
          )}
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
