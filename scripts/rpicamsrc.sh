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

gst-launch-1.0 --quiet rpicamsrc preview=false annotation-mode=$((0x40c)) annotation-text-size=16 ! video/x-h264,width=1296,height=972,framerate=42/1 ! h264parse ! matroskamux ! fdsink | $ORR --storage ${ROOT}/${NAME} --serve --pipe --incache 1G:8G
