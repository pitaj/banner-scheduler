"use strict";

var { app, BrowserWindow } = require('electron');

var config = require("./config.json");

// keep reference to main window to prevent GC
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin'){
    app.quit();
  }
});

app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 650,
    width: 1150,
    title: "Course Scheduler"
  });
  
  if(config.devTools){
    mainWindow.openDevTools();
  }

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + "/app.html");

  // Emitted when the window is closed.
  mainWindow.on('closed', function(){
    // Dereference the window object
    mainWindow = null;
  });
});
