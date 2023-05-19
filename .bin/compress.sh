#!/usr/bin/env bash

# example: tar_cJf.sh ./directory > directory.tar.xz

SOURCE="$1"

# get source size
SOURCE_SIZE=$(du -sk "${SOURCE}" | cut -f1)

# archive and compress
tar -cf - "${SOURCE}" | pv -p -s "${SOURCE_SIZE}k" | xz -6 --threads=15 -c -
 
