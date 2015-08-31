"use strict";

var utils = require("./server.js");

var error;

error = console.error.bind(console);

utils.getSelectOptions(function(err, obj){
  if(err){
    return error(err);
  }

  $("#terms select").html(obj.term_options).trigger("chosen:updated");
  $("#subjects select").html(obj.subject_options).trigger("chosen:updated");
});

function populateInstBox(term){
  utils.getInstructors({
    term: term,
  }, function(err, response){
    if(err){
      return error(err);
    }
    $("#instructors select").html(response).trigger("chosen:updated");
  });
}

function numbersToLetters(n){
  var key = [ "a", "b", "c", "d", "e", "f", "g", "h", "i", "j" ];
  var str = n.toString().split("").map(function(ch){
    return key[ch];
  }).join("");
  return str;
}

const sessionBase = function(course, crn, time, location){
  return `
  <div class="well well-sm session">
    <span class="course" title="${ crn }">${ course }</span>
    <span class="crn">${ crn }</span>
    <span class="time">${ time }</span>
    <span class="location">${ location }</span>
    <button class="remove btn btn-danger">
      <span class="glyphicon glyphicon-remove"></span>
    </button>
  </div>
  `;
};

const rowBase = function(data){
  return `
  <tr>
    <td>
      <small class="status">${ data.status }</small>
      <p class="department">${ data.department }</p>
    </td>
    <td>
      <p class="class">${ data.class }</p>
      <p class="type">${ data.type }</p>
    </td>
    <td>
      <p class="title">${ data.title }</p>
      <p class="time">${ data.time }</p>
      <p class="notes">${ data.notes }</p>
      <small class="fees">${ data.fees }</small>
    </td>
    <td>
      <p class="crn">${ data.crn }</p>
      <p class="location">${ data.location }</p>
    </td>
    <td>
      <p class="cap">
        ${ data.cap }
      </p>
    </td>
    <td>
      <p class="enrl">${ data.enrl }</p>
    </td>
    <td>
      <p class="avail">${ data.avail }</p>
    </td>
    <td>
      <p class="instructor">${ data.instructor }</p>
      <p class="credits">${ data.credits }</p>
    </td>
    <td>
      <p class="dates">${ data.dates }</p>
      <p class="weeks">${ data.weeks }</p>
    </td>
    <td>
      <button class="add btn btn-primary">
        <span class="glyphicon glyphicon-plus"></span>
      </button>
    </td>
  </tr>
  `;
};

const placing = Object.freeze({
  x: function(day){
    day = placing.days[day];
    var dayX = document
      .querySelector("#schedule table th:nth-child(" + (day + 1) + ")")
      .offsetLeft - placing.dayXStart;
    return placing.xStart + dayX + placing.xMargin;
  },
  dayXStart: 60,
  xMargin: 5,
  xStart: 0,
  days: Object.freeze({
    M: 1,
    T: 2,
    W: 3,
    R: 4,
    F: 5
  }),
  y: function(minutes){
    minutes = minutes - 8 * 60;
    return placing.yStart + (placing.yInt * minutes / 60);
  },
  yStart: 0,
  yInt: 80,

  place: function(day, start, end){
    // day is one of: MTWRF
    // start and end are 24-hour times

    var left, top, height;

    // convert to minutes
    start = (Math.floor(start / 100) * 60 + start % 100);
    end = (Math.floor(end / 100) * 60 + end % 100);

    top = Math.round(placing.y(start)) + "px";
    height = Math.round(placing.y(end)) - top + "px";

    left = Math.round(placing.x(day));

    return {
      left,
      top,
      height
    };
  }
});

