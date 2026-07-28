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

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    roomNumber: '',
    houseName: 'Old House',
    floor: '',
    description: '',
    occupied: false,
    tenantName: '',
    mobileNumber: '',
    aadhaarNumber: '',
    joiningDate: '',
    monthlyRent: '0',
    securityDeposit: '0',
    notes: '',
    membersCount: '',
    previousMeterReading: '0',
    currentMeterReading: '0',
    rentStatus: 'PAID',
    electricityStatus: 'PAID'
  });
  
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
    previousMeterReading: '0',
    membersCount: ''
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
          previousMeterReading: parseFloat(tenantForm.previousMeterReading) || 0.0,
          membersCount: tenantForm.membersCount
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
          previousMeterReading: '0',
          membersCount: ''
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

  // Open Edit Modal
  const handleOpenEditModal = (room) => {
    let formattedDate = '';
    if (room.joiningDate) {
      if (Array.isArray(room.joiningDate)) {
        const [y, m, d] = room.joiningDate;
        formattedDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      } else if (typeof room.joiningDate === 'string') {
        formattedDate = room.joiningDate.split('T')[0];
      }
    }

    setEditForm({
      id: room.id,
      roomNumber: room.roomNumber || '',
      houseName: room.houseName || 'Old House',
      floor: room.floor || '',
      description: room.description || '',
      occupied: room.occupied || false,
      tenantName: room.tenantName || '',
      mobileNumber: room.mobileNumber || '',
      aadhaarNumber: room.aadhaarNumber || '',
      joiningDate: formattedDate,
      monthlyRent: room.monthlyRent || '0',
      securityDeposit: room.securityDeposit || '0',
      notes: room.notes || '',
      membersCount: room.membersCount || '',
      previousMeterReading: room.previousMeterReading || '0',
      currentMeterReading: room.currentMeterReading || '0',
      rentStatus: room.rentStatus || 'PAID',
      electricityStatus: room.electricityStatus || 'PAID'
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Form
  const handleEditRoomSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.roomNumber || editForm.roomNumber.trim() === '') {
      showToast('⚠️ Please enter Room Number');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rooms/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          monthlyRent: parseFloat(editForm.monthlyRent) || 0.0,
          securityDeposit: parseFloat(editForm.securityDeposit) || 0.0,
          previousMeterReading: parseFloat(editForm.previousMeterReading) || 0.0,
          currentMeterReading: parseFloat(editForm.currentMeterReading) || 0.0,
          occupied: editForm.occupied
        })
      });
      if (res.ok) {
        showToast('✅ Room updated successfully!');
        setIsEditModalOpen(false);
        fetchRoomDetails(editForm.id); // Reload room data
      } else {
        const errorText = await res.text();
        showToast(`❌ Update failed: ${errorText || 'Server error'}`);
      }
    } catch (err) {
      showToast('⚠️ Connection error during edit');
    } finally {
      setLoading(false);
    }
  };

  // Delete Room completely
  const handleDeleteRoom = async () => {
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to delete Room "${selectedRoom.roomNumber}" completely? This will permanently delete all metadata and monthly billing history logs for this room. This action cannot be undone.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rooms/${selectedRoom.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('🗑️ Room deleted successfully');
        handleBackToDashboard(); // Return to main page
      } else {
        showToast('❌ Failed to delete room');
      }
    } catch (err) {
      showToast('⚠️ Connection error during delete');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic A4 PDF Builder using jsPDF
  const buildInvoicePDF = (roomObj, monthLabel, prevReading, currReading, unitsVal, elecBill, rentVal, totalVal, isRentPaid, isElecPaid) => {
    const doc = new jsPDF('p', 'mm', 'a4'); // A4 size: 210 x 297mm
    
    // styles
    const darkText = "#1f2937";
    const lightText = "#6b7280";
    
    // Title Header Block
    doc.setFillColor(11, 58, 130); 
    doc.rect(10, 8, 190, 28, "F");
    
    // Circle wrapper with "K" inside it
    doc.setFillColor(255, 255, 255);
    doc.circle(20, 22, 6.5, "F");
    doc.setTextColor(11, 58, 130);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("K", 20, 26, { align: "center" });

    // Text Header
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("KASTURI RENTAL ROOMS", 29, 18);
    doc.setFontSize(13);
    doc.text("INVOICE", 29, 23.5);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("Landlord Monthly Billing Ledger System", 29, 29);
    
    // Right Columns Header Details
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Billing Month", 135, 16);
    doc.text("Generated Date", 135, 22);
    doc.text("Invoice ID", 135, 28);

    const invoiceId = `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(roomObj.id || 0).padStart(3, '0')}`;
    doc.setFont("helvetica", "bold");
    doc.text(`:   ${monthLabel}`, 162, 16);
    doc.text(`:   ${new Date().toLocaleDateString('en-GB')}`, 162, 22);
    doc.text(`:   ${invoiceId}`, 162, 28);
    
    // Tenant section Card
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, 39, 190, 18, 2, 2, "FD");

    // Avatar badge
    doc.setFillColor(239, 246, 255);
    doc.circle(20, 48, 5.5, "F");
    doc.setTextColor(11, 58, 130);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("T", 20, 51.2, { align: "center" });

    // Label and Values
    doc.setFontSize(8.5);
    doc.text("TENANT DETAILS", 28, 44);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightText);
    doc.text("Tenant Name", 28, 51);
    doc.text("Mobile Number", 110, 51);

    doc.setTextColor(darkText);
    doc.setFont("helvetica", "bold");
    doc.text(`:   ${roomObj.tenantName || 'N/A'}`, 51, 51);
    doc.text(`:   ${roomObj.mobileNumber || 'N/A'}`, 133, 51);

    // Bill Particulars & House Details (Side & Side Cards)
    // Left Card
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, 60, 93, 22, 2, 2, "S");
    doc.setFillColor(239, 246, 255);
    doc.circle(16, 67, 3.5, "F");
    doc.setTextColor(11, 58, 130);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("B", 16, 69.8, { align: "center" });

    doc.text("BILL PARTICULARS", 22, 68);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightText);
    doc.text("Billing Month", 16, 75);
    doc.text("Generated Date", 16, 79);

    doc.setTextColor(darkText);
    doc.text(`:  ${monthLabel}`, 40, 75);
    doc.text(`:  ${new Date().toLocaleDateString('en-GB')}`, 40, 79);

    // Right Card
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(107, 60, 93, 22, 2, 2, "S");
    doc.setFillColor(239, 246, 255);
    doc.circle(113, 67, 3.5, "F");
    doc.setTextColor(11, 58, 130);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("H", 113, 69.8, { align: "center" });

    doc.text("HOUSE DETAILS", 119, 68);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightText);
    doc.text("House Sect", 113, 75);
    doc.text("Room/Unit", 113, 79);
    if (roomObj.membersCount) {
      doc.text("Members Count", 113, 83);
    } else {
      doc.text("Address", 113, 83);
    }

    doc.setTextColor(darkText);
    doc.text(`:  ${roomObj.houseName || 'Old House'}`, 136, 75);
    doc.text(`:  ${roomObj.roomNumber}`, 136, 79);
    if (roomObj.membersCount) {
      doc.text(`:  ${roomObj.membersCount}`, 136, 83);
    } else {
      doc.text(`:  ${roomObj.address || 'N/A'}`, 136, 83);
    }

    // SECTION 1: ELECTRICITY CHARGES
    doc.setDrawColor(30, 58, 138);
    doc.roundedRect(10, 85, 190, 32, 2, 2, "S");
    
    // Top border header inside block
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(10, 85, 190, 7, 2, 2, "F");
    doc.rect(10, 90, 190, 2, "F");
    
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("1.  ELECTRICITY POWER CHARGES", 14, 90);

    // Grid details
    doc.setLineWidth(0.2);
    doc.setDrawColor(226, 232, 240);
    doc.line(57.5, 92, 57.5, 109);
    doc.line(105, 92, 105, 109);
    doc.line(152.5, 92, 152.5, 109);

    doc.setTextColor(11, 58, 130);
    doc.setFontSize(7.5);
    doc.text("PREV READING", 33.75, 97, { align: "center" });
    doc.text("CURR READING", 81.25, 97, { align: "center" });
    doc.text("UNITS USED", 128.75, 97, { align: "center" });
    doc.text("TARIFF PRICE", 176.25, 97, { align: "center" });

    doc.setTextColor(darkText);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`${prevReading} units`, 33.75, 104, { align: "center" });
    doc.text(`${currReading} units`, 81.25, 104, { align: "center" });
    doc.text(`${unitsVal} units`, 128.75, 104, { align: "center" });
    doc.text("Rs. 10.00 / unit", 176.25, 104, { align: "center" });

    // Electricity total row
    doc.setFillColor(248, 250, 252);
    doc.rect(10.1, 109, 189.8, 7.8, "F");
    doc.line(10, 109, 200, 109);
    doc.setTextColor(darkText);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Total Electricity Power Dues", 14, 114.5);
    if (isElecPaid) {
      doc.setTextColor(16, 124, 65); // Green color (#107c41) indicating undue amount
    } else {
      doc.setTextColor(220, 38, 38); // Red color for active due amount
    }
    doc.text(`Rs. ${elecBill}`, 196, 114.5, { align: "right" });

    // SECTION 2: MONTHLY RENT CHARGES
    doc.setDrawColor(30, 58, 138);
    doc.roundedRect(10, 120, 190, 26, 2, 2, "S");
    
    // Top border header inside block
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(10, 120, 190, 7, 2, 2, "F");
    doc.rect(10, 125, 190, 2, "F");
    
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("2.  MONTHLY HOUSE RENT CHARGES", 14, 125);

    // Grid details
    doc.setDrawColor(226, 232, 240);
    doc.line(73.33, 127, 73.33, 138.5);
    doc.line(136.66, 127, 136.66, 138.5);

    doc.setTextColor(11, 58, 130);
    doc.setFontSize(7.5);
    doc.text("RENT DESCRIPTION", 41.66, 131, { align: "center" });
    doc.text("PERIOD BASIS", 105, 131, { align: "center" });
    doc.text("AMOUNT DUES", 168.33, 131, { align: "center" });

    doc.setTextColor(darkText);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Fixed Room Monthly Lease Rent", 41.66, 136, { align: "center" });
    doc.text("Monthly basis", 105, 136, { align: "center" });
    doc.text(`Rs. ${rentVal}`, 168.33, 136, { align: "center" });

    // Rent total row
    doc.setFillColor(248, 250, 252);
    doc.rect(10.1, 138.5, 189.8, 7.3, "F");
    doc.line(10, 138.5, 200, 138.5);
    doc.setTextColor(darkText);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Total Room Rent Dues", 14, 143);
    if (isRentPaid) {
      doc.setTextColor(16, 124, 65); // Green color (#107c41) indicating undue amount
    } else {
      doc.setTextColor(220, 38, 38); // Red color for active due amount
    }
    doc.text(`Rs. ${rentVal}`, 196, 143, { align: "right" });

    // SECTION 3: GRAND TOTAL & PAYMENT SUMMARY
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("3.  GRAND TOTAL & PAYMENT SUMMARY", 10, 153);
    doc.setDrawColor(30, 58, 138);
    doc.line(10, 155, 200, 155);

    // Summary bar block
    doc.setFillColor(11, 58, 130);
    doc.rect(10, 158, 130, 10, "F");
    doc.setFillColor(7, 43, 99);
    doc.rect(140, 158, 60, 10, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("GRAND TOTAL QUEUED OUTSTANDING DUE", 14, 164.5);
    doc.setFontSize(12);
    doc.text(`Rs. ${totalVal}`, 170, 164.5, { align: "center" });

    // Breakdown lists
    doc.setTextColor(11, 58, 130);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("SUMMARY BREAKDOWN", 10, 172.5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkText);
    doc.setFontSize(8.5);
    
    let currentY = 178;

    if (!isElecPaid) {
      doc.text("Electricity Power Dues", 12, currentY);
      doc.text(`Rs. ${elecBill}`, 196, currentY, { align: "right" });
      doc.setDrawColor(241, 245, 249);
      doc.line(10, currentY + 2, 200, currentY + 2);
      currentY += 6;
    }

    if (!isRentPaid) {
      doc.text("Monthly House Rent Dues", 12, currentY);
      doc.text(`Rs. ${rentVal}`, 196, currentY, { align: "right" });
      doc.setDrawColor(241, 245, 249);
      doc.line(10, currentY + 2, 200, currentY + 2);
      currentY += 6;
    }

    if (isElecPaid && isRentPaid) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(16, 124, 65);
      doc.text("No outstanding dues for this billing cycle.", 12, currentY);
    }

    // Green Highlight Box
    doc.setFillColor(230, 244, 234);
    doc.setDrawColor(194, 230, 206);
    doc.roundedRect(10, 190, 190, 16, 2, 2, "FD");

    // Circle icon
    doc.setFillColor(19, 115, 51);
    doc.circle(20, 198, 4.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("D", 20, 200.5, { align: "center" });

    // Text description
    doc.setTextColor(19, 115, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TOTAL AMOUNT DUE", 28, 196.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(47, 108, 66);
    doc.setFontSize(8);
    doc.text("Please pay the total outstanding amount.", 28, 201.5);

    // Green pill button
    doc.setFillColor(19, 115, 51);
    doc.roundedRect(144, 193, 50, 10, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Rs. ${totalVal}`, 169, 199.5, { align: "center" });

    // Payment Methods Footer Panel (Mockup Style with no QR code, full width layout)
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, 212, 190, 48, 2, 2, "FD");

    // Left Column: online payments
    doc.setFillColor(239, 246, 255);
    doc.circle(20, 226, 5, "F");
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("P", 20, 229.3, { align: "center" });

    doc.text("WANT TO PAY ONLINE?", 28, 222);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightText);
    doc.setFontSize(8);
    doc.text("Use UPI ID to make payment", 28, 226);

    // Pill for UPI ID
    doc.setDrawColor(30, 58, 138);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(28, 229, 65, 8, 1.5, 1.5, "FD");
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("7974478116@ibl", 60.5, 234.8, { align: "center" });

    // Divider line in the middle of bottom card
    doc.setDrawColor(226, 232, 240);
    doc.line(105, 218, 105, 254);

    // Right Column: cash payments
    doc.setFillColor(230, 244, 234);
    doc.circle(115, 226, 5, "F");
    doc.setTextColor(19, 115, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("C", 115, 229.3, { align: "center" });

    doc.text("WANT TO PAY CASH?", 123, 222);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightText);
    doc.setFontSize(8);
    doc.text("Please contact the owner for cash payment.", 123, 226);
    doc.text("Cash payments can be handed directly to landlord.", 123, 230);

    // Final Banner
    doc.setFillColor(232, 240, 254);
    doc.roundedRect(10, 267, 190, 6, 1, 1, "F");

    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("This is an official computer-generated rent & utility receipt.", 105, 271.5, { align: "center" });
    
    return doc;
  };

  // PDF Trigger events
  const handleTriggerPDF = async (actionType) => {
    if (!selectedRoom) return;

    const month = selectedRoomHistoryMonth() || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const prev = selectedRoom.previousMeterReading;
    const curr = selectedRoom.currentMeterReading || prev;
    const units = selectedRoom.unitsUsed;
    const bill = selectedRoom.electricityBill;
    const rent = selectedRoom.monthlyRent;
    const total = (selectedRoom.rentStatus !== 'PAID' ? rent : 0) + (selectedRoom.electricityStatus !== 'PAID' ? bill : 0);
    const isRentPaid = selectedRoom.rentStatus === 'PAID';
    const isElecPaid = selectedRoom.electricityStatus === 'PAID';

    const doc = buildInvoicePDF(selectedRoom, month, prev, curr, units, bill, rent, total, isRentPaid, isElecPaid);
    
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
        const filename = `Bill_${selectedRoom.houseName}_Room_${selectedRoom.roomNumber}_${month}.pdf`;
        const file = new File([blob], filename, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Rent Bill Room ${selectedRoom.roomNumber}`,
            text: `Invoice for House Sector ${selectedRoom.houseName}, Room ${selectedRoom.roomNumber} - ${month}`
          });
          showToast("📢 Shared Rent Bill PDF successfully!");
        } else {
          // Fallback to local download and WhatsApp message text if sharing files is not supported
          doc.save(filename);
          let mobile = selectedRoom.mobileNumber ? selectedRoom.mobileNumber.replace(/\D/g, '') : '';
          if (mobile.length === 10) {
            mobile = '91' + mobile;
          }
          let whatsappMsg = `*KASTURI RENTAL ROOMS - INVOICE*\n\n`;
          whatsappMsg += `*Tenant Name:* ${selectedRoom.tenantName || 'N/A'}\n`;
          whatsappMsg += `*House Sector:* ${selectedRoom.houseName || 'N/A'}\n`;
          whatsappMsg += `*Room Number:* ${selectedRoom.roomNumber}\n`;
          whatsappMsg += `*Billing Month:* ${month}\n\n`;
          whatsappMsg += `*Rent Amount:* Rs. ${rent} (${selectedRoom.rentStatus === 'PAID' ? 'PAID' : 'DUE'})\n`;
          if (bill > 0) {
            whatsappMsg += `*Electricity Bill:* Rs. ${bill} (${selectedRoom.electricityStatus === 'PAID' ? 'PAID' : 'DUE'})\n`;
          }
          whatsappMsg += `\n*Total Due Outstanding:* *Rs. ${total}*\n\n`;
          whatsappMsg += `Please clear your dues as soon as possible. Thank you!`;
          const whatsappUrl = `https://api.whatsapp.com/send?phone=${mobile}&text=${encodeURIComponent(whatsappMsg)}`;
          window.open(whatsappUrl, '_blank');
          showToast("📱 Redirecting to WhatsApp...");
        }
      } catch (err) {
        console.error("WhatsApp Link Share Failure: ", err);
        showToast("⚠️ WhatsApp share not succeeded.");
      }
    }
  };

  // History PDF trigger
  const handleHistoryPDF = (hist) => {
    if (!selectedRoom) return;

    const isRentPaid = hist.rentPaid;
    const isElecPaid = hist.electricityPaid;
    const doc = buildInvoicePDF(
      selectedRoom,
      hist.month,
      hist.previousReading,
      hist.currentReading,
      hist.unitsUsed,
      hist.electricityBill,
      hist.rent,
      hist.total,
      isRentPaid,
      isElecPaid
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
                  {selectedRoom.membersCount && (
                    <div className="detail-row">
                      <span className="detail-label">Members Count</span>
                      <span className="detail-val">👥 {selectedRoom.membersCount}</span>
                    </div>
                  )}
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
                        Share on WhatsApp
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

            {/* Room Utility Actions (Always visible at the bottom of details) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px', borderTop: '1.5px solid var(--slate-200)', paddingTop: '20px' }}>
              <button 
                type="button"
                className="btn-large btn-primary" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => handleOpenEditModal(selectedRoom)}
              >
                ✏️ Edit Details
              </button>
              <button 
                type="button"
                className="btn-large btn-danger" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                onClick={handleDeleteRoom}
              >
                🗑️ Delete Room
              </button>
            </div>
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
              <label className="form-label">Number of Members (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 3 members"
                value={tenantForm.membersCount}
                onChange={(e) => setTenantForm(prev => ({ ...prev, membersCount: e.target.value }))}
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

      {/* Edit Room Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--slate-250)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-dark)' }}>✏️ Edit Room Details</span>
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)} 
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-light)' }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditRoomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Sector & Number Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">House Sector</label>
                  <select
                    className="form-input"
                    value={editForm.houseName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, houseName: e.target.value }))}
                  >
                    <option value="Old House">Old House</option>
                    <option value="New House">New House</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Room Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.roomNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Floor & Description Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Floor</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.floor}
                    placeholder="e.g. Ground Floor"
                    onChange={(e) => setEditForm(prev => ({ ...prev, floor: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Note</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.description}
                    placeholder="e.g. Piche Wala Room"
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Occupied Switch Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--slate-50)', padding: '12px', borderRadius: '12px' }}>
                <input
                  type="checkbox"
                  id="editOccupied"
                  checked={editForm.occupied}
                  onChange={(e) => setEditForm(prev => ({ ...prev, occupied: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="editOccupied" style={{ fontSize: '14.5px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--primary-dark)' }}>
                  Room is Occupied by Tenant
                </label>
              </div>

              {editForm.occupied && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '3px solid var(--primary)', paddingLeft: '12px' }}>
                  
                  {/* Tenant Name */}
                  <div className="form-group">
                    <label className="form-label">Tenant Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.tenantName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tenantName: e.target.value }))}
                      required={editForm.occupied}
                    />
                  </div>

                  {/* Phone & Aadhaar */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Mobile Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.mobileNumber}
                        onChange={(e) => setEditForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Aadhaar Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.aadhaarNumber}
                        onChange={(e) => setEditForm(prev => ({ ...prev, aadhaarNumber: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Members count */}
                  <div className="form-group">
                    <label className="form-label">Number of Members (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.membersCount}
                      placeholder="e.g. 2 members"
                      onChange={(e) => setEditForm(prev => ({ ...prev, membersCount: e.target.value }))}
                    />
                  </div>

                  {/* Rent & Deposit */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Monthly Rent Amount (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.monthlyRent}
                        onChange={(e) => setEditForm(prev => ({ ...prev, monthlyRent: e.target.value }))}
                        required={editForm.occupied}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Security Deposit (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.securityDeposit}
                        onChange={(e) => setEditForm(prev => ({ ...prev, securityDeposit: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Joining Date */}
                  <div className="form-group">
                    <label className="form-label">Joining Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editForm.joiningDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, joiningDate: e.target.value }))}
                    />
                  </div>

                  {/* Meter Readings */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Prev Meter Reading</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.previousMeterReading}
                        onChange={(e) => setEditForm(prev => ({ ...prev, previousMeterReading: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Current Meter Reading</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.currentMeterReading}
                        onChange={(e) => setEditForm(prev => ({ ...prev, currentMeterReading: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Payment Status Dropdowns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Rent Status</label>
                      <select
                        className="form-input"
                        value={editForm.rentStatus}
                        onChange={(e) => setEditForm(prev => ({ ...prev, rentStatus: e.target.value }))}
                      >
                        <option value="PAID">PAID</option>
                        <option value="DUE">DUE</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Electricity Status</label>
                      <select
                        className="form-input"
                        value={editForm.electricityStatus}
                        onChange={(e) => setEditForm(prev => ({ ...prev, electricityStatus: e.target.value }))}
                      >
                        <option value="PAID">PAID</option>
                        <option value="DUE">DUE</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-input"
                      rows="2"
                      value={editForm.notes}
                      onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    ></textarea>
                  </div>

                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-large btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-large btn-primary"
                >
                  💾 Save Changes
                </button>
              </div>
              
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
