import * as os from 'os';
import { StatData } from '../StatData';

export type CpuLoad = [number, number, number];

export const cpuStats = new StatData<CpuLoad>(40, 15000, () => (os.loadavg() as CpuLoad));