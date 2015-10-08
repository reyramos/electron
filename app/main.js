'use strict';
const BrowserWindow = require('browser-window');
const Menu = require('menu');
const angular = require('./ng-electron/ng-bridge');
const http = require("http");
const path = require('path');
const ipc = require('ipc');
const app = require('app');
const fs = require('fs');
const dialog = require('dialog');
const version = require('./version.json');
const MenuItem = require('menu-item');
const utilities = require('./utilities');

const urlBuilds = "http://dev-eligibility-phoenix.labcorp.com/reyramos/builds/";
//const webUrl = "https://dev-demographics-phoenix.labcorp.com/web-ui";
const webUrl = "https://dev-eligibility-phoenix.labcorp.com/reyramos/dist/";

// prevent window being GC'd
let mainWindow;

/**
 * getJSON:  REST get request returning JSON object(s)
 * @param options: http options object
 * @param callback: callback to pass the results JSON object(s) back
 */
function getVersion(callback) {
    http.get(urlBuilds + "build.json", function (res) {
        var output = '';
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function () {
            var obj = JSON.parse(output);
            callback(res.statusCode, obj);
        });

    }).on('error', function (e) {
        callback(e);
    });
}


function createMainWindow() {
    const win = new BrowserWindow({
        width: 1350,
        height: 800,
        resizable: true,
        icon: path.join(__dirname, 'icon.ico'),
        title: 'LabCorp Phoenix'
    });

    //win.loadUrl('file://' + __dirname + '/index.html');
    win.loadUrl(webUrl);

    win.on('closed', function () {
        mainWindow = null;
    });

    return win;
}


/**
 * Create the main Electron Application
 */
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
}).on('activate-with-no-open-windows', function () {
    if (!mainWindow) {
        mainWindow = createMainWindow();
    }
}).on('will-quit', function () {
    console.log('<====================================>');
    console.log('Goodbye');
}).on('ready', function () {
    mainWindow = createMainWindow();
    mainWindow.webContents.on('dom-ready', function (e) {
        mainWindow.webContents.executeJavaScript("document.documentElement.setAttribute('id','ELECTRON_PARENT_CONTAINER');");
    });

    //open the developer tools
    mainWindow.openDevTools();
    mainWindow.webContents.on('did-finish-load', function (e) {

        setTimeout(function () {
            angular.send('hello from electron');
            getVersion(function (status, obj) {
                console.log('<====================================>');
                console.log('version => ', obj);

                var vrsCompare = utilities.versionCompare(obj.version, version.version);
                if (vrsCompare > 0) {
                    mainWindow.close();
                    var download = new BrowserWindow({
                        width: 402,
                        height: 152,
                        resizable: false,
                        transparent: true,
                        frame: false,
                        'always-on-top': true
                    });

                    download.loadUrl('file://' + __dirname + '/dialogs/download.html?version=' + obj.version);
                    download.on('closed', function () {
                        download = null;
                    })

                    //lets close it after 5 minutes
                    setTimeout(function () {
                        download.close();
                    }, 1000 * 60 * 5)

                }
            });

        }, 500);

        angular.listen(function (msg) {
                console.log('Client: ' + msg);
            });

    });

});
