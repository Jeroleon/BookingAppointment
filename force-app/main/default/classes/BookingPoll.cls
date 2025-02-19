public with sharing class BookingPoll {
    // ✅ Fetch Available Years

    @AuraEnabled(cacheable=true)
    public static List<Integer> getAvailableYears() {
        Set<Integer> yearSet = new Set<Integer>();
    
        for (Pooling_Data__c record : [SELECT year__c FROM pooling_Data__c WHERE year__c != NULL]) {
            yearSet.add((Integer) record.year__c);
        }
    
        List<Integer> yearList = new List<Integer>(yearSet);
        yearList.sort();  

        return yearList;
    }

    // ✅ Fetch Available Months
    @AuraEnabled(cacheable=true)
    public static List<String> getAvailableMonths(Integer selectedYear) {
        List<String> monthList = new List<String>();

        // Fetch distinct months for the selected year
        AggregateResult[] results = [SELECT Month__c FROM pooling_Data__c WHERE Year__c = :selectedYear GROUP BY Month__c ORDER BY Month__c ASC];

        for (AggregateResult ar : results) {
            monthList.add((String) ar.get('Month__c'));
        }
        return monthList;
    }

    // ✅ Fetch Available Days
    @AuraEnabled(cacheable=true)
public static List<String> getAvailableDates(Integer selectedYear, String selectedMonth) {
    Set<String> dateSet = new Set<String>();

    for (pooling_Data__c record : [
        SELECT Date__c FROM pooling_Data__c 
        WHERE Year__c = :selectedYear AND Month__c = :selectedMonth 
        ORDER BY Date__c ASC
    ]) {
        dateSet.add(record.Date__c.format()); // Convert to string format
    }

    return new List<String>(dateSet);
}

// ✅ Fetch Available Time Slots
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
    public static String saveBooking(Integer selectedYear, String selectedMonth, Integer selectedDate, String selectedSlot) {
        try {
            Pooling_Appointment__c newBooking = new Pooling_Appointment__c();
            newBooking.Year__c = Integer.valueOf(selectedYear);
            newBooking.Month__c = selectedMonth;
            newBooking.Date__c = selectedDate;
            newBooking.Slot__c = selectedSlot;
            newBooking.Status__c = 'Booked'; // Default status

            insert newBooking;
            return 'Success';
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }

}