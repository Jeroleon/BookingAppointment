import { LightningElement, track, wire } from 'lwc';
import getAvailableDates from '@salesforce/apex/PollAppointment.getAvailableDates';
import getAvailableSlots from '@salesforce/apex/PollAppointment.getAvailableSlots';
import saveBooking from '@salesforce/apex/PollAppointment.saveBooking';
import cancelBooking from '@salesforce/apex/PollAppointment.cancelBooking';
import rescheduleBooking from '@salesforce/apex/PollAppointment.rescheduleBooking';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CalendarBooking extends LightningElement {
    @track availableDates = [];
    @track availableSlots = [];
    @track bookedSlots = [];
    @track selectedDate = null;
    @track selectedSlot = null;
    @track showSlots = false;
    @track showModal = false;
    @track showRescheduleModal = false;

    // Reschedule Data
    @track rescheduleAvailableDates = [];
    @track rescheduleAvailableSlots = [];
    @track newSelectedDate = null;
    @track newSelectedSlot = null;
    @track rescheduleSlot = null;

    // Date range for selection
    minDate = new Date().toISOString().split('T')[0];
    maxDate = new Date();
    
    connectedCallback() {
        this.maxDate.setDate(this.maxDate.getDate() + 14);
        this.maxDate = this.maxDate.toISOString().split('T')[0];
    }

    // Load available dates
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
            console.error('❌ Error fetching dates:', error);
        }
    }

    // Load available slots
    loadSlots(date) {
        getAvailableSlots({ selectedDate: date })
            .then(response => {
                const data = JSON.parse(response);
                this.availableSlots = data.availableSlots.map(slot => ({
                    time: slot,
                    isSelected: false
                }));
                this.bookedSlots = data.bookedSlots.map(slot => ({
                    time: slot,
                    status: "Booked"
                }));
            })
            .catch(error => {
                console.error('❌ Error fetching slots:', error);
            });
    }

    handleDateClick(event) {
        this.selectedDate = event.currentTarget.dataset.id;
        this.selectedSlot = null;
        this.showSlots = true;

        this.availableDates = this.availableDates.map(date => ({
            ...date,
            isSelected: date.id === this.selectedDate
        }));

        this.loadSlots(this.selectedDate);
    }

    handleSlotClick(event) {
        this.selectedSlot = event.currentTarget.dataset.time;

        this.availableSlots = this.availableSlots.map(slot => ({
            ...slot,
            isSelected: slot.time === this.selectedSlot
        }));
    }

    handleConfirm() {
        if (!this.selectedDate || !this.selectedSlot) {
            this.showToast('Error', 'Please select a date and slot.', 'error');
            return;
        }

        saveBooking({ selectedDate: this.selectedDate, selectedSlot: this.selectedSlot })
            .then(result => {
                if (result === 'Success') {
                    this.showToast('Success', 'Appointment booked successfully!', 'success');
                    this.showModal = true;
                    this.loadSlots(this.selectedDate);
                } else {
                    throw new Error(result);
                }
            })
            .catch(error => {
                console.error('❌ Error booking appointment:', error);
                this.showToast('Error', error.body?.message || error.message, 'error');
            });
    }

    handleCancelBooking(event) {
        const slotToCancel = event.currentTarget.dataset.time;

        cancelBooking({ selectedDate: this.selectedDate, selectedSlot: slotToCancel })
            .then(result => {
                if (result === 'Success') {
                    this.showToast('Success', 'Appointment cancelled.', 'success');
                    this.loadSlots(this.selectedDate);
                } else {
                    throw new Error(result);
                }
            })
            .catch(error => {
                console.error('❌ Error cancelling appointment:', error);
                this.showToast('Error', error.body?.message || error.message, 'error');
            });
    }

    // ✅ **Fix: Reschedule Popup Now Loads Correctly**
    handleRescheduleClick(event) {
        this.rescheduleSlot = event.currentTarget.dataset.time;
        this.showRescheduleModal = true;
        this.newSelectedDate = null;
        this.newSelectedSlot = null;

        console.log("⏳ Fetching reschedule dates...");
        getAvailableDates()
            .then(data => {
                this.rescheduleAvailableDates = data.map(date => ({
                    id: date.dateString,
                    month: date.month,
                    date: date.day,
                    day: date.dayName,
                    isSelected: false
                }));
                console.log("✅ Reschedule dates loaded:", this.rescheduleAvailableDates);
            })
            .catch(error => {
                console.error('❌ Error fetching reschedule dates:', error);
            });
    }

    handleDateChange(event) {
        this.newSelectedDate = event.target.value;
        console.log("📅 New selected reschedule date:", this.newSelectedDate);
    }

    handleSlotSelection(event) {
        this.newSelectedSlot = event.detail;
        console.log("⏰ New selected reschedule slot:", this.newSelectedSlot);
    }

    confirmReschedule() {
        if (!this.rescheduleSlot || !this.newSelectedDate || !this.newSelectedSlot) {
            this.showToast('Error', 'Please select a new date and slot.', 'error');
            return;
        }
    
        rescheduleBooking({ 
            oldDate: this.selectedDate, 
            oldSlot: this.rescheduleSlot, 
            newDate: this.newSelectedDate, 
            newSlot: this.newSelectedSlot 
        })
        .then(result => {
            console.log('🔹 Reschedule Response:', result);
    
            if (result === 'Success') {
                this.showToast('Success', 'Appointment rescheduled successfully!', 'success');
                this.showRescheduleModal = false;
                this.selectedDate = this.newSelectedDate;
                this.selectedSlot = this.newSelectedSlot;
                this.loadSlots(this.selectedDate);
            } else {
                throw new Error(result); // Ensure we capture and display proper error messages
            }
        })
        .catch(error => {
            console.error('❌ Error rescheduling appointment:', error);
            this.showToast('Error', error.body?.message || error.message, 'error');
        });
    }

    handleRescheduleCancel() {
        this.showRescheduleModal = false;
    }

    closeModal() {
        this.showModal = false;
        this.showRescheduleModal = false;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
