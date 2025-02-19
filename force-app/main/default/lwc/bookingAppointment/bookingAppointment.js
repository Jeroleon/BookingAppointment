import { LightningElement, track, wire } from 'lwc';
import getAvailableDates from '@salesforce/apex/PollAppointment.getAvailableDates';
import getAvailableSlots from '@salesforce/apex/PollAppointment.getAvailableSlots';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import saveBooking from '@salesforce/apex/PollAppointment.saveBooking';

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
        getAvailableSlots()
        .then(data => {
            this.availableSlots = data.map(slot => ({
                time: slot,
                isSelected: false
            }));
        })
        .catch(error => {
            console.error('Error fetching slots:', error);
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
                    this.showToast('Success', 'Booking Confirmed!', 'success');
                } else {
                    this.showToast('Error', result, 'error');
                }
            })
             .catch(error => {
                console.error('Error booking:', error);
                this.showToast('Error', error.body.message, 'error');
            });
            
            
        } else {
            this.showToast('Error', 'Please select a date and slot.', 'error');
        }
        

        
    }

    handleCancel() {
        this.selectedSlot = null;
        this.availableSlots = this.availableSlots.map(slot => ({ ...slot, isSelected: false }));
    }

    closeModal() {
        this.showModal = false;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
