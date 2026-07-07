import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Phone, User, X, Truck } from 'lucide-react';
import type { Vehicle } from '../types';
import { addVehicle, updateVehicle, deleteVehicle } from '../utils/storage';

interface VehiclesProps {
  vehicles: Vehicle[];
  refreshData: () => void;
  setVehicles?: React.Dispatch<React.SetStateAction<Vehicle[]>>;
}

export const Vehicles: React.FC<VehiclesProps> = ({ 
  vehicles,
  refreshData,
  setVehicles
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);

  // Form states
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [type, setType] = useState('10-Wheeler Truck');
  const [status, setStatus] = useState<'Active' | 'Maintenance'>('Active');

  const resetForm = () => {
    setVehicleNumber('');
    setDriverName('');
    setDriverPhone('');
    setOwnerName('');
    setType('10-Wheeler Truck');
    setStatus('Active');
  };

  const formatVehicleNumber = (val: string) => {
    let cleaned = val.trim().toUpperCase();
    const regex = /^([A-Z]{2})-([0-9]{2})(-[A-Z0-9].*)$/;
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '$1$2$3');
    }
    return cleaned;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) return;

    await addVehicle({
      vehicleNumber: formatVehicleNumber(vehicleNumber),
      driverName: driverName.trim() || 'Not Assigned',
      driverPhone: driverPhone.trim() || '-',
      ownerName: ownerName.trim() || 'Self',
      type,
      status,
    });

    resetForm();
    setIsAddModalOpen(false);
    refreshData();
  };

  const openEditModal = (vehicle: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click
    setCurrentVehicle(vehicle);
    setVehicleNumber(vehicle.vehicleNumber);
    setDriverName(vehicle.driverName || '');
    setDriverPhone(vehicle.driverPhone || '');
    setOwnerName(vehicle.ownerName || '');
    setType(vehicle.type);
    setStatus(vehicle.status);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVehicle || !vehicleNumber.trim()) return;

    const updatedVehicle = {
      ...currentVehicle,
      vehicleNumber: formatVehicleNumber(vehicleNumber),
      driverName: driverName.trim() || 'Not Assigned',
      driverPhone: driverPhone.trim() || '-',
      ownerName: ownerName.trim() || 'Self',
      type,
      status,
    };

    if (setVehicles) {
      setVehicles(prev => prev.map(v => v.id === currentVehicle.id ? updatedVehicle : v));
    }

    resetForm();
    setIsEditModalOpen(false);
    setCurrentVehicle(null);

    updateVehicle(updatedVehicle).then(() => {
      refreshData();
    });
  };

  const handleDelete = async (id: string, number: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click
    const confirmed = window.confirm(`Are you sure you want to delete vehicle ${number}? All related ledger transaction history will be permanently deleted!`);
    if (confirmed) {
      if (setVehicles) {
        setVehicles(prev => prev.filter(v => v.id !== id));
      }
      deleteVehicle(id).then(() => {
        refreshData();
      });
    }
  };





  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1>My Vehicle</h1>
          <p className="page-subtitle">Manage registered vehicles, edit details, and view current account standings.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={20} />
          Register Vehicle
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="empty-state">
          <Truck className="empty-state-icon" size={60} />
          <div className="empty-state-title">No vehicles registered yet</div>
          <p className="empty-state-desc">Get started by registering a new vehicle number to track fuel expenses, trip incomes, and balance statements.</p>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            Register First Vehicle
          </button>
        </div>
      ) : (
        <div className="vehicle-grid">
          {vehicles.map((v) => {
            return (
              <div 
                key={v.id} 
                className="card vehicle-card"
                style={{ cursor: 'default' }}
              >
                <div className="vehicle-card-accent" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="vehicle-card-num">{v.vehicleNumber}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px' }}
                      onClick={(e) => openEditModal(v, e)}
                      title="Edit vehicle details"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      style={{ padding: '6px' }}
                      onClick={(e) => handleDelete(v.id, v.vehicleNumber, e)}
                      title="Delete vehicle and ledger history"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="vehicle-card-info">
                  <div>
                    <div className="vehicle-card-label">Driver</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)' }}>
                      <User size={12} />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{v.driverName}</span>
                    </div>
                  </div>
                  <div>
                    <div className="vehicle-card-label">Phone</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)' }}>
                      <Phone size={12} />
                      <span>{v.driverPhone}</span>
                    </div>
                  </div>
                </div>

                {/* No ledger button */}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Truck size={20} className="amount-income" />
                Register New Vehicle
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => { setIsAddModalOpen(false); resetForm(); }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Vehicle Registration Number *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="E.g. MH-12-PQ-9876" 
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Driver Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="E.g. Rajesh Kumar" 
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Driver Mobile</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      placeholder="E.g. 9876543210" 
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAddModalOpen(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit2 size={20} className="amount-income" />
                Edit Vehicle Details
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => { setIsEditModalOpen(false); resetForm(); }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Vehicle Registration Number *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="E.g. MH-12-PQ-9876" 
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Driver Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="E.g. Rajesh Kumar" 
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Driver Mobile</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      placeholder="E.g. 9876543210" 
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsEditModalOpen(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
