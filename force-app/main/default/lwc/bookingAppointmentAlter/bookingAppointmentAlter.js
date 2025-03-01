import { LightningElement, track, wire } from 'lwc';
import getAvailableDates from '@salesforce/apex/PollAppointment.getAvailableDates';
import getAvailableSlots from '@salesforce/apex/PollAppointment.getAvailableSlots';
// import bookAppointment from '@salesforce/apex/PollAppointment.bookAppointment';
import rescheduleBooking from '@salesforce/apex/PollAppointment.rescheduleBooking';
//import bookAppointment from '@salesforce/apex/PollAppointment.bookAppointment';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class BookingSystem extends LightningElement {
    @track availableDates = [];
    @track availableSlots = [];
    @track bookedSlots = [];
    @track selectedDate = null;
    @track selectedSlot = null;
    @track showRescheduleModal = false;
    @track rescheduleSlot = null;
    @track newSelectedDate = null;
    @track newSelectedSlot = null;

    @track slots = [];
    @track error;

    selectedDate = new Date().toISOString().split('T')[0]; // Default to today

    @wire(getAvailableSlots, { selectedDate: '$selectedDate' })
    wiredSlots({ error, data }) {
        if (data) {
            this.slots = data;
            this.error = undefined;
        } else if (error) {
            this.error = 'Error fetching slots: ' + JSON.stringify(error);
            console.error('Error fetching slots:', error);
        }
}

    // Fetch available dates
   

    // Handle date selection
    handleDateClick(event) {
        this.selectedDate = event.currentTarget.dataset.id;
        this.availableDates = this.availableDates.map(date => ({
            ...date,
            isSelected: date.id === this.selectedDate
        }));
        this.fetchSlots();
    }

    // Fetch available slots based on selected date
    fetchSlots() {
        getAvailableSlots({ selectedDate: this.selectedDate })
            .then(data => {
                this.availableSlots = data.map(slot => ({ time: slot, isSelected: false, status: 'Available' }));
            })
            .catch(() => this.showToast('Error', 'Error fetching slots', 'error'));
    }

    // Handle slot selection
    handleSlotClick(event) {
        const selectedTime = event.currentTarget.dataset.time;
        this.selectedSlot = selectedTime;
        this.availableSlots = this.availableSlots.map(slot => ({
            ...slot,
            isSelected: slot.time === this.selectedSlot
        }));
    }

    // Book an appointment
    confirmBooking() {
        if (!this.selectedDate || !this.selectedSlot) {
            this.showToast('Error', 'Please select a date and slot', 'error');
            return;
        }
        
        bookAppointment({ selectedDate: this.selectedDate, selectedSlot: this.selectedSlot })
            .then(() => {
                this.showToast('Success', 'Appointment booked successfully!', 'success');
                this.bookedSlots.push({ time: this.selectedSlot, status: 'Booked' });
                this.fetchSlots();
            })
            .catch(() => this.showToast('Error', 'Error booking appointment', 'error'));
    }

    // Open reschedule modal
    openRescheduleModal(event) {
        this.rescheduleSlot = event.currentTarget.dataset.time;
        this.showRescheduleModal = true;
    }

    // Handle reschedule date selection
    handleRescheduleDateClick(event) {
        this.newSelectedDate = event.currentTarget.dataset.id;
        this.fetchSlots();
    }

    // Handle reschedule slot selection
    handleRescheduleSlotClick(event) {
        this.newSelectedSlot = event.currentTarget.dataset.time;
    }

    // Confirm rescheduling
    confirmReschedule() {
        if (!this.newSelectedDate || !this.newSelectedSlot) {
            this.showToast('Error', 'Please select a new date and slot', 'error');
            return;
        }
        
        rescheduleBooking({ oldDate: this.selectedDate, oldSlot: this.rescheduleSlot, newDate: this.newSelectedDate, newSlot: this.newSelectedSlot })
            .then(result => {
                if (result === 'Success') {
                    this.showToast('Success', 'Appointment rescheduled successfully!', 'success');
                    this.showRescheduleModal = false;
                    this.bookedSlots = this.bookedSlots.map(slot => 
                        slot.time === this.rescheduleSlot ? { time: this.newSelectedSlot, status: 'Booked' } : slot
                    );
                    this.fetchSlots();
                } else {
                    throw new Error(result);
                }
            })
            .catch(() => this.showToast('Error', 'Error rescheduling appointment', 'error'));
    }

    // Close reschedule modal
    handleRescheduleCancel() {
        this.showRescheduleModal = false;
        this.newSelectedDate = null;
        this.newSelectedSlot = null;
    }

    // Utility function for toast messages
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant
        });
        this.dispatchEvent(event);
    }
}
