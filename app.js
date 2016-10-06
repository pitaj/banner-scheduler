"use strict";

var utils = require("./lib/utils.js");

var error = console.error.bind(console);

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
      <button class="add btn btn-primary">
        <span class="glyphicon glyphicon-plus"></span>
      </button>
    </td>
    <td>
      <small class="status">${ data.status }</small>
      <p class="department">${ data.department }</p>
    </td>
    <td>
      <p class="class"><a target="i_browse" href="${ data.links.class }">${ data.class }</a></p>
      <p class="type">${ data.type }</p>
    </td>
    <td>
      <p class="title"><a target="i_browse" href="${ data.links.title }">${ data.title }</a></p>
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
  </tr>
  `;
};

const placing = Object.freeze({
  y: function(minutes){
    minutes = minutes - 8 * 60;
    return (placing.yInt * minutes / 60);
  },
  yInt: 80,

  place: function(start, end){
    // day is one of: MTWRF
    // start and end are 24-hour times

    var top, height;

    // convert to minutes
    start = (Math.floor(start / 100) * 60 + start % 100);
    end = (Math.floor(end / 100) * 60 + end % 100);

    top = Math.round(placing.y(start));
    height = Math.round(placing.y(end)) - top;

    return {
      top,
      height
    };
  }
});

function checkConflicts(){

  function crossover(one, two){
    one = one.getBoundingClientRect();
    two = two.getBoundingClientRect();

    var ret =
      (one.top >= two.top && one.top <= two.bottom ||
      one.bottom >= two.top && one.bottom <= two.bottom) &&
      one.left === two.left;

    return ret;
  }

  var conflicts = [];
  var sessions = $("#schedule table .sessions .session");
  
  sessions.removeClass("conflicted");

  var l = sessions.length;
  var i, j;

  for(i = 0; i < l; i += 1){
    for(j = i + 1; j < l; j += 1){
      if(crossover(sessions[i], sessions[j])){
        conflicts.push([i, j]);
      }
    }
  }

  conflicts.forEach(function(obj){
    $(sessions[obj[1]]).addClass("conflicted");
  });

}

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

    var days, times, start, end, place, prettyTime;

    days = time.replace(/[^A-Z]/g, "").split("");
    times = time.replace(/[^0-9\-]/g, "").split("-");

    start = parseInt(times[0], 10);
    end = parseInt(times[1], 10);

    place = placing.place(start, end);

    prettyTime = format(start) + " - " + format(end);

    days.forEach(function(day){
      var session = sessionBase(data.class, data.crn, prettyTime, data.location[index] || data.location[0]);

      session = $(session)
        .css({
          top: place.top,
          height: place.height
        })
        .addClass(day.toLowerCase())
        .addClass(className)
        .data("course", data)
        .appendTo("#schedule .sessions");
    });

  });

  checkConflicts();
}

function ask(message, callback){
  $("#popup .message").html(message);
  $("#popup button.yes").off("click").on("click", function(){
    callback(true);
    $("#popup").fadeOut(300);
  });
  $("#popup button.no").off("click").on("click", function(){
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
	  checkConflicts();
    }
    $(".active").removeClass("active");
  });
}

utils.getSelectOptions(function(err, obj){
  if(err){
    return error(err);
  }

  $("#terms select").html(obj.term_options).trigger("chosen:updated");
  $("#subjects select").html(obj.subject_options).trigger("chosen:updated");
});

$("#courses table tbody").delegate("td .add", "click", function(){
  addtoSchedule($(this).closest("tr").data("course"));
  this.classList.add("hidden");
}).delegate("a[target=i_browse]", "click", function(){
  $("#browse").modal("show").find("iframe").removeClass("loaded");
});

$("#browse iframe").on("load", function(){
  $(this).addClass("loaded");
});

$("#schedule table .sessions").delegate(".session .remove", "click", function(){
  var course = $(this).closest(".session").data("course");
  removeFromSchedule(numbersToLetters(course.crn));
});

$("#terms select, #subjects select, #instructors select").chosen({
  width: "100%"
});

$("#search").on("click", search);

$("#terms select").on("change", function(){
  var term = this.value;
  utils.getInstructors({
    term: term,
  }, function(err, response){
    if(err){
      return error(err);
    }
    $("#instructors select").html(response).trigger("chosen:updated");
  });
});

$("#searchForm form").on("keypress", function(e){
  if(e.keyCode === 13){
    e.preventDefault();
    search();
  }
});

$(".panel .toggle-panel").click(function(){
  $(this).toggleClass("rotate-one-eighty").closest(".panel").find(".table-container").toggleClass("collapsed");
});

var cont = $("#schedule .table-container .stick");
var tabl = $("#schedule table");

$(window).resize(function(){
  window.requestAnimationFrame(function(){
    cont.width(tabl.width());
  });
});
window.requestAnimationFrame(function(){
  cont.width(tabl.width());
});

function stickify(sticky){
  var stick = sticky.stick;
  var cont = sticky.cont;
  cont.addEventListener("scroll", function(){
    window.requestAnimationFrame(function(){
      stick.style.top = cont.scrollTop + "px";
    });
  }, false);
}
stickify({
  stick: document.querySelector("#schedule .stick"),
  cont: document.querySelector("#schedule .table-container")
});

var actions = require("./lib/actions");

$("#print").on("click", actions.print);
$("#export").on("click", actions.export);
