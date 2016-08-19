# OrderPrinter
This repository gives you the opportunity to print your orders onto a ESC/POS compatible thermal printer.

#Download
- Raspbian
	https://www.raspberrypi.org/downloads/raspbian/
	Installation guide: https://www.raspberrypi.org/documentation/installation/installing-images/README.md

- SDFromater4
	https://www.sdcard.org/downloads/formatter_4/eula_windows/index.html

Download end!

#Setup
##Setup rpi with cable network
1. scan network from your pc (pc needs to be in the same network as rpi)
- install nmap
- command in shell
```nmap -sP 192.168.1.1-255```
(if you have another network, use other network)
connect via putty with (uname: pi, pw: raspberry)

//add user to lp group to access the printer
sudo usermod -a -G lp pi

setup wifi: https://wiki.archlinux.org/index.php/WPA_supplicant
skip to "Connecting with wpa_cli" part

----------
add git part!!!
Copy OrderPrinter folder to /home/pi/ via FileZilla (port 22 username and password same as with putty)
----------

#Install
sudo aptitude update && sudo aptitude upgrade -y

Install nodejs (current)
https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions

//install pm2 
```sh
sudo npm install pm2 -g
```

//setup a pm2 daemon for starting on boot
```sh
sudo su -c "env PATH=$PATH:/usr/bin pm2 startup linux -u pi --hp /home/pi"
```

```sh
sudo apt-get install libusb-dev libudev-dev
```

```sh
cd OrderPrinter
npm install
```
```sh
pm2 start app.js --name=orderprinter --watch
pm2 save
```
