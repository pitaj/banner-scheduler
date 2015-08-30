"use strict";

var fs = require('fs'),
	http = require('http'),
	url = require('url'),
	qs = require('querystring'),
	cheerio = require('cheerio'),
	mime = require("mime"),
	request = require("request");

// var exampleHTML = fs.readFileSync('example.html');

function parseToJSON(html){

	console.log("HTML retrieved, parsing to JSON");

	var $ = cheerio.load(html);
	var rows = $(".pagebodydiv table[cellpadding=3] tr:nth-child(n+4)");
	var sections = [];
	var splits = [];
	var i, x, sect;

	// console.log(rows);

	splits.push(-1);

	for(i = 0; i < rows.length; i++){
		if(rows.eq(i).children().length === 1){
			//console.log(rows.eq(i).length, i, rows.eq(i).children().length);
			splits.push(i);
		}
	}
	// console.log(splits);
	for(i = 1; i < splits.length; i++){
		sect = [];

		for(x = splits[i - 1] + 1; x < splits[i]; x++){
			//console.log(x);
			sect.push(rows[x]);
		}
		sections.push(sect);
	}

	//console.log(splits);

	//console.log(sections);

	var data = [];

	function isTime(){
		return !!$(this).text().match(/[MTWRF]* [0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]/);
	}
	function isNote(){
		return +$(this).parent().attr("colspan") === 1 && +$(this).text().toLowerCase().indexOf("fees") === -1 && +$(this).attr("size") === -2;
	}
	function isFee(){
		return $(this).text().toLowerCase().indexOf("fees") > -1 && +$(this).attr("size") === -2;
	}
	/*
	function isCRN(){
		return !!$(this).text().match(/[0-9][0-9][0-9][0-9][0-9]/);
	}
	*/
	function isImport(){
		return +$(this).attr("size") === -1 && $(this).attr("color") === "red";
	}
	var section, thisData;
	for(x = 0; x < sections.length; x++){
		section = $(sections[x]);
		thisData = {
			"status": section.eq(0).children().eq(0).text().toLowerCase().trim() + "&nbsp",
			"department": section.eq(1).children().eq(0).text().trim() || "",
			"class": section.eq(0).children().eq(1).text().trim() || "",
			"type": section.eq(1).children().eq(1).text().trim() || "",
			"title": section.eq(0).children().eq(2).text().trim() || "",
			"time": [(section.find("font").filter(isTime).eq(0).text().trim() || ""),
					(section.find("font").filter(isTime).eq(1).text().trim() || "")],
			"notes": [(section.find("font").filter(isNote).eq(0).text().trim() || ""),
						(section.find("font").filter(isNote).eq(1).text().trim() || ""),
						(section.find("font").filter(isNote).eq(2).text().trim() || "")],
			"important": (section.find("font").filter(isImport).text().trim() || ""),
			"fees": section.find("font").filter(isFee).text().trim() || "",
			"crn": section.eq(0).children().eq(3).text().trim() || "",
			"location": [(section.eq(1).children().eq(3).text().trim() || ""),
						(section.eq(2).children().eq(3).text().trim() || "")],
			"cap": section.eq(0).children().eq(4).text().trim() || "",
			"enrl": section.eq(0).children().eq(5).text().trim() || "",
			"avail": section.eq(0).children().eq(6).text().trim() || "",
			"instructor": section.eq(0).children().eq(7).text().trim() || "",
			"credits": section.eq(1).children().eq(4).text().trim() || "",
			"dates": section.eq(0).children().eq(8).text().trim() || "",
			"weeks": section.eq(1).children().eq(5).text().toLowerCase().trim().replace(/[ \n]*/g, '').replace('-', ' - ') || "",
		};
		data.push(thisData);
		// console.log(section.find("font"));
	}
	// console.log(data);

	// console.log("JSON parsed successfully, parsed JSON: \n", data);

	console.log("JSON parsed successfully");

	return JSON.stringify(data);
}

function fixQuery(input){
	var query = [];
	console.log("Fixing query, input: ", input);

	query = [
		{ sel_subj: "dummy" },
		{ bl_online: "FALSE" },
		{ sel_day: "dummy" },
		{ term: input.term || "201630" },
		{ sel_subj: input.subj },
		{ sel_inst: input.instructor || "ANY" },
		{ sel_online: input.online || "" },
		{ sel_crse: input.course || "" },
	];
	if(input["day[]"] && input["day[]"].length){
		input["day[]"].forEach(function(day){
			query.push({ sel_day: day });
		});
	}
	query = query.concat([
		{ begin_hh: 0 },
		{ begin_mi: 0 },
		{ end_hh: 0 },
		{ end_mi: 0 },
	]);

	console.log("Query fixed, output: ", query);

	return query;
}