function addtoSchedule(data){

  function format(time){
    if(time >= 1300){
      time = (time - 1200).toString();
      if(time.length < 4){
        time = "0" + time;
      }
      time = time.split("");
      time = time[0] + time[1] + ":" + time[2] + time[3] + "pm";
    } else if(time >= 1200){
      time = time.toString().split("");
      time = time[0] + time[1] + ":" + time[2] + time[3] + "pm";
    } else {
      time = time.toString();
      if(time.length < 4){
        time = "0" + time;
      }
      time = time.split("");
      time = time[0] + time[1] + ":" + time[2] + time[3] + "am";
    }
    return time;
  }

  var className = numbersToLetters(data.crn);
  if(document.querySelector(".sessions ." + className)){
    return false;
  }
  data.time.forEach(function(time, index){

    var days, times, start, end, places, prettyTime;

    days = time.replace(/[^A-Z]/g, "").split("");
    times = time.replace(/[^0-9\-]/g, "").split("-");

    start = parseInt(times[0], 10);
    end = parseInt(times[1], 10);

    places = days.map(function(day){
     return placing.place(day, start, end);
    });

    prettyTime = format(start) + " - " + format(end);

    places.forEach(function(place){
      var session = sessionBase(data.class, data.crn, prettyTime, data.location[index]);
      $(session)
        .css(place)
        .addClass(className)
        .data("course", data)
        .appendTo("#schedule .sessions");
    });

  });
}

function ask(message, callback){
  $("#popup .message").html(message);
  $("#popup button.yes").off("click").click(function(){
    callback(true);
    $("#popup").fadeOut(300);
  });
  $("#popup button.no").off("click").click(function(){
    callback(false);
    $("#popup").fadeOut(300);
  });
  $("#popup").fadeIn(300);
}

function removeFromSchedule(crn){
  $(".active").removeClass("active");
  $("#schedule .sessions ." + crn).addClass("active");

  ask("Remove this course from your schedule?", function(result){
    if(result){
      $("#courses table tbody ." + crn).find(".add").removeClass("hidden");
      $("#schedule .sessions ." + crn).remove();
    }
    $(".active").removeClass("active");
  });
}

function search(){

  var id = document.getElementById.bind(document);

  var options = {
    term: id("term_list").value,
    subj: id("selsubj").value,
    instructor: id("inst_list").value,
    course: id('coursenum').value,
    day: (function(){
      var h = [];
      $("#days input[type=checkbox]:checked").each(function(){
        h.push(this.value);
      });
      return h;
    })(),
    beginHH: id('begin_hh').value,
    beginMin: id('begin_mi').value,
    endHH: id('end_hh').value,
    endMin: id('end_mi').value,
    online: id('sel_online').value
  };

  utils.getCourses(options, function(err, data){
    if(err){
      return error(err);
    }

    data = JSON.parse(data);

    $("#courses table tbody").empty();
    $("#courses table tfoot").hide();

    data.forEach(function(course){
      var time = "", notes = "", location = "", row;

      var ops = JSON.parse(JSON.stringify(course));

      course.time.forEach(function(t){
        if(t.length > 1){
          if(time.length > 1){
            time += "<br>";
          }
          time += t;
        }
      });
      ops.time = time;

      course.notes.forEach(function(n){
        if(n.length > 1){
          if(notes.length > 1){
            notes += "<br>";
          }
          notes += n;
        }
      });
      ops.notes = notes;

      course.location.forEach(function(l){
        if(l.length > 1){
          if(location.length > 1){
            location += "<br>";
          }
          location += l;
        }
      });
      ops.location = location;

      row = rowBase(ops);

      row = $(row)
        .toggleClass("full", ops.avail < 1)
        .appendTo("#courses table tbody")
        .addClass(numbersToLetters(ops.crn))
        .data("course", course);

    });
  });
}

$("#courses table tbody").on("click", "td .add", function(){
  addtoSchedule($(this).closest("tr").data("course"));
  this.classList.add("hidden");
});

$("#schedule table .sessions").on("click", ".session .remove", function(){
  var course = $(this).closest(".session").data("course");
  removeFromSchedule(numbersToLetters(course.crn));
});

$("#terms select, #subjects select, #instructors select").chosen({
  width: "100%"
});

$("#search").click(search);

// $("#print").click(window.print.bind(window));

$("#terms select").change(function(){
  populateInstBox(this.value);
});

var fs = require('fs');
var remote = require('remote');
var BrowserWindow = remote.require('browser-window');
var contents = BrowserWindow.getFocusedWindow().webContents;

console.log(contents);

$("#print").click(function(){
  contents.print();
  contents.printToPDF({}, function(err, pdf){
    if(err){
      error(err);
    }
    fs.writeFileSync("output.pdf", pdf);
  });
});
