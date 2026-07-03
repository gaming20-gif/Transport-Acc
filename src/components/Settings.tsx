import React, { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { exportData, importData, initSampleData } from '../utils/storage';

interface SettingsProps {
  refreshData: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ refreshData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showNotification = (message: string, isError = false) => {
    if (isError) {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleExport = async () => {
    try {
      const dataStr = await exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `transport_accounts_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('Database backup exported successfully!');
    } catch (e) {
      showNotification('Failed to export backup.', true);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        const success = await importData(result);
        if (success) {
          showNotification('Database restored successfully from backup!');
          refreshData();
        } else {
          showNotification('Invalid backup file. Import failed.', true);
        }
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  const handleResetSample = async () => {
    const confirmed = window.confirm('Are you sure you want to load sample data? This will overwrite your current vehicles and transactions ledger data.');
    if (confirmed) {
      await initSampleData();
      refreshData();
      showNotification('Sample transport data loaded successfully.');
    }
  };

  const handleClearAll = () => {
    const confirmed = window.confirm('WARNING: Are you sure you want to permanently erase ALL data? This will clear all vehicles and ledger records. This action CANNOT be undone.');
    if (confirmed) {
      localStorage.clear();
      refreshData();
      showNotification('All local data cleared successfully.', false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Settings</h1>
          <p className="page-subtitle">Manage accounts database, perform manual backups, restore registries, or clear system storage.</p>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="card" style={{ background: 'var(--color-success-bg)', borderColor: 'rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
          <CheckCircle2 color="var(--color-success)" />
          <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="card" style={{ background: 'var(--color-danger-bg)', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
          <AlertTriangle color="var(--color-danger)" />
          <span style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{errorMessage}</span>
        </div>
      )}

      <div className="card settings-section">
        <h3 className="card-title">Database Maintenance</h3>
        
        {/* Export Box */}
        <div className="settings-box">
          <div className="settings-box-details">
            <span className="settings-box-title">Backup Database</span>
            <span className="settings-box-desc">Download a local JSON copy of your registered vehicles list and complete transaction entries. Save this file to secure your data.</span>
          </div>
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={18} />
            Export Backup File
          </button>
        </div>

        {/* Import Box */}
        <div className="settings-box">
          <div className="settings-box-details">
            <span className="settings-box-title">Restore Database</span>
            <span className="settings-box-desc">Upload a previously saved `.json` database file to recover transactions and vehicle details. Warning: This will overwrite current data.</span>
          </div>
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".json"
              onChange={handleFileChange}
            />
            <button className="btn btn-secondary" onClick={handleImportClick}>
              <Upload size={18} />
              Import Backup File
            </button>
          </div>
        </div>

        {/* Load Sample Box */}
        <div className="settings-box">
          <div className="settings-box-details">
            <span className="settings-box-title">Load Sample Transport Data</span>
            <span className="settings-box-desc">Seed the local storage with mock vehicles, diesel bills, toll payments, and driver salaries. Great for testing features.</span>
          </div>
          <button className="btn btn-secondary" onClick={handleResetSample}>
            <RotateCcw size={18} />
            Load Sample Data
          </button>
        </div>

        {/* Clear Box */}
        <div className="settings-box" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div className="settings-box-details">
            <span className="settings-box-title" style={{ color: 'var(--color-danger)' }}>Clear All Records</span>
            <span className="settings-box-desc">Permanently wipe all vehicle ledger accounts. Ensure you have exported a backup file first if you want to recover this data.</span>
          </div>
          <button className="btn btn-outline-danger" onClick={handleClearAll}>
            <Trash2 size={18} />
            Delete All Accounts
          </button>
        </div>
      </div>
    </div>
  );
};
