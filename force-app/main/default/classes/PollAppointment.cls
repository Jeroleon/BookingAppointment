public with sharing class PollAppointment {

  // ✅ Fetch Available Dates (Today to Two Weeks)
  @AuraEnabled(cacheable=true)
  public static List<Map<String, String>> getAvailableDates() {
      List<Map<String, String>> dateList = new List<Map<String, String>>();
      Date today = Date.today();
      Date futureDate = today.addDays(14); // Two weeks from today

      for (Date d = today; d <= futureDate; d = d.addDays(1)) {
          DateTime dt = DateTime.newInstance(d.year(), d.month(), d.day());

          Map<String, String> dateInfo = new Map<String, String>();
          dateInfo.put('dateString', d.format());
          dateInfo.put('day', String.valueOf(d.day()));
          dateInfo.put('month', dt.format('MMM')); // Fixed formatting
          dateInfo.put('dayName', dt.format('EEE')); // Fixed formatting
          dateList.add(dateInfo);
      }
      return dateList;
  }

  // ✅ Fetch Available Slots for Selected Date
  @AuraEnabled(cacheable=true)
public static String getAvailableSlots(String selectedDate) {
    Map<String, List<String>> slotsMap = new Map<String, List<String>>();
    slotsMap.put('availableSlots', new List<String>());
    slotsMap.put('bookedSlots', new List<String>());

    List<Pooling_Slot__c> allSlots = [SELECT Slot__c FROM Pooling_Slot__c];

    Set<String> bookedSlotsSet = new Set<String>();
    List<Booking_Appointment__c> bookedAppointments = [
        SELECT Selected_Slot__c FROM Booking_Appointment__c
        WHERE Selected_Date__c = :selectedDate
    ];

    for (Booking_Appointment__c booking : bookedAppointments) {
        bookedSlotsSet.add(booking.Selected_Slot__c);
    }

    for (Pooling_Slot__c slot : allSlots) {
        if (bookedSlotsSet.contains(slot.Slot__c)) {
            slotsMap.get('bookedSlots').add(slot.Slot__c);
        } else {
            slotsMap.get('availableSlots').add(slot.Slot__c);
        }
    }

    return JSON.serialize(slotsMap);
}


  //✅ Save Booking Appointment
  @AuraEnabled
public static String saveBooking(String selectedDate, String selectedSlot) {
    try {
        System.debug('🚀 Received Date: ' + selectedDate);
        System.debug('⏰ Received Slot: ' + selectedSlot);

        // ✅ Check if slot is already booked
        Integer existingBookings = [
            SELECT COUNT() FROM Booking_Appointment__c
            WHERE Selected_Date__c = :selectedDate
            AND Selected_Slot__c = :selectedSlot
        ];
        
        if (existingBookings > 0) {
            return 'Error: Slot already booked.';
        }

        Booking_Appointment__c newBooking = new Booking_Appointment__c();
        newBooking.Selected_Date__c = selectedDate;
        newBooking.Selected_Slot__c = selectedSlot;
        newBooking.Status__c = 'Booked';

        insert newBooking;
        System.debug('✅ Booking successfully inserted!');
        return 'Success';
    } catch (Exception e) {
        System.debug('❌ Error inserting booking: ' + e.getMessage());
        return 'Error: ' + e.getMessage();
    }
}


// ✅ Cancel Booking
    @AuraEnabled
public static String cancelBooking(String selectedDate, String selectedSlot) {
    try {
        List<Booking_Appointment__c> bookingsToDelete = [
            SELECT Id FROM Booking_Appointment__c
            WHERE Selected_Date__c = :selectedDate AND Selected_Slot__c = :selectedSlot
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

// ✅ Reschedule Booking


@AuraEnabled
public static String rescheduleBooking(String oldSlot, String newSlot) {
    try {
        System.debug('🔄 Rescheduling from ' + oldSlot + ' → ' + newSlot);

        // ✅ Check if the new slot is already booked
        Integer existingBookings = [
            SELECT COUNT() FROM Booking_Appointment__c
            WHERE Selected_Slot__c = :newSlot
        ];
        
        if (existingBookings > 0) {
            return 'Error: The new slot is already booked.';
        }

        // ✅ Find the existing booking
        List<Booking_Appointment__c> existingBookingsList = [
            SELECT Id, Selected_Slot__c, Status__c 
            FROM Booking_Appointment__c
            WHERE Selected_Slot__c = :oldSlot
            LIMIT 1
        ];

        if (existingBookingsList.isEmpty()) {
            return 'Error: No existing booking found.';
        }

        // ✅ Update the old booking to reflect the new slot
        Booking_Appointment__c booking = existingBookingsList[0];
        booking.Selected_Slot__c = newSlot;
        booking.Status__c = 'Rescheduled';
        update booking;

        // ✅ Free up the old slot in Pooling_Slot__c
        List<Pooling_Slot__c> oldSlotRecords = [
            SELECT Id, Slot__c FROM Pooling_Slot__c
            WHERE Slot__c = :oldSlot
        ];
        
        if (!oldSlotRecords.isEmpty()) {
            delete oldSlotRecords;
        }

        // ✅ Add the new slot to the booked slots
        Pooling_Slot__c newBookedSlot = new Pooling_Slot__c();
        newBookedSlot.Slot__c = newSlot;
        insert newBookedSlot; // 🔥 This ensures the new slot appears in booked slots

        return 'Success';
    } catch (Exception e) {
        System.debug('❌ Error in rescheduleBooking: ' + e.getMessage());
        return 'Error: ' + e.getMessage();
    }
}




}