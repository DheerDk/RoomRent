package com.rental;

import com.rental.model.Room;
import com.rental.repository.RoomRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class RentalApplication {

    public static void main(String[] args) {
        SpringApplication.run(RentalApplication.class, args);
    }

    @Bean
    public CommandLineRunner initData(RoomRepository roomRepository) {
        return args -> {
            if (roomRepository.count() == 0) {
                // 1. Seed Old House Rooms
                Room o1 = createRoom("Room 1", "Old House", "65 Siddharth nagar thatipur", "Ground Floor", "Aage Wala Room");
                Room o2 = createRoom("Room 2", "Old House", "65 Siddharth nagar thatipur", "Ground Floor", "Piche Wala Room");
                Room o3 = createRoom("Room 3", "Old House", "65 Siddharth nagar thatipur", "First Floor", "Hall & Balcony Wala Room");
                Room o4 = createRoom("Room 4", "Old House", "65 Siddharth nagar thatipur", "First Floor", "Andar Wala Room");

                roomRepository.save(o1);
                roomRepository.save(o2);
                roomRepository.save(o3);
                roomRepository.save(o4);

                // 2. Seed New House Rooms
                Room n1 = createRoom("Room 1", "New House", "A15 Haripuram Colony New Suresh nagar", "", "");
                Room shop = createRoom("Shop", "New House", "A15 Haripuram Colony New Suresh nagar", "", "");

                roomRepository.save(n1);
                roomRepository.save(shop);

                System.out.println("Seeded all 7 rooms for Old House and New House successfully.");
            }
        };
    }

    private Room createRoom(String roomNumber, String houseName, String address, String floor, String description) {
        Room r = new Room();
        r.setRoomNumber(roomNumber);
        r.setHouseName(houseName);
        r.setAddress(address);
        r.setFloor(floor);
        r.setDescription(description);
        r.setOccupied(false);
        r.setMonthlyRent(0.0);
        r.setSecurityDeposit(0.0);
        r.setRentStatus("PAID");
        r.setElectricityStatus("PAID");
        return r;
    }
}
