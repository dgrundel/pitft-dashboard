import * as os from 'os';
import * as osu from 'node-os-utils';

import { StatCollector } from './StatCollector';

// set refresh interval for OSUtils' workers
osu.options.INTERVAL = 5000;

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
    freePercentage: number;
    usedBytes: number;
    usedPercentage: number;
}
export const memoryStats = new StatCollector<MemoryUsage>(40, 15000, () => {
    const free = os.freemem(); // bytes
    const total = os.totalmem(); // bytes
    const used = total - free; // bytes

    return Promise.resolve({
        totalBytes: total,
        freeBytes: free,
        freePercentage: free / total * 100,
        usedBytes: used,
        usedPercentage: used / total * 100
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
export const driveStats = new StatCollector<DriveUsage>(5, 60000, () => osu.drive.info('/')
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
                    return Promise.resolve(undefined);
                }

                const ifInfo = info.find(i => i.interface === ifName);
                const inputBytes = ifInfo && parseFloat(ifInfo.inputBytes);
                const outputBytes = ifInfo && parseFloat(ifInfo.outputBytes);
                
                return Promise.resolve(
                    inputBytes && outputBytes
                    ? {
                        interface: ifName,
                        inputBytes: inputBytes,
                        outputBytes: outputBytes
                    }
                    : undefined
                );
            }));
        return map;
    }, {});

/**
 * Open files and processes
 */
export interface FilesAndProcesses {
    openFiles: number;
    totalProcesses: number;
    zombieProcesses: number;
}
export const fileProcessStats = new StatCollector<FilesAndProcesses>(30, 20000, () => Promise.all([
    osu.openfiles.openFd(),
    osu.proc.totalProcesses(),
    osu.proc.zombieProcesses()
]).then(values => {
    return Promise.resolve({
        openFiles: osu.isNotSupported(values[0]) ? 0 : (values[0] as number),
        totalProcesses: osu.isNotSupported(values[1]) ? 0 : (values[1] as number),
        zombieProcesses: osu.isNotSupported(values[2]) ? 0 : (values[2] as number)
    });
}));


// osu.drive.info('/')
//     .then(info => Promise.resolve(
//         osu.isNotSupported(info)
//         ? undefined
//         : {
//             totalGb: parseFloat(info.totalGb as any),
//             freeGb: parseFloat(info.freeGb as any),
//             freePercentage: parseFloat(info.freePercentage as any),
//             usedGb: parseFloat(info.usedGb as any),
//             usedPercentage: parseFloat(info.usedPercentage as any)
//         }
//     )));

// openfiles.openFd():Promise(number)
// proc.totalProcesses():Promise(number)
// proc.zombieProcesses():Promise(number)