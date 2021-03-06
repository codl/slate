'use strict';

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const mpd = require('mpd');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const glob = require('glob');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        resizable: false,
        show: false
    });
    mainWindow.setMenu(null);

    mainWindow.on('closed', function() {
        mainWindow = null;
        app.quit();
    });

    let web = mainWindow.webContents;
    //web.openDevTools();

    let mpd_status = 'stopped';

    let mpd_client;

    function mpd_init(){
        set_mpd_status('starting');

        mpd_client = mpd.connect({
            port: config["mpd-port"] || 6600,
            host: config["mpd-host"] ||'localhost',
        });

        mpd_client.on('ready', function(){
            set_mpd_status('ready');
            function send_song(quiet){
                mpd_client.sendCommands(["currentsong", "status"], function(err, msg){
                    if (err) throw err;
                    let song = extract_mpd_info(msg);
                    mpd_find_coverart(song, config, function(cover){
                        if(cover){
                            song.cover = cover;
                        }
                        web.send("mpd", song, quiet);
                    });
                });
            }
            mpd_client.on('system-player', send_song);
            electron.ipcMain.removeAllListeners('send-song');
            electron.ipcMain.on('send-song', function(_, quiet){ send_song(quiet); });
            send_song(true);
        });
        mpd_client.once('end', function(){
            mpd_teardown();
            setTimeout(mpd_init, 3000);
        });
        mpd_client.on('error', function(e){
            set_mpd_status('error', e.errno);
        });

        electron.ipcMain.once('mpd-reload', function(){
            mpd_teardown();
            setTimeout(mpd_init, 1);
        });
    }

    function mpd_teardown(){
        electron.ipcMain.removeAllListeners('send-song');
        electron.ipcMain.removeAllListeners('mpd-reload');
        mpd_client.removeAllListeners('system-player');
        mpd_client.removeAllListeners('end');
        mpd_client.removeAllListeners('error');
        mpd_client.socket.destroy();
        mpd_client = null;
    }

    function set_mpd_status(status, message){
        mpd_status = status;
        web.send('mpd-status', status, message);
    }

    electron.ipcMain.on('youtube-login', youtube_login);
    electron.ipcMain.on('request-mpd-status', function(){
        web.send('mpd-status', mpd_status);
    });

    let config_file = app.getPath('userData') + "/slate.json";
    let config = {};

    fs.readFile(config_file, "utf8", function(err, content){
        if(!err){
            config = JSON.parse(content);
        }

        mpd_init();
        mainWindow.loadURL('file://' + __dirname + '/index.html');
        mainWindow.show();
    });

    electron.ipcMain.on('request-config', function(){
        web.send('config', config);
    });

    electron.ipcMain.on('save-config', function save_config(_, _config){
        config = _config;
        let content = JSON.stringify(config);
        fs.mkdir(path.dirname(config_file), function(err){
            if(err && err.code != 'EEXIST'){
                web.send('error', err);
                console.error(err);
                return
            }
            fs.writeFile(config_file, content);
        });
    });
});

function extract_mpd_info(str){
    // mpd sends info in this format:
    //     Key: Value
    //     Key2: Value 2
    // this function takes info in this format and returns
    // it as an object

    let info = {}
    let lines = str.split("\n");
    for(let line of lines){
        let tmp = line.split(":");
        if(tmp.length < 2) continue;
        info[tmp[0]] = tmp.slice(1).join(":").trim();
    }
    return info;
}

function mpd_find_coverart(song, config, cb){
    let coverglobs = [
        "{*front,*cover,folder}.{jpg,jpeg,gif,png}",
        "*.{jpg,jpeg,gif,png}"
    ];

    function try_coverartarchive(){
        if("MUSICBRAINZ_ALBUMID" in song){
            cb("https://coverartarchive.org/release/" + song.MUSICBRAINZ_ALBUMID
                + "/front");
        } else cb();
    }

    if(config["mpd-dir"] &&
            song.file && song.file.indexOf("://") == -1){
        let dir = config["mpd-dir"] + path.sep +
            path.dirname(song.file);
        function try_glob(){
            let coverglob = coverglobs.shift();
            if(coverglob){
                glob(coverglob,{
                    nocase: true,
                    cwd: dir
                }, function(e, matches){
                    if(matches.length > 0){
                        return cb("file://" + dir + path.sep + matches[0]);
                    }
                    return try_glob();
                });
            }
            else {
                return try_coverartarchive();
            }
        }
        try_glob();
    }
    else {
        return try_coverartarchive();
    }
}

function youtube_login(){
    let login_window = new BrowserWindow({width: 700, height: 700});
    login_window.setMenu(null);
    login_window.loadURL("https://accounts.google.com/ServiceLogin?service=youtube");
    login_window.on("closed", function(){
        if(mainWindow){
            mainWindow.webContents.send('youtube-login-done');
        }
    });
    login_window.webContents.openDevTools();
}
