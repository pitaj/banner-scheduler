"use strict";

var fs = require('fs');
var remote = require('remote');
var BrowserWindow = remote.require('browser-window');
var win = BrowserWindow.getFocusedWindow();
var contents = win.webContents;
var dialog = remote.require('dialog');
var utils = require("./utils");

var error = console.error.bind(console);

var Module = {};

Module.print = function(){
  contents.printToPDF({
    printBackground: true
  }, function(err, pdf){
    if(err){
      return error(err);
    }
    dialog.showSaveDialog(win, {
      title: "Save PDF",
      filters: [
        { name: 'PDF files', extensions: ['pdf'] },
        { name: 'All files', extensions: ['*'] }
      ],
    }, function(filename){
      fs.writeFile(filename, pdf, function(err){
        if(err){
          error(err);
        }
      });
    });
  });
};

Module.export = function(){

  var sessions = document.querySelectorAll("#schedule .session");

  if(!sessions.length){
    return;
  }

  var courses = Array.prototype.map.call(sessions, function(session){
    return $(session).data("course");
  }).filter(function(value, index, self) {
    return self.indexOf(value) === index;
  });

  var cal = utils.exportToICal(courses);

  dialog.showSaveDialog(win, {
    title: "Save iCal Export",
    filters: [
      { name: 'iCal files', extensions: ['ics'] },
      { name: 'All files', extensions: ['*'] }
    ],
  }, function(filename){

    if(!filename){
      return;
    }

    fs.writeFile(filename, cal.toString(), function(err){
      if(err){
        error(err);
      }
    });
  });
};

module.exports = Module;
