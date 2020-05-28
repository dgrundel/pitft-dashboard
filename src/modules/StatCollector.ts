export class Datum<T> {
    value: T;
    time: number;

    constructor(value: T) {
        this.value = value;
        this.time = +(new Date());
    }
}

export class StatCollector<T> {
    data: Datum<T>[] = [];
    maxItems: number;
    interval: number;
    retriever: () => Promise<T>;

    constructor(maxItems: number, interval: number, retriever: () => Promise<T>) {
        this.maxItems = maxItems;
        this.interval = interval;
        this.retriever = retriever;

        // if auto-retrieving, get the first data point now
        if (this.interval > 0) {
            this.retrieve();
        }
    }

    retrieve() {
        // collect and store data point
        const promise: Promise<T> = this.retriever.call(undefined);
        promise.then((datum: T) => {
            if (datum) {
                this.data.push(new Datum(datum));
            }
    
            // if we have exceeded the max data points, remove oldest
            const deleteCount = this.data.length - this.maxItems;
            if (deleteCount > 0) {
                this.data.splice(0, deleteCount);
            }
    
            // collect next data point after interval
            if (this.interval > 0) {
                setTimeout(this.retrieve.bind(this), this.interval);
            }
        });
    }

    last() {
        return this.data[this.data.length - 1];
    }
}