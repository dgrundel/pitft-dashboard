import * as fs from 'fs';

const BACKLIGHT_SYSFS_PATH = '/sys/class/backlight/soc\:backlight/brightness';
const BACKLIGHT_ON = '1';
const BACKLIGHT_OFF = '0';

let backlightEnabled = fs.readFileSync(BACKLIGHT_SYSFS_PATH).toString() === BACKLIGHT_ON;

export const isBacklightOn = () => backlightEnabled;

export const setBacklight = (enable: boolean) => {
    backlightEnabled = enable === true;
    fs.writeFileSync(BACKLIGHT_SYSFS_PATH, backlightEnabled ? BACKLIGHT_ON : BACKLIGHT_OFF);
};

export const toggleBacklight = () => {
    setBacklight(!isBacklightOn());
}