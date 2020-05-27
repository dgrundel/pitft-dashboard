import * as os from 'os';
import { StatCollector } from './StatCollector';

export type CpuLoad = [number, number, number];
export const cpuStats = new StatCollector<CpuLoad>(40, 15000, () => Promise.resolve(os.loadavg() as CpuLoad));

