export default class EventEmitter {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	public callbacks: { [key: string]: Function[] } = {};

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	public on(event: string, fn: Function): this {
		if (!this.callbacks[event]) {
			this.callbacks[event] = [];
		}

		this.callbacks[event].push(fn);

		return this;
	}

	protected emit(event: string, ...args: any): this {
		const callbacks = this.callbacks[event];

		if (callbacks) {
			callbacks.forEach((callback) => callback.apply(this, args));
		}

		return this;
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	public off(event: string, fn?: Function): this {
		const callbacks = this.callbacks[event];

		if (callbacks) {
			if (fn) {
				this.callbacks[event] = callbacks.filter((callback) => callback !== fn);
			} else {
				delete this.callbacks[event];
			}
		}

		return this;
	}

	removeAllListeners(): void {
		this.callbacks = {};
	}
}
