package com.rental.controller;

import com.rental.model.Room;
import com.rental.model.RoomHistory;
import com.rental.repository.RoomHistoryRepository;
import com.rental.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class RoomController {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomHistoryRepository roomHistoryRepository;

    // Helper to get current billing month string (e.g., "July 2026")
    private String getCurrentMonthString() {
        return LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH));
    }

    // 1. Get all rooms
    @GetMapping("/rooms")
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    // 2. Get room by ID
    @GetMapping("/rooms/{id}")
    public ResponseEntity<Room> getRoomById(@PathVariable Long id) {
        return roomRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 3. Stats for the dashboard
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        List<Room> rooms = roomRepository.findAll();
        long totalRooms = rooms.size();
        long occupiedRooms = rooms.stream().filter(Room::isOccupied).count();
        long vacantRooms = totalRooms - occupiedRooms;

        double totalPendingRent = rooms.stream()
                .filter(r -> r.isOccupied() && "DUE".equalsIgnoreCase(r.getRentStatus()))
                .mapToDouble(Room::getMonthlyRent)
                .sum();

        double totalPendingElectricity = rooms.stream()
                .filter(r -> r.isOccupied() && "DUE".equalsIgnoreCase(r.getElectricityStatus()))
                .mapToDouble(Room::getElectricityBill)
                .sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRooms", totalRooms);
        stats.put("occupiedRooms", occupiedRooms);
        stats.put("vacantRooms", vacantRooms);
        stats.put("totalPendingRent", totalPendingRent);
        stats.put("totalPendingElectricity", totalPendingElectricity);

        return ResponseEntity.ok(stats);
    }

    // 4. Add or update tenant (moves tenant into room)
    public static class AddTenantRequest {
        private String houseName;
        private String roomNumber;
        private String tenantName;
        private String mobileNumber;
        private String aadhaarNumber;
        private double monthlyRent;
        private LocalDate joiningDate;
        private double previousMeterReading;
        private String membersCount;

        public AddTenantRequest() {}

        public String getMembersCount() {
            return membersCount;
        }

        public void setMembersCount(String membersCount) {
            this.membersCount = membersCount;
        }

        public String getHouseName() {
            return houseName;
        }

        public void setHouseName(String houseName) {
            this.houseName = houseName;
        }

        public String getRoomNumber() {
            return roomNumber;
        }

        public void setRoomNumber(String roomNumber) {
            this.roomNumber = roomNumber;
        }

        public String getTenantName() {
            return tenantName;
        }

        public void setTenantName(String tenantName) {
            this.tenantName = tenantName;
        }

        public String getMobileNumber() {
            return mobileNumber;
        }

        public void setMobileNumber(String mobileNumber) {
            this.mobileNumber = mobileNumber;
        }

        public String getAadhaarNumber() {
            return aadhaarNumber;
        }

        public void setAadhaarNumber(String aadhaarNumber) {
            this.aadhaarNumber = aadhaarNumber;
        }

        public double getMonthlyRent() {
            return monthlyRent;
        }

        public void setMonthlyRent(double monthlyRent) {
            this.monthlyRent = monthlyRent;
        }

        public LocalDate getJoiningDate() {
            return joiningDate;
        }

        public void setJoiningDate(LocalDate joiningDate) {
            this.joiningDate = joiningDate;
        }

        public double getPreviousMeterReading() {
            return previousMeterReading;
        }

        public void setPreviousMeterReading(double previousMeterReading) {
            this.previousMeterReading = previousMeterReading;
        }
    }

    @PostMapping("/rooms/add-tenant")
    public ResponseEntity<?> addTenant(@RequestBody AddTenantRequest request) {
        if (request.getRoomNumber() == null || request.getRoomNumber().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Room number is required");
        }
        
        String inputHouse = request.getHouseName();
        if (inputHouse == null || inputHouse.isEmpty()) {
            inputHouse = "Old House"; // default fallback
        }

        // Normalize room number format to match seeded values (e.g., "room 4" -> "Room 4")
        String roomNumber = request.getRoomNumber().trim();
        if (roomNumber.equalsIgnoreCase("shop")) {
            roomNumber = "Shop";
        } else if (roomNumber.toLowerCase().startsWith("room")) {
            String suffix = roomNumber.substring(4).trim();
            roomNumber = "Room " + suffix;
        } else if (!roomNumber.isEmpty()) {
            roomNumber = Character.toUpperCase(roomNumber.charAt(0)) + roomNumber.substring(1);
        }

        // Find or create room by houseName and roomNumber
        Room room = roomRepository.findByHouseNameAndRoomNumber(inputHouse.trim(), roomNumber)
                .orElse(new Room());
        
        if (room.getId() == null) {
            room.setRoomNumber(roomNumber);
            room.setHouseName(inputHouse.trim());
            // Set standard address
            if ("New House".equalsIgnoreCase(inputHouse)) {
                room.setAddress("A15 Haripuram Colony New Suresh nagar");
            } else {
                room.setAddress("65 Siddharth nagar thatipur");
            }
        }

        // Setup tenant details
        room.setOccupied(true);
        room.setTenantName(request.getTenantName());
        room.setMobileNumber(request.getMobileNumber());
        room.setAadhaarNumber(request.getAadhaarNumber());
        room.setJoiningDate(request.getJoiningDate() != null ? request.getJoiningDate() : LocalDate.now());
        room.setMonthlyRent(request.getMonthlyRent());
        room.setMembersCount(request.getMembersCount());
        
        // Reset/update electricity readings
        room.setPreviousMeterReading(request.getPreviousMeterReading());
        room.setCurrentMeterReading(request.getPreviousMeterReading());
        room.setUnitsUsed(0.0);
        room.setElectricityBill(0.0);
        
        // Dues default
        room.setRentStatus("DUE");
        room.setElectricityStatus("PAID");

        Room savedRoom = roomRepository.save(room);

        // Also check if history for current month should be initialized
        updateOrAddHistory(savedRoom, getCurrentMonthString(), false, true);

        return ResponseEntity.ok(savedRoom);
    }

    // 5. Calculate electricity bill
    public static class CalculateBillRequest {
        private double previousReading;
        private double currentReading;

        public CalculateBillRequest() {}

        public double getPreviousReading() {
            return previousReading;
        }

        public void setPreviousReading(double previousReading) {
            this.previousReading = previousReading;
        }

        public double getCurrentReading() {
            return currentReading;
        }

        public void setCurrentReading(double currentReading) {
            this.currentReading = currentReading;
        }
    }

    @PostMapping("/rooms/{id}/calculate-bill")
    public ResponseEntity<?> calculateBill(@PathVariable Long id, @RequestBody CalculateBillRequest request) {
        Optional<Room> optionalRoom = roomRepository.findById(id);
        if (optionalRoom.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Room room = optionalRoom.get();
        if (!room.isOccupied()) {
            return ResponseEntity.badRequest().body("Room is vacant, cannot calculate bill");
        }

        if (request.getCurrentReading() < request.getPreviousReading()) {
            return ResponseEntity.badRequest().body("Current reading cannot be less than previous reading");
        }

        double unitsUsed = request.getCurrentReading() - request.getPreviousReading();
        double billAmount = unitsUsed * 10.0; // ₹10 per unit

        room.setPreviousMeterReading(request.getPreviousReading());
        room.setCurrentMeterReading(request.getCurrentReading());
        room.setUnitsUsed(unitsUsed);
        room.setElectricityBill(billAmount);
        room.setElectricityStatus("DUE"); // Dues are pending now

        Room savedRoom = roomRepository.save(room);

        // Update or insert history record for current month
        updateOrAddHistory(savedRoom, getCurrentMonthString(), false, false);

        return ResponseEntity.ok(savedRoom);
    }

    // 6. Mark rent paid
    @PostMapping("/rooms/{id}/mark-rent-paid")
    public ResponseEntity<?> markRentPaid(@PathVariable Long id) {
        Optional<Room> optionalRoom = roomRepository.findById(id);
        if (optionalRoom.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Room room = optionalRoom.get();
        room.setRentStatus("PAID");
        Room savedRoom = roomRepository.save(room);

        updateOrAddHistory(savedRoom, getCurrentMonthString(), true, false);

        return ResponseEntity.ok(savedRoom);
    }

    // 7. Mark electricity paid
    @PostMapping("/rooms/{id}/mark-electricity-paid")
    public ResponseEntity<?> markElectricityPaid(@PathVariable Long id) {
        Optional<Room> optionalRoom = roomRepository.findById(id);
        if (optionalRoom.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Room room = optionalRoom.get();
        room.setElectricityStatus("PAID");
        Room savedRoom = roomRepository.save(room);

        updateOrAddHistory(savedRoom, getCurrentMonthString(), false, true);

        return ResponseEntity.ok(savedRoom);
    }

    // 8. Evict tenant (Mark vacant)
    @PostMapping("/rooms/{id}/evict")
    public ResponseEntity<?> evictTenant(@PathVariable Long id) {
        Optional<Room> optionalRoom = roomRepository.findById(id);
        if (optionalRoom.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Room room = optionalRoom.get();
        room.setOccupied(false);
        room.setTenantName(null);
        room.setMobileNumber(null);
        room.setAadhaarNumber(null);
        room.setJoiningDate(null);
        room.setMembersCount(null);
        room.setPreviousMeterReading(0.0);
        room.setCurrentMeterReading(0.0);
        room.setUnitsUsed(0.0);
        room.setElectricityBill(0.0);
        room.setRentStatus("PAID");
        room.setElectricityStatus("PAID");
        room.setNotes(null);

        Room savedRoom = roomRepository.save(room);
        return ResponseEntity.ok(savedRoom);
    }

    // 9. Get history logs for a specific room
    @GetMapping("/rooms/{id}/history")
    public List<RoomHistory> getRoomHistory(@PathVariable Long id) {
        return roomHistoryRepository.findByRoomIdOrderByIdDesc(id);
    }

    // Utility to synchronize monthly log records
    private void updateOrAddHistory(Room room, String monthStr, boolean forceRentPaid, boolean forceElecPaid) {
        Optional<RoomHistory> optionalHistory = roomHistoryRepository.findByRoomIdAndMonth(room.getId(), monthStr);
        RoomHistory history;

        if (optionalHistory.isPresent()) {
            history = optionalHistory.get();
        } else {
            history = new RoomHistory();
            history.setRoom(room);
            history.setRoomNumber(room.getRoomNumber());
            history.setMonth(monthStr);
            // Default statuses matches current state
            history.setRentPaid("PAID".equalsIgnoreCase(room.getRentStatus()));
            history.setElectricityPaid("PAID".equalsIgnoreCase(room.getElectricityStatus()));
        }

        // Apply overrides if action was triggered
        if (forceRentPaid) {
            history.setRentPaid(true);
        }
        if (forceElecPaid) {
            history.setElectricityPaid(true);
        }

        history.setRent(room.getMonthlyRent());
        history.setElectricityBill(room.getElectricityBill());
        history.setTotal(history.getRent() + history.getElectricityBill());
        history.setMembersCount(room.getMembersCount());
        
        // Update reading logs history values
        history.setPreviousReading(room.getPreviousMeterReading());
        history.setCurrentReading(room.getCurrentMeterReading());
        history.setUnitsUsed(room.getUnitsUsed());

        // Calculate visual status string
        if (history.isRentPaid() && history.isElectricityPaid()) {
            history.setStatus("Paid");
            history.setPaymentDate(LocalDate.now());
        } else if (!history.isRentPaid() && !history.isElectricityPaid()) {
            history.setStatus("Rent & Elec Due");
        } else if (history.isRentPaid()) {
            history.setStatus("Elec Due");
        } else {
            history.setStatus("Rent Due");
        }

        roomHistoryRepository.save(history);
    }

    // 10. Update room details
    @PutMapping("/rooms/{id}")
    public ResponseEntity<?> updateRoom(@PathVariable Long id, @RequestBody Room updatedRoom) {
        Optional<Room> optionalRoom = roomRepository.findById(id);
        if (optionalRoom.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Room room = optionalRoom.get();
        
        // Normalize room number format to match seeded values (e.g., "room 4" -> "Room 4")
        String roomNumber = updatedRoom.getRoomNumber();
        if (roomNumber != null) {
            roomNumber = roomNumber.trim();
            if (roomNumber.equalsIgnoreCase("shop")) {
                roomNumber = "Shop";
            } else if (roomNumber.toLowerCase().startsWith("room")) {
                String suffix = roomNumber.substring(4).trim();
                roomNumber = "Room " + suffix;
            } else if (!roomNumber.isEmpty()) {
                roomNumber = Character.toUpperCase(roomNumber.charAt(0)) + roomNumber.substring(1);
            }
            room.setRoomNumber(roomNumber);
        }

        if (updatedRoom.getHouseName() != null) {
            room.setHouseName(updatedRoom.getHouseName());
            if ("New House".equalsIgnoreCase(updatedRoom.getHouseName())) {
                room.setAddress("A15 Haripuram Colony New Suresh nagar");
            } else {
                room.setAddress("65 Siddharth nagar thatipur");
            }
        }

        room.setFloor(updatedRoom.getFloor());
        room.setDescription(updatedRoom.getDescription());
        room.setOccupied(updatedRoom.isOccupied());
        room.setTenantName(updatedRoom.getTenantName());
        room.setMobileNumber(updatedRoom.getMobileNumber());
        room.setAadhaarNumber(updatedRoom.getAadhaarNumber());
        room.setJoiningDate(updatedRoom.getJoiningDate());
        room.setMonthlyRent(updatedRoom.getMonthlyRent());
        room.setSecurityDeposit(updatedRoom.getSecurityDeposit());
        room.setNotes(updatedRoom.getNotes());
        room.setMembersCount(updatedRoom.getMembersCount());
        
        room.setPreviousMeterReading(updatedRoom.getPreviousMeterReading());
        room.setCurrentMeterReading(updatedRoom.getCurrentMeterReading());
        room.setUnitsUsed(updatedRoom.getUnitsUsed());
        room.setElectricityBill(updatedRoom.getElectricityBill());
        
        room.setRentStatus(updatedRoom.getRentStatus() != null ? updatedRoom.getRentStatus() : "PAID");
        room.setElectricityStatus(updatedRoom.getElectricityStatus() != null ? updatedRoom.getElectricityStatus() : "PAID");

        Room savedRoom = roomRepository.save(room);
        
        // If room is occupied, synchronize history for the current month.
        if (savedRoom.isOccupied()) {
            updateOrAddHistory(savedRoom, getCurrentMonthString(), "PAID".equalsIgnoreCase(savedRoom.getRentStatus()), "PAID".equalsIgnoreCase(savedRoom.getElectricityStatus()));
        }

        return ResponseEntity.ok(savedRoom);
    }

    // 11. Delete room completely
    @DeleteMapping("/rooms/{id}")
    public ResponseEntity<?> deleteRoom(@PathVariable Long id) {
        Optional<Room> optionalRoom = roomRepository.findById(id);
        if (optionalRoom.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        // Delete associated history first
        roomHistoryRepository.deleteAll(roomHistoryRepository.findByRoomIdOrderByIdDesc(id));
        
        // Delete room
        roomRepository.delete(optionalRoom.get());
        return ResponseEntity.ok().build();
    }
}

