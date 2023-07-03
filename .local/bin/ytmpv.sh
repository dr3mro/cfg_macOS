#!/bin/bash
notify-send -t 7000 --icon=mpv "Playing video" $(wl-paste); mpv "$(wl-paste)"

