"use strict";

var qs = require('querystring'),
	cheerio = require('cheerio'),
	ical = require("ical-generator"),
	request = require("request");

var config = require("./config.json");

var Module = {};
var log, error;

log = console.log.bind(console);
error = console.error.bind(console);

if(!config.logServer){
	error = log = function(){}; // don't log from here
}

function parse(html){

	log("HTML retrieved, parsing to JSON");

	var $ = cheerio.load(html);
	var rows = $(".pagebodydiv table[cellpadding=3] tr:nth-child(n+4)");
	var sections = [];
	var splits = [];
	var i, x, sect;

	splits.push(-1);

	for(i = 0; i < rows.length; i++){
		if(rows.eq(i).children().length === 1){
			splits.push(i);
		}
	}
	for(i = 1; i < splits.length; i++){
		sect = [];

		for(x = splits[i - 1] + 1; x < splits[i]; x++){
			sect.push(rows[x]);
		}
		sections.push(sect);
	}

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
			"time": [],
			"notes": [],
			"important": (section.find("font").filter(isImport).text().trim() || ""),
			"fees": section.find("font").filter(isFee).text().trim() || "",
			"crn": section.eq(0).children().eq(3).text().trim() || "",
			"location": [],
			"cap": section.eq(0).children().eq(4).text().trim() || "",
			"enrl": section.eq(0).children().eq(5).text().trim() || "",
			"avail": section.eq(0).children().eq(6).text().trim() || "",
			"instructor": section.eq(0).children().eq(7).text().trim() || "",
			"credits": section.eq(1).children().eq(4).text().trim() || "",
			"dates": section.eq(0).children().eq(8).text().trim() || "",
			"weeks": section.eq(1).children().eq(5).text().toLowerCase().trim().replace(/[ \n]*/g, '').replace('-', ' - ') || "",
		};

		section.find("font").filter(isTime).each(function(){
			thisData.time.push($(this).text().trim());
		});

		thisData.time = thisData.time.filter(Boolean);

		section.find("font").filter(isNote).each(function(){
			thisData.notes.push($(this).text().trim());
		});

		thisData.notes = thisData.notes.filter(Boolean);

		section.filter(function(i){ return i >= 1; }).find("td:nth-child(4)").each(function(){
			thisData.location.push($(this).text().trim());
		});

		thisData.location = thisData.location.filter(Boolean);

		data.push(thisData);
	}

	log("JSON parsed successfully");

	return data;
}

function fixQuery(input){
	var query = [];
	log("Fixing query, input: ", input);

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
		{ begin_hh: input.beginHH },
		{ begin_mi: input.beginMin },
		{ end_hh: input.endHH },
		{ end_mi: input.endMin },
	]);

	log("Query fixed, output: ", query);

	return query;
}

function getHTML(ops, callback){

	var query = ops.map(function(op){
		return qs.stringify(op);
	});

	request.post({
		url: config.urls.classList,
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

Module.getCourses = function(query, callback){

	log("Attempting to get HTML and parse into JSON");

	var term = query.term || "201630";

	query = fixQuery(query);

	getHTML(query, function(err, html){

		if(err || !html){
			error("Failed to fulfill request", err || Error("No HTML to parse"));
			return callback('{"success": false}');
		}

		var courses = parse(html);

		courses = courses.map(function(course){
			course.term = term;
			return course;
		});

		callback(null, JSON.stringify(courses));

		log("Successfully fulfilled request");
	});
};

Module.getSelectOptions = function(callback){
	request({
		url: config.urls.selectOptions
	}, function(err, resp, body){

		if(err || resp.statusCode !== 200){
			error("Failed to fulfill request", err || Error("Nope, server responded with statusCode: " + resp.statusCode));
			return callback('{"success": false}');
		}
		if(!body){
			log(Error("Response body was empty"));
			return callback('{"success": false}');
		}

		var $ = cheerio.load(body);

		var term_options = $("#term_list").html().toString();

		var subject_options = $("#selsubj").html().toString();

		callback(null, {
			term_options,
			subject_options
		});
	});
};

Module.getInstructors = function(options, callback){
	request({
		url: config.urls.instructorList,
		qs: {
			p_term_code: options.term,
			inst: "ALL"
		}
	}, function(err, resp, body){

		if(err || resp.statusCode !== 200){
			err = err || Error("Nope, server responded with statusCode: " + resp.statusCode);
			error("Failed to fulfill request", err);
			return callback(err);
		}
		if(!body){
			log(Error("Response body was empty"));
			return callback(Error("Response body was empty"));
		}

		var $ = cheerio.load(body);

		var inst_options = $("#inst_list").html();

		callback(null, inst_options);
	});
};


var d2d = {
	M: "MO",
	T: "TU",
	W: "WE",
	R: "TH",
	F: "FR"
};

Module.exportToICal = function(courses){

	var cal = ical({
		domain: "montana.edu",
		prodId: {
			company: "Montana State University",
			product: "Course Scheduler"
		},
		name: "Course Schedule"
	});

	courses.forEach(function(course){

		var dates, startDate, endDate, year, description;

		dates = course.dates.split("-");
		startDate = dates[0].split("/");
		endDate = dates[1].split("/");
		year = course.term.slice(0, 4);

		description = `
${ course.class }  ${ course.type }
CRN: ${ course.crn }
Department: ${ course.department }
Instructor: ${ course.instructor }
`;

		course.time.forEach(function(time, index){
			var start, end, days, times, until;

			days = time.replace(/[^A-Z]/g, "").split("").map(function(d){
				return d2d[d];
			});
			times = time.replace(/[^0-9\-]/g, "").split("-");

			start = {
				h: times[0].slice(0, 2),
				m: times[0].slice(2)
			};
			end = {
				h: times[1].slice(0, 2),
				m: times[1].slice(2)
			};

			until = new Date(Date.UTC(year, endDate[0] - 1, +endDate[1] + 1, end.h, end.m));

			start = new Date(Date.UTC(year, startDate[0] - 1, startDate[1], start.h, start.m));
			end = new Date(Date.UTC(year, startDate[0] - 1, startDate[1], end.h, end.m));

			log("dates", start, end, until);

			cal.createEvent({
				start: start,
				end: end,
				repeating: {
					freq: "WEEKLY",
					until: until,
					byday: days
				},
				summary: course.title,
				description: description,
				floating: true,
				location: course.location[index] || course.location[0]
			});

		});

	});

	return cal;

};

module.exports = Module;
