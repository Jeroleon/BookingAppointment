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
    public static String rescheduleBooking(String oldDate, String oldSlot, String newDate, String newSlot) {
        try {
            // ✅ Find the existing booking
            List<Booking_Appointment__c> existingBookings = [
                SELECT Id, Selected_Date__c, Selected_Slot__c, Status__c 
                FROM Booking_Appointment__c
                WHERE Selected_Date__c = :oldDate
                AND Selected_Slot__c = :oldSlot
                LIMIT 1
            ];

            if (existingBookings.isEmpty()) {
                return 'Error: No existing booking found for the given date and slot.';
            }

            Booking_Appointment__c booking = existingBookings[0];
            booking.Selected_Date__c = newDate;
            booking.Selected_Slot__c = newSlot;
            booking.Status__c = 'Rescheduled'; // ✅ Valid picklist value

            update booking;

            // ✅ Mark the old slot as available (if needed)
            List<Pooling_Slot__c> oldSlotRecords = [
                SELECT Id FROM Pooling_Slot__c
                WHERE Slot__c = :oldSlot
                LIMIT 1
            ];
            if (!oldSlotRecords.isEmpty()) {
                Pooling_Slot__c slotToRelease = oldSlotRecords[0];
                slotToRelease.Status__c = 'Available'; // ✅ Mark old slot as free
                update slotToRelease;
            }

            // ✅ Mark the new slot as "Booked"
            List<Pooling_Slot__c> newSlotRecords = [
                SELECT Id FROM Pooling_Slot__c
                WHERE Slot__c = :newSlot
                LIMIT 1
            ];
            if (!newSlotRecords.isEmpty()) {
                Pooling_Slot__c slotToBook = newSlotRecords[0];
                slotToBook.Status__c = 'Booked'; // ✅ Mark new slot as taken
                update slotToBook;
            }

            return 'Success';
        } catch (Exception e) {
            System.debug('❌ Error in rescheduleBooking: ' + e.getMessage());
            return 'Error: ' + e.getMessage();
        }
    }


}