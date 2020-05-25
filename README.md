## Enabling Write access to backlight

Create a `backlight` group and add the `pi` user to it:
```
sudo groupadd backlight
sudo usermod -a -G backlight pi
```

Create a udev rules file:
```
sudo nano /etc/udev/rules.d/99-backlight.rules
```

...with the following contents:
```
ACTION=="add", SUBSYSTEM=="backlight", RUN+="/bin/chgrp backlight /sys/class/backlight/%k/brightness"
ACTION=="add", SUBSYSTEM=="backlight", RUN+="/bin/chmod g+w /sys/class/backlight/%k/brightness"
```