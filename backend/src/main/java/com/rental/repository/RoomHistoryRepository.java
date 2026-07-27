package com.rental.repository;

import com.rental.model.RoomHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomHistoryRepository extends JpaRepository<RoomHistory, Long> {
    List<RoomHistory> findByRoomIdOrderByIdDesc(Long roomId);
    Optional<RoomHistory> findByRoomIdAndMonth(Long roomId, String month);
}
