'use strict';

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const mpd = require('mpd');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        frame: false,
        resizable: false
    });
    mainWindow.setMenu(null);

    mainWindow.loadURL('file://' + __dirname + '/index.html');

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
    function send_song(quiet){
        if(!mpd_ready){
            client.on("ready", send_song, quiet);
            return;
        }
        client.sendCommand("currentsong", function(err, msg){
            if (err) throw err;
            var song = extract_mpd_info(msg);

            var hash = song.file;
            if("Title" in song) hash += song.Title;
            // this ensures that the notification will show
            // if listening to a stream and the song info changes

            quiet = quiet || previous_song == hash;
            web.send("mpd", song, quiet);

            previous_song = hash;
        });
    }

    var mpd_ready = false;

    client.on('system-player', send_song);
    client.on('ready', function(){ mpd_ready = true; });

    electron.ipcMain.on('youtube-login', youtube_login);
    electron.ipcMain.on('ready', function(){ send_song(true); });
});

function extract_mpd_info(str){
    // mpd sends info in this format:
    //     Key: Value
    //     Key2: Value 2
    // this function takes info in this format and returns
    // it as an object

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
    login_window.on("closed", function(){
        if(mainWindow){
            mainWindow.webContents.send('youtube-login-done');
        }
    });
    login_window.webContents.openDevTools();
}
