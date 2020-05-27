import * as os from 'os';
import * as osu from 'node-os-utils';

import { StatCollector } from './StatCollector';

/**
 * CPU
 */
export type CpuLoad = [number, number, number];
export const cpuStats = new StatCollector<CpuLoad>(40, 15000, () => Promise.resolve(os.loadavg() as CpuLoad));

/**
 * Memory
 */
export interface MemoryUsage {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
}
export const memoryStats = new StatCollector<MemoryUsage>(40, 15000, () => {
    const free = os.freemem(); // bytes
    const total = os.totalmem(); // bytes
    const used = total - free; // bytes

    return Promise.resolve({
        totalBytes: total,
        freeBytes: free,
        usedBytes: used
    });
})

/**
 * Disk Info
 */
export interface DriveUsage {
    totalGb: number;
    freeGb: number;
    freePercentage: number;
    usedGb: number;
    usedPercentage: number;
}
export const driveStats = new StatCollector<DriveUsage>(10, 60000, () => osu.drive.info('/')
    .then(info => Promise.resolve(
        osu.isNotSupported(info)
        ? undefined
        : {
            totalGb: parseFloat(info.totalGb as any),
            freeGb: parseFloat(info.freeGb as any),
            freePercentage: parseFloat(info.freePercentage as any),
            usedGb: parseFloat(info.usedGb as any),
            usedPercentage: parseFloat(info.usedPercentage as any)
        }
    )));

/**
 * Network Throughput
 */
export interface NetworkSpeed {
    interface: string;
    inputBytes: number;
    outputBytes: number;
}
export type NetworkSpeedStats = Record<string, StatCollector<NetworkSpeed>>;
export const networkSpeedStats = Object.keys(os.networkInterfaces())
    .reduce((map: NetworkSpeedStats, ifName) => {
        map[ifName] = new StatCollector<NetworkSpeed>(60, 10000, () => osu.netstat.stats()
            .then(info => {
                if (osu.isNotSupported(info)) {
                    return undefined;
                }

                const ifInfo = info.find(i => i.interface === ifName);

                return Promise.resolve(
                    ifInfo
                    ? {
                        interface: ifName,
                        inputBytes: parseFloat(ifInfo.inputBytes),
                        outputBytes: parseFloat(ifInfo.outputBytes)
                    }
                    : undefined
                );
            }));
        return map;
    }, {});