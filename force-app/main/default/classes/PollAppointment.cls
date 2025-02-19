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
  public static List<String> getAvailableSlots() {
      List<String> slots = new List<String>();

      // Fetch all slots from Pooling_Slot__c
      List<Pooling_Slot__c> slotRecords = [
          SELECT Slot__c FROM Pooling_Slot__c
      ];

      for (Pooling_Slot__c slot : slotRecords) {
          slots.add(slot.Slot__c);
      }

      return slots;
  }

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
}