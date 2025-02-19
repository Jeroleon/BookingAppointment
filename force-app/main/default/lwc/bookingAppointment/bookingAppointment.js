import { LightningElement, track, wire } from 'lwc';
import getAvailableDates from '@salesforce/apex/PollAppointment.getAvailableDates';
import getAvailableSlots from '@salesforce/apex/PollAppointment.getAvailableSlots';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import saveBooking from '@salesforce/apex/PollAppointment.saveBooking';
import cancelBooking from '@salesforce/apex/PollAppointment.cancelBooking';

export default class CalendarBooking extends LightningElement {
    @track availableDates = [];
    @track availableSlots = [];
    @track selectedDate = null;
    @track selectedSlot = null;
    @track showSlots = false;
    @track showModal = false;

    // Fetch available dates from today up to two weeks
    @wire(getAvailableDates)
    wiredDates({ error, data }) {
        if (data) {
            this.availableDates = data.map(date => ({
                id: date.dateString, 
                month: date.month,
                date: date.day,
                day: date.dayName,
                isSelected: false
            }));
        } else if (error) {
            console.error('Error fetching dates:', error);
        }
    }

    handleDateClick(event) {
        const selectedId = event.currentTarget.dataset.id;
        console.log("Selected Date ID:", selectedId);
        const selectedDate = this.availableDates.find(date => date.id === selectedId);


        this.availableDates = this.availableDates.map(date => ({
            ...date,
            isSelected: date.id === selectedId
        }));
        console.log("Updated Dates:", JSON.stringify(this.availableDates));

        this.selectedDate = selectedDate.id; // Use full date
        console.log("Selected Date:", this.selectedDate);
        console.log(typeof this.selectedDate);
        this.selectedSlot = null;
        this.showSlots = true;

        // Fetch available slots for the selected date
        getAvailableSlots({ selectedDate: this.selectedDate })
    .then(response => {
        console.log("✅ Slots Data Received:", JSON.stringify(response));
        const data = JSON.parse(response); // ✅ Convert JSON string to object

        this.availableSlots = data.availableSlots.map(slot => ({
            time: slot,
            isSelected: false
        }));

        this.bookedSlots = data.bookedSlots.map(slot => ({
            time: slot,
            isSelected: false
        }));
    })
    .catch(error => {
        console.error('❌ Error fetching slots:', error);
    });
        this.availableDates = [...this.availableDates];
    }

    handleSlotClick(event) {
        const selectedTime = event.currentTarget.dataset.time;

        this.availableSlots = this.availableSlots.map(slot => ({
            ...slot,
            isSelected: slot.time === selectedTime
        }));

        this.selectedSlot = selectedTime;
    }

    handleConfirm() {
        

        if (this.selectedDate && this.selectedSlot) {
            this.showModal = true; // Show success modal
            this.showToast('Success', `Appointment booked for ${this.selectedDate} at ${this.selectedSlot}`, 'success');
            console.log("🔹 Selected Date (Before Sending):", this.selectedDate);
        console.log("⏰ Selected Slot (Before Sending):", this.selectedSlot);

        saveBooking({ selectedDate: String(this.selectedDate), selectedSlot: this.selectedSlot }) 
            .then(result => {
                console.log("✅ Save Booking Result:", result);
                if (result === 'Success') {
                    this.showToast('Success', 'Appointment Booked!', 'success');

                    // ❗ Refresh slots after booking
                    return getAvailableSlots({ selectedDate: this.selectedDate });
                } else {
                    throw new Error(result);
                }
            })
            .then(updatedSlots => {
                console.log("🔄 Updated Slots After Booking:", updatedSlots);

                // ✅ Ensure default values to prevent undefined errors
                this.availableSlots = updatedSlots.availableSlots?.map(slot => ({
                    time: slot,
                    isSelected: false
                })) || [];

                this.bookedSlots = updatedSlots.bookedSlots?.map(slot => ({
                    time: slot,
                    isSelected: false
                })) || [];

                this.selectedSlot = null;
                this.availableSlots = [...this.availableSlots]; // ✅ Force UI update
                this.bookedSlots = [...this.bookedSlots]; // ✅ Refresh booked slots

            })
             .catch(error => {
                console.error('Error booking:', error);
                this.showToast('Error', error.body.message, 'error');
            });

            
            
        } else {
            this.showToast('Error', 'Please select a date and slot.', 'error');
        }
       


        
    }

    handleCancelBooking(event) {
        const slotToCancel = event.currentTarget.dataset.time;

    cancelBooking({ selectedDate: this.selectedDate, selectedSlot: slotToCancel }) 
        .then(result => {
            if (result === 'Success') {
                this.showToast('Success', 'Appointment Canceled!', 'success');

                // ❗ Refresh slots after cancellation
                return getAvailableSlots({ selectedDate: this.selectedDate });
            } else {
                throw new Error(result);
            }
        })
        .then(updatedSlots => {
            console.log("🔄 Updated Slots After Cancellation:", updatedSlots);

            // ✅ Ensure default values to prevent undefined errors
            this.availableSlots = updatedSlots.availableSlots?.map(slot => ({
                time: slot,
                isSelected: false
            })) || [];

            this.bookedSlots = updatedSlots.bookedSlots?.map(slot => ({
                time: slot,
                isSelected: false
            })) || [];

            this.availableSlots = [...this.availableSlots]; // Force UI refresh
            this.bookedSlots = [...this.bookedSlots];
        })
        .catch(error => {
            console.error('❌ Error canceling:', error);
            this.showToast('Error', error.body?.message || error.message, 'error');
        });
    }

    closeModal() {
        this.showModal = false;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
