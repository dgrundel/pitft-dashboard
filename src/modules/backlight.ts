import * as fs from 'fs';

const BACKLIGHT_SYSFS_PATH = '/sys/class/backlight/soc\:backlight/brightness';
const BACKLIGHT_ON = '1';
const BACKLIGHT_OFF = '0';

let state = fs.readFileSync(BACKLIGHT_SYSFS_PATH).toString() !== BACKLIGHT_OFF;

let timeoutInterval = 30000;
let timeoutId: NodeJS.Timeout = undefined;

export const isBacklightOn = () => state;

export const setBacklight = (enable: boolean) => {
    state = enable === true;

    // remove existing timer
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    // if we're turning the backlight on, set a timer to turn it back off
    if (state) {
        timeoutId = setTimeout(() => {
            setBacklight(false);
            timeoutId = undefined;
        }, timeoutInterval);
    }

    fs.writeFileSync(BACKLIGHT_SYSFS_PATH, state ? BACKLIGHT_ON : BACKLIGHT_OFF);
};

export const toggleBacklight = () => {
    setBacklight(!state);
};
