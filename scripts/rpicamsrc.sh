#!/bin/bash

ORR="../bin/openrealrecord --db $(<db.key)"
ROOT=/home/pi/.real
NAME=rpicam

if ! [ -e "$ROOT"/"$NAME" ]
then
  rpiver=$(cat /proc/cpuinfo | grep Revision | awk '{print $3}')
  rpiser=$(cat /proc/cpuinfo | grep Serial | awk '{print $3}')
  $ORR --storage ${ROOT}/${NAME} --my-name "rpi $rpiver $rpiser video" --sync
fi

# these particular h.264 streams start with 00 00 00 01 27
# that byte sequence marks all valid starting offsets; can seek forward to find it
# i think in general the '2' in '27' may change

gst-launch-1.0 --quiet rpicamsrc preview=false annotation-mode=$((0x40c)) annotation-text-size=16 ! video/x-raw,width=1296,height=972,framerate=42/1 ! omxh264enc ! fdsink | $ORR --storage ${ROOT}/${NAME} --serve --pipe --incache 1G:8G
