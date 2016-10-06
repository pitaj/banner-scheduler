var fs = require("fs"),
  del = require("del"),
  mkdirp = require("mkdirp"),
  cpy = require("cpy"),
  // ncp = require("ncp"),
  exec = require('child_process').exec,
  as = require("async");

console.log("Building app ...");

del.sync("dist/**");

mkdirp.sync("dist/locales/");
mkdirp.sync("dist/resources/app/");

/*
mkdirp.sync("dist/resources/app/node_modules/bootstrap/");
mkdirp.sync("dist/resources/app/node_modules/jquery/");
mkdirp.sync("dist/resources/app/node_modules/cheerio/");
mkdirp.sync("dist/resources/app/node_modules/request/");
*/

console.log("Copying files ...");

as.waterfall([
  cpy.bind(null, [
    "node_modules/electron-prebuilt/dist/*.*"
  ], "dist/"),
  cpy.bind(null, [
    "node_modules/electron-prebuilt/dist/locales/*.*"
  ], "dist/locales/"),
  cpy.bind(null, [
    "node_modules/electron-prebuilt/dist/resources/atom.asar"
  ], "dist/resources/"),
  cpy.bind(null, [
    "chosen/*",
    "css/*",
    "app.*",
    "main.js",
    "config-prod.json",
    "lib/*",
	"package.json"
  ], "dist/resources/app/", { parents: true }),
  /*
  ncp.bind(null, "node_modules/bootstrap/", "dist/resources/app/node_modules/bootstrap/"),
  ncp.bind(null, "node_modules/ical-generator/", "dist/resources/app/node_modules/ical-generator/"),
  ncp.bind(null, "node_modules/jquery/", "dist/resources/app/node_modules/jquery/"),
  ncp.bind(null, "node_modules/cheerio/", "dist/resources/app/node_modules/cheerio/"),
  ncp.bind(null, "node_modules/request/", "dist/resources/app/node_modules/request/"),
  */
  function(next){
    exec("npm install --production", {
      cwd: "dist/resources/app/"
    }, function(err){
      next(err);
	});
  },
  fs.rename.bind(null, "dist/electron.exe", "dist/scheduler.exe"),
  fs.rename.bind(null, "dist/resources/app/config-prod.json", "dist/resources/app/config.json")
], function(err){
  if(err){
    console.error(err);
    throw err;
  }
  console.log("Done!");
});
