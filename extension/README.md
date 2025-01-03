# Tips
## Important Stuff
1. The react content scripts are under the /\_\_test__ folder so that they are ignored by Next.js in the build process. This is important, otherwise it will merge the entire /\_\_test__ folder into the /out folder
    * Basically, just don't rename it unless you find a better solution to ignore the files in the build process.
## Install Dependencies
Start by running `npm i`

## Load the Extension
1. Go to chrome://extensions
2. Enable developer mode in top right
3. Click "load unpacked" in the top left
4. Select the /out folder inside /extension

## Helpful Commands
1. Build the entire chrome extension:

    `npm run buildall`
2. Or, to just build the react content scripts (and effectively refresh any changes): 
    
    `npm run refreshcs`
3. Or, to just build the extension without the react content scripts: 

    `npm run build`
4. Or, to just refresh the service worker and public files: 

    `npm run refreshpb`

