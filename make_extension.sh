#!/bin/bash
rm -rf SCU-Schedule-Helper.zip

cd extension

rm -rf out

npm run buildall

cd out
zip -r ../../SCU-Schedule-Helper.zip .