function getHTML(ops, callback){

	var query = ops.map(function(op){
		return qs.stringify(op);
	});

	request.post({
		url: 'https://atlas.montana.edu:9000/pls/bzagent/bzskcrse.PW_ListSchClassSimple',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		// form: options,
		body: query.join('&')
	}, function(error, res, body){

		if(error || res.statusCode !== 200){
			return callback(error || Error("Nope, server responded with statusCode: " + res.statusCode));
		}
		if(!body){
			return callback(Error("Response body was empty"));
		}

		var html = body;

		// fixing html

		html = html
			.replace(/size \= \-2\"/g, 'size = "-2"')
			.replace(/<\/TR>\s*<TD/g, '</TR><TR><TD');

		// fs.writeFile("./responses/" + Math.floor(Math.random()*100) + ".html", html, function(){});
		// fs.writeFile("./responses/latest.html", html, function(){});

		callback(null, html);

	});
}

http.createServer(function(req, res){
	var parsed = url.parse(req.url);
  var path = parsed.pathname;
  var query = qs.parse(parsed.search ? parsed.search.replace("?", "") : "");

	console.log("Requested path %s", req.url);

	console.log("Query: ", query);

	if(path === "/classes.json"){

		process.nextTick(function() {

			console.log("classes.json requested, query: \n", query);

			res.writeHead(200, { 'Content-Type': "application/json" });

			console.log("Attempting to get HTML and parse into JSON");

			query = fixQuery(query);

			getHTML(query, function(err, html){

				if(err || !html){
					console.error("Failed to fulfill request", err || Error("No HTML to parse"));
					return res.end('{"success": false}');
				}

				res.end(parseToJSON(html));

				console.log("Successfully fulfilled request");
			});

		});

		return;
	}

	if(path === "/"){
		path = "/index.html";
	}

	if(path === "/index.html"){
		request({
			url: "https://atlas.montana.edu:9000/pls/bzagent/bzskcrse.PW_SelSchClass"
		}, function(err, resp, body){

			if(err || resp.statusCode !== 200){
				res.writeHead(200, { 'Content-Type': "application/json" });
				console.error("Failed to fulfill request", err || Error("Nope, server responded with statusCode: " + res.statusCode));
				return res.end('{"success": false}');
			}
			if(!body){
				res.writeHead(200, { 'Content-Type': "application/json" });
				console.log(Error("Response body was empty"));
				return res.end('{"success": false}');
			}

			var $ = cheerio.load(body);

			var term_options = $("#term_list").html() + "";

			var subject_options = $("#selsubj").html() + "";

			var file = fs.readFileSync("frontend"+path) + "";
			file = file
				.replace("{term_options}", term_options)
				.replace("{subject_options}", subject_options);

			res.writeHead(200, { 'Content-Type': mime.lookup('frontend'+path) });
			res.end(file);
		});
	}
	else if(path === "/instructors"){

		request({
			url: "https://atlas.montana.edu:9000/pls/bzagent/bzskcrse.p_aj_instructors",
			qs: {
				p_term_code: query.term,
				inst: "ALL"
			}
		}, function(err, resp, body){

			if(err || resp.statusCode !== 200){
				res.writeHead(400);
				console.error("Failed to fulfill request", err || Error("Nope, server responded with statusCode: " + res.statusCode));
				return res.end();
			}
			if(!body){
				res.writeHead(404);
				console.log(Error("Response body was empty"));
				return res.end();
			}

			var $ = cheerio.load(body);

			var inst_options = $("#inst_list").html();

			res.writeHead(200, { 'Content-Type': "text/html" });
			res.end(inst_options);
		});
	}
	else {
		try {
			var file = fs.readFileSync("frontend"+path);
			res.writeHead(200, { 'Content-Type': mime.lookup('frontend'+path) });
			res.end(file);

		} catch(e){
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			// console.error("File ("+"../frontend"+path+") not found");
			res.end();
		}
	}
}).listen(8000);

console.log("Server now listening on port 8000");
