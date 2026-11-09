---
slug: 'basic-systemd'
title: 'Walkthrough: How to start a long-running command on boot with systemd'
date: '2020-09-20T17:25:03.614Z'
lastEdited: '2026-11-09'
---

### Creating the systemd Unit

systemd is a service manager that can start, stop, and supervise long-running processes on boot or shutdown of your machine!
Each thing it manages is described by a "_Unit_".<sub style="font-size:0.7em"><a href="#ref-1">[1]</a></sub>
In this walkthrough, we'll be starting a long-running Node.js web server that lives in `/var/www/`.

To create a new _Unit_, we need to create a file in `/etc/systemd/system/` (the default location on most Linux distributions).
This file should have the `.service` extension.
You'll need root for this and for the `systemctl` commands below, so prefix them with `sudo` if you aren't already root.

Let's create `/etc/systemd/system/webserver.service`:

```ini
[Unit]
# Order this service after the network stack has started. This does not wait
# for the network to be "up"; if you need a configured address at startup,
# use network-online.target instead (with both After= and Wants=).
After=network.target
Description=My fancy web server

[Service]
# Run as an unprivileged user rather than root, which is the default
# (change this to a user that exists on your machine)
User=www-data
# Set the working directory to where your application lives
WorkingDirectory=/var/www
# Set any environment variables your application needs
Environment=NODE_ENV=production
Environment=PORT=3000
# Start your webserver (use an absolute path - find yours with `which node`)
ExecStart=/usr/bin/node server.js
# Restart the service if it crashes
Restart=always
# Wait 3 seconds before restarting
RestartSec=3

[Install]
# Start this service when the system boots to multi-user mode
WantedBy=multi-user.target
```

After you've created the file, make sure it has the correct permissions (`644`):

```bash
chmod 644 /etc/systemd/system/webserver.service
```

Don't be intimidated by the file above! A lot of it is boilerplate.
Read the comments placed in the above file to understand what each section is for!

> **Note**: Comments in systemd unit files must be on their own line—inline comments after values are not supported.<sub style="font-size:0.7em"><a href="#ref-2">[2]</a></sub> The `ExecStart` directive takes either an absolute path or a bare executable name, which systemd looks up in a fixed set of directories (not your shell's `$PATH`), so an absolute path is the safest choice.<sub style="font-size:0.7em"><a href="#ref-3">[3]</a></sub>

You can learn more about the [_Unit_](https://www.freedesktop.org/software/systemd/man/systemd.unit.html) or [_Service_](https://www.freedesktop.org/software/systemd/man/systemd.service.html) sections in the systemd documentation.

The _Install_ section is used to configure when the service will start. Most commonly, you'll want `multi-user.target`.<sub style="font-size:0.7em"><a href="#ref-4">[4]</a></sub>
The `WantedBy` value roughly maps to the traditional [Linux runlevels](https://en.wikipedia.org/wiki/Runlevel):

| runlevel | WantedBy value      | Description                                            |
| -------- | ------------------- | ------------------------------------------------------ |
| 0        | `poweroff.target`   | System is shutting down and powering off               |
| 1        | `rescue.target`     | Single-user (rescue) mode                              |
| 2-4      | `multi-user.target` | Non-graphical multi-user system (networking available) |
| 5        | `graphical.target`  | Multi-user system with a graphical login               |
| 6        | `reboot.target`     | System is rebooting                                    |

### Enabling the systemd Unit

Now that the unit has been created, we need to tell systemd to reload its unit files.
This will allow systemd to recognize the new file.

Run the following command:

```bash
systemctl daemon-reload
```

> **Tip**: You need to execute the above command to reload systemd **every time** you edit your `.service` file(s).

Next, you'll need to enable the service. Running this command creates a symlink in your `WantedBy` target's `.wants/` directory.

```bash
systemctl enable webserver
```

Finally, since your system is already booted, run the following command to start the service:

```bash
systemctl start webserver
```

> **Tip**: `systemctl enable --now webserver` enables and starts the service in one step.

### Cheatsheet

**Enabling or Disabling your service at boot**

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

**Viewing the logs of your service**

```bash
journalctl -u webserver -f # follow the logs live
```

<small>

<span id="ref-1">[1]</span> freedesktop.org. ["systemd.unit — Unit configuration"](https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html). systemd documentation.

<span id="ref-2">[2]</span> freedesktop.org. ["systemd.syntax — General syntax of systemd configuration files"](https://www.freedesktop.org/software/systemd/man/systemd.syntax.html). "Empty lines and lines starting with '#' or ';' are ignored, which may be used for commenting."

<span id="ref-3">[3]</span> freedesktop.org. ["systemd.service — Service unit configuration"](https://www.freedesktop.org/software/systemd/man/systemd.service.html). "For each command, the first argument must be either an absolute path to an executable or a simple file name without any slashes."

<span id="ref-4">[4]</span> Red Hat. ["Working with systemd unit files"](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_systemd_unit_files_to_customize_and_optimize_your_system/assembly_working-with-systemd-unit-files_working-with-systemd). RHEL 9 Documentation.

</small>
