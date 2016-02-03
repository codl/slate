'use strict';

const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.

const mpd = require('mpd');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != 'darwin') {
        app.quit();
    }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 1280, height: 720});
    mainWindow.setMenu(null);

    // and load the index.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/index.html');

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

    var web = mainWindow.webContents;

    var client = mpd.connect({
        port: 6600,
        host: 'localhost',
    });

    var previous_song = "";
    function send_song(){
        client.sendCommand("currentsong", function(err, msg){
            if (err) throw err;
            console.log(msg);
            var song = extract_mpd_info(msg);

            var hash = song.file;
            if("Title" in song) hash += song.Title;

            if(previous_song != hash) {
                web.send("mpd", song);
                previous_song = hash;
            }
        });
    }
    client.on('system-player', send_song);
});

function extract_mpd_info(str){
    var info = {}
    var lines = str.split("\n");
    for(var line of lines){
        var tmp = line.split(":");
        if(tmp.length < 2) continue;
        info[tmp[0]] = tmp.slice(1).join(":").trim();
    }
    return info;
}
