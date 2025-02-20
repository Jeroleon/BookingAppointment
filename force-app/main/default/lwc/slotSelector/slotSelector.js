import { LightningElement, api } from 'lwc';

export default class SlotSelector extends LightningElement {
    @api availableSlots = [];
    selectedSlot;

    handleSlotClick(event) {
        const selectedSlot = event.currentTarget.dataset.slot;
        
        if (!selectedSlot) {
            console.error("❌ Selected slot is undefined or empty!");
            return;
        }

        console.log("📌 Child LWC Selected Slot:", selectedSlot); // Debugging

        // Send only the slot time as a string
        this.dispatchEvent(new CustomEvent('slotselect', {
            detail: selectedSlot
        }));
    }
}