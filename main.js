'use strict';

const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.

const mpd = require('mpd');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        frame: false
    });
    mainWindow.setMenu(null);

    mainWindow.loadURL('file://' + __dirname + '/index.html');

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        mainWindow = null;
        app.quit();
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
    electron.ipcMain.on('youtube-login', youtube_login);
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

function youtube_login(){
    var login_window = new BrowserWindow({width: 700, height: 700});
    login_window.setMenu(null);
    login_window.loadURL("https://accounts.google.com/ServiceLogin?service=youtube");
    login_window.on("closed", function(){if(mainWindow){mainWindow.webContents.send('youtube-login-done');}});
    login_window.webContents.openDevTools();
}
