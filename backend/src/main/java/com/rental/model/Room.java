package com.rental.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "rooms")
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String roomNumber;

    private String houseName;      // "Old House" or "New House"
    private String address;        // house address
    private String floor;          // "Ground Floor", "First Floor", etc.
    private String description;    // "Aage Wala Room", "Piche Wala Room", etc.

    private boolean occupied = false;
    private String tenantName;
    private String mobileNumber;
    private String aadhaarNumber;
    private LocalDate joiningDate;
    
    private double monthlyRent = 0.0;
    private double securityDeposit = 0.0;
    
    private double previousMeterReading = 0.0;
    private double currentMeterReading = 0.0;
    private double unitsUsed = 0.0;
    private double electricityBill = 0.0;
    
    private String rentStatus = "PAID"; // 'PAID' or 'DUE'
    private String electricityStatus = "PAID"; // 'PAID' or 'DUE'
    
    @Column(columnDefinition = "TEXT")
    private String notes;

    private double paidRentAmount = 0.0;
    private double rentBalanceDues = 0.0;
    private double paidElectricityAmount = 0.0;
    private double electricityBalanceDues = 0.0;
    private String paymentMethod = "Cash";

    @Column(columnDefinition = "LONGTEXT")
    private String aadhaarCardFile;

    @Column(columnDefinition = "LONGTEXT")
    private String rentAgreementFile;

    public Room() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRoomNumber() {
        return roomNumber;
    }

    public void setRoomNumber(String roomNumber) {
        this.roomNumber = roomNumber;
    }

    public String getHouseName() {
        return houseName;
    }

    public void setHouseName(String houseName) {
        this.houseName = houseName;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getFloor() {
        return floor;
    }

    public void setFloor(String floor) {
        this.floor = floor;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isOccupied() {
        return occupied;
    }

    public void setOccupied(boolean occupied) {
        this.occupied = occupied;
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

    public LocalDate getJoiningDate() {
        return joiningDate;
    }

    public void setJoiningDate(LocalDate joiningDate) {
        this.joiningDate = joiningDate;
    }

    public double getMonthlyRent() {
        return monthlyRent;
    }

    public void setMonthlyRent(double monthlyRent) {
        this.monthlyRent = monthlyRent;
    }

    public double getSecurityDeposit() {
        return securityDeposit;
    }

    public void setSecurityDeposit(double securityDeposit) {
        this.securityDeposit = securityDeposit;
    }

    public double getPreviousMeterReading() {
        return previousMeterReading;
    }

    public void setPreviousMeterReading(double previousMeterReading) {
        this.previousMeterReading = previousMeterReading;
    }

    public double getCurrentMeterReading() {
        return currentMeterReading;
    }

    public void setCurrentMeterReading(double currentMeterReading) {
        this.currentMeterReading = currentMeterReading;
    }

    public double getUnitsUsed() {
        return unitsUsed;
    }

    public void setUnitsUsed(double unitsUsed) {
        this.unitsUsed = unitsUsed;
    }

    public double getElectricityBill() {
        return electricityBill;
    }

    public void setElectricityBill(double electricityBill) {
        this.electricityBill = electricityBill;
    }

    public String getRentStatus() {
        return rentStatus;
    }

    public void setRentStatus(String rentStatus) {
        this.rentStatus = rentStatus;
    }

    public String getElectricityStatus() {
        return electricityStatus;
    }

    public void setElectricityStatus(String electricityStatus) {
        this.electricityStatus = electricityStatus;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public double getPaidRentAmount() {
        return paidRentAmount;
    }

    public void setPaidRentAmount(double paidRentAmount) {
        this.paidRentAmount = paidRentAmount;
    }

    public double getRentBalanceDues() {
        return rentBalanceDues;
    }

    public void setRentBalanceDues(double rentBalanceDues) {
        this.rentBalanceDues = rentBalanceDues;
    }

    public double getPaidElectricityAmount() {
        return paidElectricityAmount;
    }

    public void setPaidElectricityAmount(double paidElectricityAmount) {
        this.paidElectricityAmount = paidElectricityAmount;
    }

    public double getElectricityBalanceDues() {
        return electricityBalanceDues;
    }

    public void setElectricityBalanceDues(double electricityBalanceDues) {
        this.electricityBalanceDues = electricityBalanceDues;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getAadhaarCardFile() {
        return aadhaarCardFile;
    }

    public void setAadhaarCardFile(String aadhaarCardFile) {
        this.aadhaarCardFile = aadhaarCardFile;
    }

    public String getRentAgreementFile() {
        return rentAgreementFile;
    }

    public void setRentAgreementFile(String rentAgreementFile) {
        this.rentAgreementFile = rentAgreementFile;
    }
}
