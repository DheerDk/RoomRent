package com.rental.repository;

import com.rental.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByRoomNumber(String roomNumber);
    Optional<Room> findByHouseNameAndRoomNumber(String houseName, String roomNumber);
}
