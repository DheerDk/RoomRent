package com.rental.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDate;

@Entity
@Table(name = "room_history")
public class RoomHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    @JsonIgnore
    private Room room;

    private String roomNumber;

    @Column(name = "billing_month", nullable = false)
    private String month; // e.g. "July 2026"

    private double rent = 0.0;
    private double electricityBill = 0.0;
    private double total = 0.0;
    private String status = "Pending"; // 'Paid', 'Pending'
    
    private boolean rentPaid = false;
    private boolean electricityPaid = false;
    private LocalDate paymentDate;

    // Added fields for detailed billing history tracking
    private double previousReading = 0.0;
    private double currentReading = 0.0;
    private double unitsUsed = 0.0;

    public RoomHistory() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public String getRoomNumber() {
        return roomNumber;
    }

    public void setRoomNumber(String roomNumber) {
        this.roomNumber = roomNumber;
    }

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public double getRent() {
        return rent;
    }

    public void setRent(double rent) {
        this.rent = rent;
    }

    public double getElectricityBill() {
        return electricityBill;
    }

    public void setElectricityBill(double electricityBill) {
        this.electricityBill = electricityBill;
    }

    public double getTotal() {
        return total;
    }

    public void setTotal(double total) {
        this.total = total;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isRentPaid() {
        return rentPaid;
    }

    public void setRentPaid(boolean rentPaid) {
        this.rentPaid = rentPaid;
    }

    public boolean isElectricityPaid() {
        return electricityPaid;
    }

    public void setElectricityPaid(boolean electricityPaid) {
        this.electricityPaid = electricityPaid;
    }

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(LocalDate paymentDate) {
        this.paymentDate = paymentDate;
    }

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

    public double getUnitsUsed() {
        return unitsUsed;
    }

    public void setUnitsUsed(double unitsUsed) {
        this.unitsUsed = unitsUsed;
    }
}
