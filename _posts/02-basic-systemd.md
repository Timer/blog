---
slug: 'basic-systemd'
title: 'Walkthrough: How to start a long-running command on boot with systemd'
date: '2020-09-20T17:25:03.614Z'
---

### Creating the Systemd Unit

Systemd is a process manager can start, stop, and manage processes ("_Units_") on boot or shutdown of your machine!
In this walkthrough, we'll be starting a long-running Node.js web server that lives in `/var/www/`.

To create a new _Unit_, we need to create a file in `/etc/systemd/system/` (the default location most Linux distributions).
This file should have the `.service` extension.

Let's create `/etc/systemd/system/webserver.service`:

```ini
[Unit]
# Since we're going to bind to a port on localhost, we need to wait for the
# network service to boot:
After=network.service
Description="My fancy web sever"

# Configure your long-running process:
# You'll want to adjust:
# * WorkingDirectory: change this to the directory your application is in
# * Environment: add or remove these options depending on your environment variable needs
# * ExecStart: this is the command that'll be run to start your application
[Service]
WorkingDirectory=/var/www # set the cwd (current working directory)
Environment=NODE_ENV="production"
Environment=PORT=3000
ExecStart=npm start # start your webserver! e.g. `node server.js`
Restart=always # always restart the webserver if it crashes
RestartSec=3 # after a crash, wait 3 seconds before restarting the server

# Run this service anytime the system boots:
[Install]
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

| runlevel | WantedBy value    | Description                                                            |
| -------- | ----------------- | ---------------------------------------------------------------------- |
| 0        | poweroff.target   | Run before the computer shuts down                                     |
| 1        | rescue.target     | Run when the system is in single-user mode                             |
| 2-4      | multi-user.target | Run when the system is ready for login, but before networking is setup |
| 5        | graphical.target  | Run when the display manager has started                               |
| 6        | reboot.target     | Run before the computer reboots                                        |

### Enabling the Systemd Unit

Now that the unit has been created, we need to reload the Systemd process.
This will allow Systemd to recognize the new file.

Run the following command:

```bash
systemctl daemon-reload
```

> **Tip**: You need to execute the above command to reload Systemd **every time** you edit your `.service` file(s).

Next, you'll need to **enable** the service. Running this command will create a symlink into your `WantedBy` target.

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
systemctl enable webserver # install a new service file
systemctl disable webserver # uninstall a service file
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
