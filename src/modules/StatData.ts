export class Datum<T> {
    value: T;
    time: number;

    constructor(value: T) {
        this.value = value;
        this.time = +(new Date());
    }
}

export class StatData<T> {
    data: Datum<T>[] = [];
    maxItems: number;
    interval: number;
    retriever: () => T;

    constructor(maxItems: number, interval: number, retriever: () => T) {
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
        const datum: T = this.retriever.call(undefined);
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
    }
}