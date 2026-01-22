---
slug: 'basic-systemd'
title: 'Walkthrough: How to start a long-running command on boot with systemd'
date: '2020-09-20T17:25:03.614Z'
---

### Creating the Systemd Unit

Systemd is a process manager that can start, stop, and manage processes ("_Units_") on boot or shutdown of your machine!
In this walkthrough, we'll be starting a long-running Node.js web server that lives in `/var/www/`.

To create a new _Unit_, we need to create a file in `/etc/systemd/system/` (the default location on most Linux distributions).
This file should have the `.service` extension.

Let's create `/etc/systemd/system/webserver.service`:

```ini
[Unit]
# Since we're going to bind to a port on localhost, we need to wait for the
# network to be available:
After=network.target
Description=My fancy web server

[Service]
# Set the working directory to where your application lives
WorkingDirectory=/var/www
# Set any environment variables your application needs
Environment=NODE_ENV=production
Environment=PORT=3000
# Start your webserver (use absolute path - find yours with `which node`)
ExecStart=/usr/bin/node server.js
# Restart the service if it crashes
Restart=always
# Wait 3 seconds before restarting
RestartSec=3

[Install]
# Start this service when the system boots to multi-user mode
WantedBy=multi-user.target
```

After you've created the file, update it to have the correct permissions (`664`):

```bash
chmod 664 /etc/systemd/system/webserver.service
```

Don't be intimidated by the file above! A lot of it is boilerplate.
Read the comments placed in the above file to understand what each section is for!

You can learn more about the [_Unit_](https://www.freedesktop.org/software/systemd/man/systemd.unit.html) or [_Service_](https://www.freedesktop.org/software/systemd/man/systemd.service.html) sections in the systemd documentation.

The _Install_ section is used to configure when the service will start. Most commonly, you'll want `multi-user.target`.
The `WantedBy` value directly corresponds to different [Linux runlevels](https://en.wikipedia.org/wiki/Runlevel):

| runlevel | WantedBy value      | Description                                            |
| -------- | ------------------- | ------------------------------------------------------ |
| 0        | `poweroff.target`   | Run before the computer shuts down                     |
| 1        | `rescue.target`     | Run when the system is in single-user mode             |
| 2-4      | `multi-user.target` | Non-graphical multi-user system (networking available) |
| 5        | `graphical.target`  | Run when the display manager has started               |
| 6        | `reboot.target`     | Run before the computer reboots                        |

### Enabling the Systemd Unit

Now that the unit has been created, we need to reload the Systemd process.
This will allow Systemd to recognize the new file.

Run the following command:

```bash
systemctl daemon-reload
```

> **Tip**: You need to execute the above command to reload Systemd **every time** you edit your `.service` file(s).

Next, you'll need to enable the service. Running this command will create a symlink into your `WantedBy` target.

```bash
systemctl enable webserver
```

Finally, since your system is already booted, run the following command to start the service:

```bash
systemctl start webserver
```

### Cheatsheet

**Enabling (creating) or Disabling (deleting) your service**

```bash
systemctl enable webserver # enable service to start on boot
systemctl disable webserver # disable service from starting on boot
```

**Starting, Restarting, or Stopping your service**

```bash
systemctl start webserver
systemctl restart webserver
systemctl stop webserver
```

**Checking the status of your service**

```bash
systemctl status webserver
```
