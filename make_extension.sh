#!/bin/bash
cd extension

rm -rf out

npm run buildall

cd out
zip -r ../../SCU-Schedule-Helper.zip .