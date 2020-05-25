## Enabling Write access to backlight

```
sudo groupadd pitft
sudo usermod -a -G pitft pi
sudo nano /etc/udev/rules.d/99-backlight.rules
```

```
ACTION=="add", SUBSYSTEM=="backlight", RUN+="/bin/chgrp pitft /sys/class/backlight/%k/brightness"
ACTION=="add", SUBSYSTEM=="backlight", RUN+="/bin/chmod g+w /sys/class/backlight/%k/brightness"
```