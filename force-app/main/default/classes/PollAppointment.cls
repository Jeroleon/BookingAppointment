public with sharing class PollAppointment {

    // ✅ Fetch Available Dates (Today to Two Weeks)
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getAvailableDates() {
        List<Map<String, String>> dateList = new List<Map<String, String>>();
        Date today = Date.today();
        Date futureDate = today.addDays(14);
  
        for (Date d = today; d <= futureDate; d = d.addDays(1)) {
            DateTime dt = DateTime.newInstance(d.year(), d.month(), d.day());
            Map<String, String> dateInfo = new Map<String, String>();
            dateInfo.put('dateString', String.valueOf(d)); // Returns YYYY-MM-DD as String
            dateInfo.put('day', String.valueOf(d.day()));
            dateInfo.put('month', dt.format('MMM'));
            dateInfo.put('dayName', dt.format('EEE'));
            dateList.add(dateInfo);
        }
        return dateList;
    }
  
    // ✅ Fetch Available Slots for Selected Date
    @AuraEnabled(cacheable=true)
    public static String getAvailableSlots(String selectedDate) {
        Map<String, List<Map<String, String>>> slotsMap = new Map<String, List<Map<String, String>>>();
        slotsMap.put('availableSlots', new List<Map<String, String>>());
        slotsMap.put('bookedSlots', new List<Map<String, String>>());
  
        List<Pooling_Slot__c> allSlots = [SELECT Id, Slot__c FROM Pooling_Slot__c];
        
        // Use selectedDate directly as a String in the query
        List<Booking_Appointment__c> bookedAppointments = [
            SELECT Id, Selected_Slot__c 
            FROM Booking_Appointment__c
            WHERE Selected_Date__c = :selectedDate
        ];
        Map<String, String> bookedSlotToId = new Map<String, String>();
        Set<String> bookedSlotsSet = new Set<String>();
        for (Booking_Appointment__c booking : bookedAppointments) {
            bookedSlotsSet.add(booking.Selected_Slot__c);
            bookedSlotToId.put(booking.Selected_Slot__c, booking.Id);
        }
  
        for (Pooling_Slot__c slot : allSlots) {
            Map<String, String> slotInfo = new Map<String, String>{
                'id' => slot.Id,
                'time' => slot.Slot__c
            };
            if (bookedSlotsSet.contains(slot.Slot__c)) {
                slotInfo.put('bookingId', bookedSlotToId.get(slot.Slot__c));
                slotsMap.get('bookedSlots').add(slotInfo);
            } else {
                slotsMap.get('availableSlots').add(slotInfo);
            }
        }
  
        return JSON.serialize(slotsMap);
    }
  
    // ✅ Save Booking Appointment
    @AuraEnabled
    public static String saveBooking(String selectedDate, String selectedSlot) {
        try {
            // Check for existing bookings using String directly
            Integer existingBookings = [
                SELECT COUNT() FROM Booking_Appointment__c
                WHERE Selected_Date__c = :selectedDate
                AND Selected_Slot__c = :selectedSlot
            ];
            
            if (existingBookings > 0) {
                return 'Error: Slot already booked.';
            }
  
            Booking_Appointment__c newBooking = new Booking_Appointment__c(
                Selected_Date__c = selectedDate, // Assign String directly
                Selected_Slot__c = selectedSlot,
                Status__c = 'Booked'
            );
            insert newBooking;
            return 'Success:BookingId:' + newBooking.Id;
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }
  
    // ✅ Cancel Booking
    @AuraEnabled
    public static String cancelBooking(String bookingId) {
        try {
            List<Booking_Appointment__c> bookingsToDelete = [
                SELECT Id FROM Booking_Appointment__c
                WHERE Id = :bookingId
            ];
  
            if (!bookingsToDelete.isEmpty()) {
                delete bookingsToDelete;
                return 'Success';
            } else {
                return 'Error: No booking found';
            }
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }
  
    // ✅ Reschedule Booking (Delete Old, Create New)
    @AuraEnabled
public static String rescheduleBooking(String bookingId, String newDate, String newSlot) {
    try {
        // Check if new slot is available
        Integer existingBookings = [
            SELECT COUNT() FROM Booking_Appointment__c
            WHERE Selected_Date__c = :newDate
            AND Selected_Slot__c = :newSlot
        ];
        
        if (existingBookings > 0) {
            return 'Error: The new slot is already booked.';
        }

        // Find the old booking to get its details
        List<Booking_Appointment__c> oldBooking = [
            SELECT Id, Selected_Date__c, Selected_Slot__c
            FROM Booking_Appointment__c
            WHERE Id = :bookingId
            LIMIT 1
        ];
        
        if (oldBooking.isEmpty()) {
            return 'Error: No existing booking found.';
        }
        
        String oldDate = oldBooking[0].Selected_Date__c;
        String oldSlot = oldBooking[0].Selected_Slot__c;
        
        // Delete the old booking
        delete oldBooking;

        // Create new booking
        Booking_Appointment__c newBooking = new Booking_Appointment__c(
            Selected_Date__c = newDate,
            Selected_Slot__c = newSlot,
            Status__c = 'Rescheduled'
        );
        insert newBooking;
        
        // Return old and new details
        Map<String, String> result = new Map<String, String>{
            'status' => 'Success',
            'newBookingId' => newBooking.Id,
            'newSlot' => newSlot,
            'oldDate' => oldDate,
            'oldSlot' => oldSlot
        };
        return JSON.serialize(result);
    } catch (Exception e) {
        return 'Error: ' + e.getMessage();
    }
}
}