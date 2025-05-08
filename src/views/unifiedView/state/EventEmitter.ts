/**
 * Simple event emitter for state change notifications
 * Allows components to subscribe to specific state changes
 */
export class EventEmitter {
    private listeners: Map<string, Function[]> = new Map();
    
    /**
     * Subscribe to an event
     * @param event - Event name to subscribe to
     * @param callback - Function to call when event is emitted
     * @returns Unsubscribe function
     */
    public on(event: string, callback: Function): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        this.listeners.get(event)?.push(callback);
        
        // Return unsubscribe function
        return () => {
            const eventListeners = this.listeners.get(event);
            if (eventListeners) {
                const index = eventListeners.indexOf(callback);
                if (index !== -1) {
                    eventListeners.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * Emit an event with data
     * @param event - Event name to emit
     * @param data - Data to pass to listeners
     */
    public emit(event: string, data?: any): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                callback(data);
            });
        }
    }
    
    /**
     * Remove all listeners for an event
     * @param event - Event name to clear listeners for
     */
    public clear(event?: string): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}