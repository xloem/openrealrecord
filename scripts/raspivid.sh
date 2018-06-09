#!/bin/bash

ORR="../bin/openrealrecord --db xiraiCfF7+5RkXrqrWy804+7Lr2edAOy8CrDCvifM4k"
ROOT=/home/pi/.real

if ! [ -e "$ROOT"/raspivid ]
then
  rpiver=$(cat /proc/cpuinfo | grep Revision | awk '{print $3}')
  rpiser=$(cat /proc/cpuinfo | grep Serial | awk '{print $3}')
  $ORR --storage ${ROOT}/raspivid --my-name "rpi $rpiver $rpiser video" --sync
fi

raspivid -n -v -t 0 -ih -o - | $ORR --storage ${ROOT}/raspivid --serve --pipe --incache 1G:8G
