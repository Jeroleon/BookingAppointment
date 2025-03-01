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
    @track showRescheduleModal = false;

    // Reschedule Data
    @track rescheduleAvailableSlots = [];
    @track newSelectedDate = null;
    @track newSelectedSlot = null;
    @track rescheduleBookingId = null;

    minDate = new Date().toISOString().split('T')[0];
    maxDate = new Date();
    
    connectedCallback() {
        this.maxDate.setDate(this.maxDate.getDate() + 14);
        this.maxDate = this.maxDate.toISOString().split('T')[0];
    }

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
            console.log('Available dates loaded:', this.availableDates);
        } else if (error) {
            console.error('❌ Error fetching dates:', error);
            this.showToast('Error', 'Failed to load available dates.', 'error');
        }
    }

    loadSlots(date) {
        getAvailableSlots({ selectedDate: date })
            .then(response => {
                console.log('Raw slots response:', response);
                const data = JSON.parse(response);
                console.log('Parsed slots data:', data);
                this.availableSlots = data.availableSlots.map(slot => ({
                    time: slot.time || 'N/A',
                    isSelected: false
                }));
                this.bookedSlots = data.bookedSlots.map(slot => ({
                    bookingId: slot.bookingId,
                    time: slot.time || 'N/A',
                    status: slot.status || 'Booked'
                }));
                console.log('Available slots:', this.availableSlots);
                console.log('Booked slots:', this.bookedSlots);
            })
            .catch(error => {
                console.error('❌ Error fetching slots:', error);
                this.showToast('Error', 'Failed to load slots.', 'error');
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
        console.log('Selected date:', this.selectedDate);

        this.loadSlots(this.selectedDate);
    }

    handleSlotClick(event) {
        this.selectedSlot = event.currentTarget.dataset.time;
        this.availableSlots = this.availableSlots.map(slot => ({
            ...slot,
            isSelected: slot.time === this.selectedSlot
        }));
        console.log('Selected slot:', this.selectedSlot);
    }

    handleConfirm() {
        if (!this.selectedDate || !this.selectedSlot) {
            this.showToast('Error', 'Please select a date and slot.', 'error');
            return;
        }

        saveBooking({ selectedDate: this.selectedDate, selectedSlot: this.selectedSlot })
            .then(result => {
                if (result.startsWith('Success')) {
                    const bookingId = result.split(':')[2];
                    this.showToast('Success', 'Appointment booked successfully!', 'success');
                    this.bookedSlots.push({
                        bookingId: bookingId,
                        time: this.selectedSlot,
                        status: 'Booked'
                    });
                    this.selectedSlot = null;
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

    get disableConfirm() {
        return !this.selectedDate || !this.selectedSlot;
    }

    handleCancelBooking(event) {
        const bookingId = event.currentTarget.dataset.id;
        console.log('Cancelling booking ID:', bookingId);

        cancelBooking({ bookingId: bookingId })
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

    handleRescheduleClick(event) {
        this.rescheduleBookingId = event.currentTarget.dataset.id;
        this.showRescheduleModal = true;
        this.newSelectedDate = null;
        this.newSelectedSlot = null;
        console.log('Rescheduling booking ID:', this.rescheduleBookingId);

        this.loadRescheduleSlots(this.selectedDate);
    }

    handleDateChange(event) {
        this.newSelectedDate = event.target.value;
        console.log('New selected date for reschedule:', this.newSelectedDate);
        this.loadRescheduleSlots(this.newSelectedDate);
    }
    
    loadRescheduleSlots(date) {
        getAvailableSlots({ selectedDate: date })
            .then(response => {
                const data = JSON.parse(response);
                this.rescheduleAvailableSlots = data.availableSlots.map(slot => ({
                    time: slot.time || 'N/A',
                    isSelected: false
                }));
                console.log('Reschedule available slots:', this.rescheduleAvailableSlots);
            })
            .catch(error => {
                console.error('❌ Error fetching reschedule slots:', error);
                this.showToast('Error', 'Failed to load reschedule slots.', 'error');
            });
    }

    handleSlotSelection(event) {
        this.newSelectedSlot = event.currentTarget.dataset.time;
        this.rescheduleAvailableSlots = this.rescheduleAvailableSlots.map(slot => ({
            ...slot,
            isSelected: slot.time === this.newSelectedSlot
        }));
        console.log('New selected slot for reschedule:', this.newSelectedSlot);
    }

    confirmReschedule() {
        if (!this.rescheduleBookingId || !this.newSelectedDate || !this.newSelectedSlot) {
            this.showToast('Error', 'Please select a new date and slot.', 'error');
            return;
        }

        rescheduleBooking({ 
            bookingId: this.rescheduleBookingId, 
            newDate: this.newSelectedDate, 
            newSlot: this.newSelectedSlot 
        })
        .then(result => {
            const response = JSON.parse(result);
            if (response.status === 'Success') {
                this.showToast('Success', 'Appointment rescheduled successfully!', 'success');

                // Remove the old booking from bookedSlots
                this.bookedSlots = this.bookedSlots.filter(slot => slot.bookingId !== this.rescheduleBookingId);

                // Add the new booking to bookedSlots
                this.bookedSlots.push({
                    bookingId: response.newBookingId,
                    time: response.newSlot,
                    status: 'Rescheduled'
                });

                // If rescheduling on the same date, update availableSlots
                if (this.selectedDate === this.newSelectedDate) {
                    this.availableSlots.push({
                        time: response.oldSlot,
                        isSelected: false
                    });
                    this.availableSlots = this.availableSlots.filter(slot => slot.time !== response.newSlot);
                } else if (this.selectedDate === response.oldDate) {
                    this.availableSlots.push({
                        time: response.oldSlot,
                        isSelected: false
                    });
                }

                this.availableSlots.sort((a, b) => a.time.localeCompare(b.time));
                console.log('Updated availableSlots:', this.availableSlots);
                console.log('Updated bookedSlots:', this.bookedSlots);

                this.showRescheduleModal = false;
            } else {
                throw new Error(response.message || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('❌ Error rescheduling appointment:', error);
            this.showToast('Error', error.body?.message || error.message, 'error');
        });
    }

    handleRescheduleCancel() {
        this.showRescheduleModal = false;
        console.log('Reschedule cancelled');
    }

    get disableRescheduleConfirm() {
        return !this.newSelectedDate || !this.newSelectedSlot;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}