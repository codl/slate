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
        height: 900,
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

    var mpd_ready = false;

    var mpd_client;

    function mpd_init(){
        send_mpd_status('starting');
        
        mpd_client = mpd.connect({
            port: 6600,
            host: 'localhost',
        });

        mpd_client.on('ready', function(){
            send_mpd_status('ready');
            function send_song(quiet){
                mpd_client.sendCommand("currentsong", function(err, msg){
                    if (err) throw err;
                    var song = extract_mpd_info(msg);
                    web.send("mpd", song, quiet);
                });
            }
            mpd_client.on('system-player', send_song);
            electron.ipcMain.removeAllListeners('send-song');
            electron.ipcMain.on('send-song', function(_, quiet){ send_song(quiet); });
            send_song(true);
            mpd_client.ready = true;
        });
        mpd_client.on('end', mpd_teardown);
        mpd_client.on('error', function(e){
            send_mpd_status('error', e.errno);
        });
    }

    function mpd_teardown(){
        electron.ipcMain.removeAllListeners('send-song');
        setTimeout(mpd_init, 1000);
    }

    function send_mpd_status(status, message){
        web.send('mpd-status', status, message);
    }

    mpd_init();

    electron.ipcMain.on('youtube-login', youtube_login);
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
