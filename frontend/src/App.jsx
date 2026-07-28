import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';

const API_BASE = "https://roomrent-d2u0.onrender.com/api";

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'details', 'add_tenant'
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  
  // Data State
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    vacantRooms: 0,
    totalPendingRent: 0,
    totalPendingElectricity: 0
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomHistory, setRoomHistory] = useState([]);
  
  // Loading & Toast State
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Form State for Add Tenant
  const [tenantForm, setTenantForm] = useState({
    houseName: 'Old House', // 'Old House' or 'New House'
    roomSelectMode: 'existing', // 'existing' or 'custom'
    existingRoomNumber: '',
    customRoomNumber: '',
    tenantName: '',
    mobileNumber: '',
    aadhaarNumber: '',
    monthlyRent: '',
    joiningDate: new Date().toISOString().split('T')[0],
    previousMeterReading: '0'
  });

  // Form State for Electricity Bill calculation
  const [calcForm, setCalcForm] = useState({
    previousReading: '',
    currentReading: ''
  });

  // Show dynamic notification toast
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Fetch all rooms and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await fetch(`${API_BASE}/stats`);
      const roomsRes = await fetch(`${API_BASE}/rooms`);
      
      if (statsRes.ok && roomsRes.ok) {
        const statsData = await statsRes.json();
        const roomsData = await roomsRes.json();
        
        setStats(statsData);
        setRooms(roomsData);
        
        // Update vacant rooms dropdown list initial selection
        const vacantList = roomsData.filter(r => !r.occupied && r.houseName === tenantForm.houseName);
        if (vacantList.length > 0) {
          setTenantForm(prev => ({ ...prev, existingRoomNumber: vacantList[0].roomNumber }));
        } else {
          setTenantForm(prev => ({ ...prev, existingRoomNumber: '' }));
        }
      } else {
        showToast('⚠️ Failed to load database stats');
      }
    } catch (err) {
      showToast('⚠️ Backend server connection error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync vacant room choice when chosen house changes in form
  useEffect(() => {
    const vacantList = rooms.filter(r => !r.occupied && r.houseName === tenantForm.houseName);
    if (vacantList.length > 0) {
      setTenantForm(prev => ({ ...prev, existingRoomNumber: vacantList[0].roomNumber }));
    } else {
      setTenantForm(prev => ({ ...prev, existingRoomNumber: '' }));
    }
  }, [tenantForm.houseName, rooms]);

  // Fetch individual room details and its history logs
  const fetchRoomDetails = async (roomId) => {
    setLoading(true);
    try {
      const roomRes = await fetch(`${API_BASE}/rooms/${roomId}`);
      const historyRes = await fetch(`${API_BASE}/rooms/${roomId}/history`);
      
      if (roomRes.ok && historyRes.ok) {
        const roomData = await roomRes.json();
        const historyData = await historyRes.json();
        
        setSelectedRoom(roomData);
        setRoomHistory(historyData);
        setCalcForm({
          previousReading: roomData.previousMeterReading,
          currentReading: roomData.currentMeterReading || roomData.previousMeterReading
        });
      } else {
        showToast('⚠️ Failed to fetch room details');
      }
    } catch (err) {
      showToast('⚠️ Backend communication error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Back to dashboard handler
  const handleBackToDashboard = () => {
    fetchData();
    setCurrentView('dashboard');
    setSelectedRoom(null);
    setSelectedRoomId(null);
  };

  // Check details
  const handleRoomClick = (id) => {
    setSelectedRoomId(id);
    fetchRoomDetails(id);
    setCurrentView('details');
  };

  // Mark Rent Paid
  const handleMarkRentPaid = async () => {
    try {
      const res = await fetch(`${API_BASE}/rooms/${selectedRoomId}/mark-rent-paid`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('✅ Monthly Rent Marked as Paid');
        fetchRoomDetails(selectedRoomId);
      } else {
        showToast('❌ Failed to update rent status');
      }
    } catch (err) {
      showToast('⚠️ Communication error');
    }
  };

  // Mark Elect Paid
  const handleMarkElectricityPaid = async () => {
    try {
      const res = await fetch(`${API_BASE}/rooms/${selectedRoomId}/mark-electricity-paid`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('✅ Electricity Bill Marked as Paid');
        fetchRoomDetails(selectedRoomId);
      } else {
        showToast('❌ Failed to update electricity status');
      }
    } catch (err) {
      showToast('⚠️ Communication error');
    }
  };

  // Calculate bill logic
  const handleCalculateBill = async (e) => {
    e.preventDefault();
    const prev = parseFloat(calcForm.previousReading);
    const curr = parseFloat(calcForm.currentReading);
    
    if (isNaN(prev) || isNaN(curr)) {
      showToast('⚠️ Please enter valid numeric readings');
      return;
    }
    if (curr < prev) {
      showToast('⚠️ Current reading cannot be less than previous');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/rooms/${selectedRoomId}/calculate-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previousReading: prev,
          currentReading: curr
        })
      });
      
      if (res.ok) {
        showToast('⚡ Bill Calculated & Logged!');
        fetchRoomDetails(selectedRoomId);
      } else {
        const errorText = await res.text();
        showToast(`❌ Error: ${errorText}`);
      }
    } catch (err) {
      showToast('⚠️ Calculation server error');
    }
  };

  // Add new tenant submission
  const handleAddTenantSubmit = async (e) => {
    e.preventDefault();
    
    const roomNum = tenantForm.roomSelectMode === 'existing' 
      ? tenantForm.existingRoomNumber 
      : tenantForm.customRoomNumber;

    if (!roomNum || roomNum.trim() === '') {
      showToast('⚠️ Please specify a Room Number');
      return;
    }
    if (!tenantForm.tenantName || tenantForm.tenantName.trim() === '') {
      showToast('⚠️ Please specify tenant name');
      return;
    }
    if (!tenantForm.monthlyRent || parseFloat(tenantForm.monthlyRent) <= 0) {
      showToast('⚠️ Please enter a valid Rent Amount');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/rooms/add-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber: roomNum,
          houseName: tenantForm.houseName,
          tenantName: tenantForm.tenantName,
          mobileNumber: tenantForm.mobileNumber,
          aadhaarNumber: tenantForm.aadhaarNumber,
          monthlyRent: parseFloat(tenantForm.monthlyRent),
          joiningDate: tenantForm.joiningDate,
          previousMeterReading: parseFloat(tenantForm.previousMeterReading) || 0.0
        })
      });

      if (res.ok) {
        showToast('✅ Tenant Added & Room Occupied!');
        // Reset form
        setTenantForm({
          houseName: 'Old House',
          roomSelectMode: 'existing',
          existingRoomNumber: '',
          customRoomNumber: '',
          tenantName: '',
          mobileNumber: '',
          aadhaarNumber: '',
          monthlyRent: '',
          joiningDate: new Date().toISOString().split('T')[0],
          previousMeterReading: '0'
        });
        handleBackToDashboard();
      } else {
        showToast('❌ Failed to add tenant');
      }
    } catch (err) {
      showToast('⚠️ Network execution error');
    }
  };

  // Evict tenant handler
  const handleEvictTenant = async () => {
    if (!window.confirm(`Are you sure you want to remove the tenant from ${selectedRoom.roomNumber}? This will vacate the room.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/rooms/${selectedRoomId}/evict`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('🏠 Room vacated successfully');
        handleBackToDashboard();
      } else {
        showToast('❌ Failed to vacate room');
      }
    } catch (err) {
      showToast('⚠️ Network execution error');
    }
  };

  // Dynamic A4 PDF Builder using jsPDF
  const buildInvoicePDF = (roomObj, monthLabel, prevReading, currReading, unitsVal, elecBill, rentVal, totalVal, isPaid) => {
    const doc = new jsPDF('p', 'mm', 'a4'); // A4 size: 210 x 297mm
    
    // styles
    const primaryColor = "#1e3a8a"; // deep blue
    const darkText = "#1f2937";
    const lightText = "#6b7280";
    
    // Borders
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(8, 8, 194, 281);
    
    // Title Header Block
    doc.setFillColor(30, 58, 138); 
    doc.rect(8, 8, 194, 26, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("KASTURI RENTAL ROOMS - INVOICE", 105, 18, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Landlord Monthly Billing Ledger System", 105, 26, { align: "center" });
    
    // Metadata block
    doc.setTextColor(darkText);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BILL PARTICULARS", 16, 46);
    doc.setLineWidth(0.4);
    doc.setDrawColor(59, 130, 246);
    doc.line(16, 48, 60, 48);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Billing Month: ${monthLabel}`, 16, 55);
    doc.text(`Generated Date: ${new Date().toLocaleDateString('en-GB')}`, 16, 61);
    
    // Room details right align
    doc.setFont("helvetica", "bold");
    doc.text("HOUSE DETAILS", 115, 46);
    doc.line(115, 48, 160, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`House Sect: ${roomObj.houseName || 'Old House'}`, 115, 55);
    doc.text(`Room/Unit: ${roomObj.roomNumber}`, 115, 61);
    doc.text(`Address: ${roomObj.address || 'N/A'}`, 115, 67);
    
    // Line separator
    doc.setDrawColor(226, 232, 240);
    doc.line(16, 75, 194, 75);
    
    // Tenant section
    doc.setFont("helvetica", "bold");
    doc.text("TENANT DETAILS", 16, 85);
    doc.line(16, 87, 60, 87);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Tenant Name: ${roomObj.tenantName || 'N/A'}`, 16, 94);
    doc.text(`Mobile Number: ${roomObj.mobileNumber || 'N/A'}`, 16, 100);
    
    // Readings block
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(16, 110, 178, 24, "F");
    doc.rect(16, 110, 178, 24, "S");
    
    doc.setFont("helvetica", "bold");
    doc.text("Previous Reading", 24, 117);
    doc.text("Current Reading", 84, 117);
    doc.text("Units Consumed", 144, 117);
    
    doc.setFont("helvetica", "normal");
    doc.text(`${prevReading}`, 24, 126);
    doc.text(`${currReading}`, 84, 126);
    doc.text(`${unitsVal} units`, 144, 126);
    
    // Pricing Table description
    doc.setFillColor(30, 58, 138);
    doc.rect(16, 144, 178, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Charge Item", 22, 149);
    doc.text("Calculation Basis", 96, 149);
    doc.text("Amount (₹)", 168, 149);
    
    // Rows
    doc.setTextColor(darkText);
    doc.setFont("helvetica", "normal");
    
    // Row 1: Electricity
    doc.text("Electricity Power Dues", 22, 159);
    doc.text(`${unitsVal} units at ₹10/unit`, 96, 159);
    doc.text(`₹${elecBill}`, 168, 159);
    doc.line(16, 163, 194, 163);
    
    // Row 2: Rent
    doc.text("Monthly Rent", 22, 171);
    doc.text("Room monthly fixed rent", 96, 171);
    doc.text(`₹${rentVal}`, 168, 171);
    doc.line(16, 175, 194, 175);
    
    // Summary
    doc.setFillColor(241, 245, 249);
    doc.rect(16, 178, 178, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL OUTSTANDING CHARGES", 22, 184);
    doc.text(`₹${totalVal}`, 168, 184);
    
    // Status flag
    doc.setFontSize(11);
    doc.text("PAYMENT METHOD STATUS:", 16, 206);
    if (isPaid) {
      doc.setFillColor(209, 250, 229); 
      doc.rect(75, 200, 42, 8, "F");
      doc.setTextColor(5, 150, 105); 
      doc.rect(75, 200, 42, 8, "S");
      doc.text("PAID", 96, 206, { align: "center" });
    } else {
      doc.setFillColor(254, 226, 226);
      doc.rect(75, 200, 42, 8, "F");
      doc.setTextColor(220, 38, 38);
      doc.rect(75, 200, 42, 8, "S");
      doc.text("PENDING / DUE", 96, 206, { align: "center" });
    }
    
    // Footnote
    doc.setTextColor(lightText);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("This is a computer generated billing statement. Keep as proof of transaction details.", 105, 254, { align: "center" });
    doc.text("Old House Address: 65 Siddharth nagar | New House Address: A15 Haripuram Colony.", 105, 260, { align: "center" });
    
    return doc;
  };

  // PDF Trigger events
  const handleTriggerPDF = (actionType) => {
    if (!selectedRoom) return;
    
    const month = selectedRoomHistoryMonth() || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const prev = selectedRoom.previousMeterReading;
    const curr = selectedRoom.currentMeterReading || prev;
    const units = selectedRoom.unitsUsed;
    const bill = selectedRoom.electricityBill;
    const rent = selectedRoom.monthlyRent;
    const total = (selectedRoom.rentStatus !== 'PAID' ? rent : 0) + (selectedRoom.electricityStatus !== 'PAID' ? bill : 0);
    const paid = selectedRoom.rentStatus === 'PAID' && selectedRoom.electricityStatus === 'PAID';

    const doc = buildInvoicePDF(selectedRoom, month, prev, curr, units, bill, rent, total, paid);
    
    if (actionType === 'download') {
      doc.save(`Bill_${selectedRoom.houseName}_Room_${selectedRoom.roomNumber}_${month}.pdf`);
      showToast("📥 Bill PDF downloaded successfully!");
    } else if (actionType === 'print') {
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
      showToast("🖨️ Bill print file parsed!");
    } else if (actionType === 'share') {
      try {
        const blob = doc.output('blob');
        const file = new File([blob], `Bill_${selectedRoom.roomNumber}.pdf`, { type: 'application/pdf' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: `Room Bill - ${selectedRoom.roomNumber}`,
            text: `Electricity & Rent bill statement for ${selectedRoom.roomNumber} - ${month}`
          })
          .then(() => showToast("📱 Sharing completed!"))
          .catch((err) => {
            console.warn(err);
            showToast("⚠️ Sharing cancelled or failed.");
          });
        } else {
          showToast("📱 Mobile Share not supported. Downloading instead...");
          doc.save(`Bill_${selectedRoom.houseName}_Room_${selectedRoom.roomNumber}_${month}.pdf`);
        }
      } catch (err) {
        showToast("⚠️ Error while sharing PDF.");
      }
    }
  };

  // History PDF trigger
  const handleHistoryPDF = (hist) => {
    if (!selectedRoom) return;
    
    const paid = hist.status === 'Paid';
    const doc = buildInvoicePDF(
      selectedRoom,
      hist.month,
      hist.previousReading,
      hist.currentReading,
      hist.unitsUsed,
      hist.electricityBill,
      hist.rent,
      hist.total,
      paid
    );
    
    doc.save(`Bill_History_${selectedRoom.roomNumber}_${hist.month}.pdf`);
    showToast("📥 Historical Bill PDF downloaded!");
  };

  // Helper to find month tag
  const selectedRoomHistoryMonth = () => {
    if (roomHistory.length > 0) {
      return roomHistory[0].month;
    }
    return null;
  };

  // Room card renderer utility
  const renderRoomCard = (room) => {
    return (
      <div 
        key={room.id} 
        className="room-card"
        onClick={() => handleRoomClick(room.id)}
      >
        <div className="room-card-left">
          <span className="room-card-number">{room.roomNumber}</span>
          {room.description && (
            <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 'bold' }}>
              📝 {room.description}
            </span>
          )}
          {room.floor && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              🏢 {room.floor}
            </span>
          )}
          {room.occupied ? (
            <>
              <span className="room-card-tenant">👤 {room.tenantName}</span>
              <span className="room-card-rent">Rent: ₹{room.monthlyRent}</span>
            </>
          ) : (
            <span className="room-card-tenant" style={{ color: 'var(--text-light)' }}>
              No Tenant
            </span>
          )}
        </div>

        <div className="room-card-right">
          {room.occupied ? (
            <>
              <span className="badge badge-occupied">Occupied</span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span className={`badge ${room.rentStatus === 'PAID' ? 'badge-paid' : 'badge-due'}`}>
                  {room.rentStatus === 'PAID' ? 'Rent Paid' : 'Rent Due'}
                </span>
                {room.electricityBill > 0 && (
                  <span className={`badge ${room.electricityStatus === 'PAID' ? 'badge-paid' : 'badge-due'}`}>
                    {room.electricityStatus === 'PAID' ? 'Elec Paid' : 'Elec Due'}
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="badge badge-vacant">Vacant</span>
          )}
        </div>
      </div>
    );
  };

  // Render Stats Grid
  const renderStats = () => {
    return (
      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-label">Total Rooms</span>
          <span className="stat-value">{stats.totalRooms}</span>
          <span className="stat-meta">🏠 properties</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Occupied / Vacant</span>
          <span className="stat-value">{stats.occupiedRooms} / {stats.vacantRooms}</span>
          <span className="stat-meta">👥 tenants loaded</span>
        </div>
        <div className="stat-box pending-rent">
          <span className="stat-label">Pending Rent</span>
          <span className="stat-value">₹{stats.totalPendingRent}</span>
          <span className="stat-meta">💵 due this month</span>
        </div>
        <div className="stat-box pending-elec">
          <span className="stat-label">Pending Elec</span>
          <span className="stat-value">₹{stats.totalPendingElectricity}</span>
          <span className="stat-meta">⚡ meter bills due</span>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Dynamic Header */}
      <header className="app-header">
        <div className="header-title-row">
          {currentView !== 'dashboard' && (
            <button className="back-btn" onClick={handleBackToDashboard}>
              🔙
            </button>
          )}
          <div>
            <h1 className="header-title">
              {currentView === 'dashboard' && 'Kasturi Rental Rooms'}
              {currentView === 'details' && `${selectedRoom?.roomNumber || 'Room Details'}`}
              {currentView === 'add_tenant' && 'Add New Tenant'}
            </h1>
            <p className="header-subtitle">
              {currentView === 'dashboard' && 'Personal Landlord Dashboard'}
              {currentView === 'details' && `${selectedRoom?.tenantName ? '👤 ' + selectedRoom.tenantName : 'Vacant Room'}`}
              {currentView === 'add_tenant' && 'Setup tenant into room'}
            </p>
          </div>
          <div>{loading ? '⏳' : '✅'}</div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="app-content">
        
        {/* 1. DASHBOARD VIEW */}
        {currentView === 'dashboard' && (
          <>
            {renderStats()}
            
            <div className="section-title">
              <span>House Partition List</span>
              <button 
                className="badge badge-occupied" 
                style={{ cursor: 'pointer', border: 'none', padding: '8px 16px' }}
                onClick={() => setCurrentView('add_tenant')}
              >
                ➕ Add Tenant
              </button>
            </div>

            {/* Old House Group block */}
            <div className="house-section-card" style={{
              background: 'linear-gradient(135deg, #ffffff, #fdfdfd)',
              border: '1px solid var(--slate-200)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-dark)' }}>🏠 Old House</span>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📍 65 Siddharth nagar thatipur</div>
              </div>
              
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)', borderLeft: '3px solid var(--primary)', paddingLeft: '8px', marginTop: '4px' }}>
                🏢 Ground Floor
              </div>
              <div className="room-list-container">
                {rooms.filter(r => r.houseName === 'Old House' && r.floor === 'Ground Floor').map(room => renderRoomCard(room))}
              </div>
              
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)', borderLeft: '3px solid var(--primary)', paddingLeft: '8px', marginTop: '8px' }}>
                🏢 First Floor
              </div>
              <div className="room-list-container">
                {rooms.filter(r => r.houseName === 'Old House' && r.floor === 'First Floor').map(room => renderRoomCard(room))}
              </div>

              {rooms.some(r => r.houseName === 'Old House' && r.floor !== 'Ground Floor' && r.floor !== 'First Floor') && (
                <>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)', borderLeft: '3px solid var(--primary)', paddingLeft: '8px', marginTop: '8px' }}>
                    🏢 Other / Unassigned
                  </div>
                  <div className="room-list-container">
                    {rooms.filter(r => r.houseName === 'Old House' && r.floor !== 'Ground Floor' && r.floor !== 'First Floor').map(room => renderRoomCard(room))}
                  </div>
                </>
              )}
            </div>

            {/* New House Group block */}
            <div className="house-section-card" style={{
              background: 'linear-gradient(135deg, #ffffff, #fdfdfd)',
              border: '1px solid var(--slate-200)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-dark)' }}>🏠 New House</span>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📍 A15 Haripuram Colony New Suresh nagar</div>
              </div>
              <div className="room-list-container">
                {rooms.filter(r => r.houseName === 'New House').map(room => renderRoomCard(room))}
              </div>
            </div>
          </>
        )}

        {/* 2. ROOM DETAILS VIEW */}
        {currentView === 'details' && selectedRoom && (
          <div style={{ display: 'flex', flex: 'col', flexDirection: 'column', gap: '16px' }}>
            
            {!selectedRoom.occupied ? (
              <div className="detail-card" style={{ gap: '12px' }}>
                <span style={{ fontSize: '18px', fontWeight: '800', textAlign: 'center' }}>
                  🏠 This room is vacant!
                </span>
                <span className="detail-label" style={{ textAlign: 'center' }}>
                  Choose "Add Tenant" from dashboard, or occupy it now.
                </span>
                <button 
                  className="btn-large btn-primary"
                  onClick={() => {
                    setTenantForm(prev => ({ 
                      ...prev, 
                      houseName: selectedRoom.houseName || 'Old House',
                      roomSelectMode: 'existing', 
                      existingRoomNumber: selectedRoom.roomNumber 
                    }));
                    setCurrentView('add_tenant');
                  }}
                >
                  ➕ Setup Tenant Here
                </button>
              </div>
            ) : (
              <>
                {/* Personal Info details */}
                <div className="detail-card">
                  <div className="detail-header">
                    <span style={{ fontWeight: '800', fontSize: '18px' }}>Tenant Profile</span>
                    <span className="badge badge-occupied">Occupied</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">House Sector</span>
                    <span className="detail-val">{selectedRoom.houseName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Room Number</span>
                    <span className="detail-val">{selectedRoom.roomNumber}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Tenant Name</span>
                    <span className="detail-val">{selectedRoom.tenantName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Mobile Number</span>
                    <span className="detail-val">📞 {selectedRoom.mobileNumber || 'Not provided'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Aadhaar Number</span>
                    <span className="detail-val">💳 {selectedRoom.aadhaarNumber || 'Not provided'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Joining Date</span>
                    <span className="detail-val">📅 {selectedRoom.joiningDate}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Monthly Rent</span>
                    <span className="detail-val">₹{selectedRoom.monthlyRent}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Security Deposit</span>
                    <span className="detail-val">₹{selectedRoom.securityDeposit}</span>
                  </div>
                  {selectedRoom.notes && (
                    <div style={{ marginTop: '12px' }}>
                      <span className="form-label" style={{ fontSize: '12px' }}>Notes:</span>
                      <div className="notes-text">{selectedRoom.notes}</div>
                    </div>
                  )}
                </div>

                {/* Dues and Payments buttons */}
                <div className="detail-card">
                  <div className="detail-header">
                    <span style={{ fontWeight: '800', fontSize: '18px' }}>Payment Dues Summary</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>Auto updating</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Current Rent Dues</span>
                    <span className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${selectedRoom.rentStatus === 'PAID' ? 'badge-paid' : 'badge-due'}`}>
                        {selectedRoom.rentStatus === 'PAID' ? 'PAID' : 'DUE'}
                      </span>
                      {selectedRoom.rentStatus !== 'PAID' && `₹${selectedRoom.monthlyRent}`}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Electricity Bill Due</span>
                    <span className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${selectedRoom.electricityStatus === 'PAID' ? 'badge-paid' : 'badge-due'}`}>
                        {selectedRoom.electricityStatus === 'PAID' ? 'PAID' : 'DUE'}
                      </span>
                      {selectedRoom.electricityStatus !== 'PAID' && `₹${selectedRoom.electricityBill}`}
                    </span>
                  </div>

                  <div className="detail-row" style={{ backgroundColor: 'var(--slate-50)', padding: '12px 10px', borderRadius: '8px' }}>
                    <span className="detail-label" style={{ fontWeight: '700', color: 'var(--text-main)' }}>Total Bill Amount</span>
                    <span className="detail-val detail-val-highlight">
                      ₹{
                        (selectedRoom.rentStatus !== 'PAID' ? selectedRoom.monthlyRent : 0) + 
                        (selectedRoom.electricityStatus !== 'PAID' ? selectedRoom.electricityBill : 0)
                      }
                    </span>
                  </div>

                  <div className="flex-row-2">
                    <button 
                      className="btn-large btn-success" 
                      onClick={handleMarkRentPaid}
                      disabled={selectedRoom.rentStatus === 'PAID'}
                      style={{ opacity: selectedRoom.rentStatus === 'PAID' ? 0.6 : 1 }}
                    >
                      ✅ Mark Rent Paid
                    </button>
                    <button 
                      className="btn-large btn-success" 
                      onClick={handleMarkElectricityPaid}
                      disabled={selectedRoom.electricityStatus === 'PAID'}
                      style={{ opacity: selectedRoom.electricityStatus === 'PAID' ? 0.6 : 1 }}
                    >
                      ✅ Mark Elec Paid
                    </button>
                  </div>
                </div>

                {/* Calculate Electricity Bill Section */}
                <div className="detail-card">
                  <div className="detail-header" style={{ marginBottom: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '18px' }}>⚡ Electricity Calculator</span>
                    <span className="badge badge-vacant" style={{ textTransform: 'none' }}>Rate: ₹10/unit</span>
                  </div>

                  <form onSubmit={handleCalculateBill} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '12.5px' }}>Prev Reading</label>
                        <input
                          type="number"
                          className="form-input"
                          value={calcForm.previousReading}
                          onChange={(e) => setCalcForm(prev => ({ ...prev, previousReading: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '12.5px' }}>Current Reading</label>
                        <input
                          type="number"
                          className="form-input"
                          value={calcForm.currentReading}
                          onChange={(e) => setCalcForm(prev => ({ ...prev, currentReading: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    {parseFloat(calcForm.currentReading) >= parseFloat(calcForm.previousReading) && (
                      <div style={{ margin: '4px 0', padding: '8px', border: '1px solid var(--primary-light)', backgroundColor: 'var(--slate-50)', borderRadius: '8px', fontSize: '13px' }}>
                        📊 <b>Units Used:</b> {parseFloat(calcForm.currentReading) - parseFloat(calcForm.previousReading)} units | <b>Amount:</b> ₹{(parseFloat(calcForm.currentReading) - parseFloat(calcForm.previousReading)) * 10}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button type="submit" className="btn-large btn-primary" style={{ flex: 1 }}>
                        ⚡ Calculate Bill
                      </button>
                    </div>
                  </form>
                </div>

                {/* PDF Actions Panel */}
                <div className="detail-card" style={{ border: '1.5px dashed var(--primary)', backgroundColor: '#fdfdfd' }}>
                  <div className="detail-header" style={{ marginBottom: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--primary-dark)' }}>📄 PDF Invoice Actions</span>
                    <span className="badge badge-occupied" style={{ fontSize: '10px' }}>PDF Engine</span>
                  </div>
                  
                  <span className="detail-label" style={{ marginBottom: '14px', fontSize: '12.5px' }}>
                    Generate print-friendly A4 Invoice for rent and power billing.
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      type="button" 
                      className="btn-large btn-success" 
                      onClick={() => handleTriggerPDF('download')}
                    >
                      ✅ Download Bill PDF
                    </button>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button 
                        type="button" 
                        className="btn-large btn-primary" 
                        style={{ padding: '12px', fontSize: '14px' }}
                        onClick={() => handleTriggerPDF('print')}
                      >
                        🖨️ Print PDF
                      </button>
                      <button 
                        type="button" 
                        className="btn-large btn-primary" 
                        style={{ padding: '12px', fontSize: '14px' }}
                        onClick={() => handleTriggerPDF('share')}
                      >
                        📱 Share PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Room History Section */}
                <div className="history-section">
                  <span className="section-title">📊 Billing Logs History</span>
                  
                  {roomHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-light)', border: '1px dashed var(--slate-200)', borderRadius: '16px', backgroundColor: 'white' }}>
                      No history logs found for this room.
                    </div>
                  ) : (
                    roomHistory.map(hist => (
                      <div key={hist.id} className="history-card">
                        <div className="history-card-header">
                          <span>{hist.month}</span>
                          <span className={`badge ${hist.status === 'Paid' ? 'badge-paid' : 'badge-due'}`}>
                            {hist.status}
                          </span>
                        </div>
                        <div className="history-card-row">
                          <span>Meter Readings</span>
                          <span style={{ fontWeight: 'bold' }}>
                            {hist.previousReading} ➔ {hist.currentReading}
                          </span>
                        </div>
                        <div className="history-card-row">
                          <span>Units Used</span>
                          <span>{hist.unitsUsed} units</span>
                        </div>
                        <div className="history-card-row">
                          <span>Electricity Bill</span>
                          <span>₹{hist.electricityBill}</span>
                        </div>
                        <div className="history-card-row">
                          <span>Rent</span>
                          <span>₹{hist.rent}</span>
                        </div>
                        <div className="history-card-row" style={{ fontWeight: 'bold', color: 'var(--text-main)', borderTop: '1px solid var(--slate-100)', paddingTop: '4px' }}>
                          <span>Total Dues</span>
                          <span>₹{hist.total}</span>
                        </div>
                        {hist.paymentDate && (
                          <div className="history-card-row" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                            <span>Payment Date</span>
                            <span>📅 {hist.paymentDate}</span>
                          </div>
                        )}
                        <div style={{ marginTop: '10px' }}>
                          <button 
                            type="button" 
                            className="btn-large btn-secondary" 
                            style={{ padding: '10px', fontSize: '13px' }}
                            onClick={() => handleHistoryPDF(hist)}
                          >
                            📄 Download PDF Bill
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Danger Zone */}
                <button 
                  className="btn-large btn-danger" 
                  onClick={handleEvictTenant}
                  style={{ marginTop: '24px' }}
                >
                  ❌ Remove / Evict Tenant
                </button>
              </>
            )}
          </div>
        )}

        {/* 3. ADD TENANT VIEW */}
        {currentView === 'add_tenant' && (
          <form className="form-card" onSubmit={handleAddTenantSubmit}>
            
            <div className="form-group">
              <label className="form-label">Select House Sector</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn-large ${tenantForm.houseName === 'Old House' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '12px' }}
                  onClick={() => setTenantForm(prev => ({ ...prev, houseName: 'Old House' }))}
                >
                  🏠 Old House
                </button>
                <button
                  type="button"
                  className={`btn-large ${tenantForm.houseName === 'New House' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '12px' }}
                  onClick={() => setTenantForm(prev => ({ ...prev, houseName: 'New House' }))}
                >
                  🏠 New House
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Room Allocation Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn-large ${tenantForm.roomSelectMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '12px' }}
                  onClick={() => setTenantForm(prev => ({ ...prev, roomSelectMode: 'existing' }))}
                >
                  Vacant Rooms
                </button>
                <button
                  type="button"
                  className={`btn-large ${tenantForm.roomSelectMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '12px' }}
                  onClick={() => setTenantForm(prev => ({ ...prev, roomSelectMode: 'custom' }))}
                >
                  New Room Number
                </button>
              </div>
            </div>

            {tenantForm.roomSelectMode === 'existing' ? (
              <div className="form-group">
                <label className="form-label">Select Vacant Room</label>
                {rooms.filter(r => !r.occupied && r.houseName === tenantForm.houseName).length === 0 ? (
                  <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 'bold' }}>
                    ⚠️ All rooms in this house are occupied! Switch to "New Room Number" mode.
                  </div>
                ) : (
                  <select 
                    className="form-input"
                    value={tenantForm.existingRoomNumber}
                    onChange={(e) => setTenantForm(prev => ({ ...prev, existingRoomNumber: e.target.value }))}
                    required
                  >
                    {rooms.filter(r => !r.occupied && r.houseName === tenantForm.houseName).map(room => (
                      <option key={room.id} value={room.roomNumber}>
                        {room.roomNumber} {room.description ? `(${room.description})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Room/Unit Number (e.g. Shop, Room 5)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Room/Shop Number"
                  value={tenantForm.customRoomNumber}
                  onChange={(e) => setTenantForm(prev => ({ ...prev, customRoomNumber: e.target.value }))}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Tenant Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Full Name"
                value={tenantForm.tenantName}
                onChange={(e) => setTenantForm(prev => ({ ...prev, tenantName: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="Enter 10-digit number"
                value={tenantForm.mobileNumber}
                onChange={(e) => setTenantForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Aadhaar Card Number (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 12-digit number"
                value={tenantForm.aadhaarNumber}
                onChange={(e) => setTenantForm(prev => ({ ...prev, aadhaarNumber: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Rent Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 5000"
                value={tenantForm.monthlyRent}
                onChange={(e) => setTenantForm(prev => ({ ...prev, monthlyRent: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Joining Date</label>
              <input
                type="date"
                className="form-input"
                value={tenantForm.joiningDate}
                onChange={(e) => setTenantForm(prev => ({ ...prev, joiningDate: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Meter Reading (Previous Reading)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 1024"
                value={tenantForm.previousMeterReading}
                onChange={(e) => setTenantForm(prev => ({ ...prev, previousMeterReading: e.target.value }))}
                required
              />
            </div>

            <button type="submit" className="btn-large btn-success" style={{ marginTop: '12px' }}>
              👤 Save & Allocate Room
            </button>
          </form>
        )}

      </main>

      {/* Floating status alert notification toast */}
      {toastMessage && (
        <div className="toast">
          <span>ℹ️</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
