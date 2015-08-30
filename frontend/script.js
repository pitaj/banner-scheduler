(function(){

"use strict";

var placing = {
  day: {
    M: 64,
    T: 219,
    W: 374,
    R: 529,
    F: 681
  },
  eightTime: 57,
  timeInt: 80
};


// function populateInstBox() {
//   var index = document.getElementById("term_list").selectedIndex;
//   var term = document.getElementById("term_list").options[index].value;
//   var inst = readCookie("inst");
//   if (term === "") {
//     return;
//   } else {
//     http2.open("POST", "/pls/bzagent/bzskcrse.p_aj_instructors?p_term_code="+term+"&inst="+inst);
//     http2.onreadystatechange = handleResponse;
//     http2.send(null);
//   }
// }
//
// function populateInstBox(term){
//   var url = "https://atlas.montana.edu:9000/pls/bzagent/bzskcrse.p_aj_instructors";
//   $.get(url, {
//     p_term_code: term,
//     inst: "ANY"
//   }, function(response){
//
//   });
// }

function populateInstBox(term){
  $.get("/instructors", {
    term: term
  }, function(response){
    $("#instructors select").html(response).trigger("chosen:updated");
  });
}

function place(day, start, end){
  // start and end look like: '1000' or '1300', no am or pm
  // day looks like: M, T, W, R, F
  var left, top, height, minutes;
  start = parseInt(start);
  end = parseInt(end);

  start = (Math.floor(start / 100) * 60 + start % 100);
  end = (Math.floor(end / 100) * 60 + end % 100);

  minutes = end - start;
  // console.log(minutes);
  height = Math.round(placing.timeInt * minutes / 60) + "px";
  left = placing.day[day] + 15 + "px";
  top = Math.round(placing.eightTime + ((start - 8 * 60) / 60) * placing.timeInt) + "px";
  return { "left": left, "top": top, "height": height };
}

var classBase = '<div class="class"><span class="course">THECOURSE</span><br/>'+
  '<span class="crn">THECRN</span><br/><span class="time">THETIME</span><br/>'+
  '<span class="location">THELOCATION</span><div class="remove"></div></div>';

function putOnSchedule($obj){
  var info = $obj.parent().data("info");
  var crnLetters = "tqm"+numberToLetters(info.crn);
  if($("."+crnLetters).length > 0){
    return false;
  }
  for(var a in info.time){
    var time = info.time[a];
    var days = time.replace(/[^A-Z]/g, "").split("");
    var times = time.replace(/[^0-9\-]/g, "").split("-");
    var p = [];
    for(var i = 0; i < days.length; i++){
      p.push(place(days[i], times[0], times[1]));
    }
    var prettyTime, start, end;
    start = times[0];
    end = times[1];
    if(start >= 1300){
      start = (start-1200+"");
      if(start.length < 4){
        start = "0"+start;
      }
      start = start.split("");
      start = start[0]+start[1]+":"+start[2]+start[3]+"pm";
    } else if(start >= 1200){
      start = (start+"").split("");
      start = start[0]+start[1]+":"+start[2]+start[3]+"pm";
    } else {
      start = (start+"").split("");
      start = start[0]+start[1]+":"+start[2]+start[3]+"am";
    }
    if(end >= 1300){
      end = (end-1200+"");
      if(end.length < 4){
        end = "0"+end;
      }
      end = end.split("");
      end = end[0]+end[1]+":"+end[2]+end[3]+"pm";
    } else if(end >= 1200){
      end = (end+"").split("");
      end = end[0]+end[1]+":"+end[2]+end[3]+"pm";
    } else {
      end = (end+"").split("");
      end = end[0]+end[1]+":"+end[2]+end[3]+"am";
    }
    prettyTime = start+"-"+end;
    var cl = classBase
      .replace("THECOURSE", info.class)
      .replace("THECRN", info.crn)
      .replace("THETIME", prettyTime)
      .replace("THELOCATION", info.location);
    for(i = 0; i < p.length; i++){
      var o = p[i];
      $(cl)
        .css({
          left: o.left,
          top: o.top,
          height: o.height
        })
        .addClass(crnLetters)
        .data("obj", $obj)
        .data("info", info)
        .appendTo("#schedule");
    }
    $obj.fadeOut("fast");
    updateSize();
  }
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

function removeFromSchedule($obj){
  var crn = $obj.parent().attr("class").split(/\s+/);
  for(var i = 0; i < crn.length; i++){
    if(crn[i].indexOf("tqm") > -1){
      crn = crn[i];
      break;
    }
  }
  $(".active").removeClass("active");
  $("."+crn).addClass("active");
  ask("Remove this course from your schedule?", function(result){
    if(result){
      $obj.parent().data("obj").fadeIn("fast");
      $("."+crn).remove();
    }
    $(".active").removeClass("active");
    updateSize();
  });

}

function numberToLetters(n){
  var key = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  n = (n+"").split("");
  var str = "";
  for(var i = 0; i < n.length; i++){
    str += key[n[i]];
  }
  return str;
}

// function lettersToNumber(str){
//   var key = {
//     a: 0,
//     b: 1,
//     c: 2,
//     d: 3,
//     e: 4,
//     f: 5,
//     g: 6,
//     h: 7,
//     i: 8,
//     j: 9
//   };
//   str = (str).split("");
//   var n = "";
//   for(var i = 0; i < str.length; i++){
//     n += ""+key[str[i]];
//   }
//   return n;
// }

function search(){

  function id(i){
    return document.getElementById(i);
  }

  var options = {
    term: id("term_list").value,
    subj: id("selsubj").value,
    instructor: id("inst_list").value,
    course: id('coursenum').value,
    day: (function(){
      var h = [];
      $("#days .fields").children(':checked').each(function(){
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

  // console.log(options);

  $.getJSON("classes.json", options).done(function(data){
    var rowBase = '<div class="row classRow"><div class="cell"> '+
      '<span class="status">THESTATUS</span><br/> '+
      '<span class="department">THEDEPARTMENT</span> </div> '+
      '<div class="cell"> <span class="class">THECLASS</span><br/> '+
      '<span class="type">THETYPE</span> </div> <div class="cell"> '+
      '<span class="title">THETITLE</span><br/> <span class="time">THETIME</span><br/>'+
      ' <span class="notes">THENOTES</span><br/> '+
      '<span class="important">THEIMPORTANT</span><br/> '+
      '<span class="fees">THEFEES</span> '+
      '</div> <div class="cell"> <span class="crn">THECRN</span><br/> '+
      '<span class="location">THELOCATION</span> </div> '+
      '<div class="cell"> <span class="cap">THECAP</span> </div> '+
      '<div class="cell"> <span class="enrl">THEENRL</span> </div> '+
      '<div class="cell"> <span class="avail">THEAVAIL</span> </div> '+
      '<div class="cell"> <span class="instructor">THEINSTRUCTOR</span><br/> '+
      '<span class="credits">THECREDITS</span> </div> '+
      '<div class="cell"> <span class="dates">THEDATES</span><br/> '+
      '<span class="weeks">THEWEEKS</span> </div> '+
      '<div class="cell add"> Add to schedule </div> </div>';
    //console.log(data);
    for(var x in data){
      x = data[x];
      if(!Array.isArray(x.location)){
        x.location = [x.location];
      }
      if(!Array.isArray(x.time)){
        x.time = [x.time];
      }
      if(!Array.isArray(x.notes)){
        x.notes = [x.notes];
      }
      var origx = JSON.parse(JSON.stringify(x));
      var str = rowBase;
      var z = [
        "status",
        "class",
        "department",
        "title",
        "type",
        "time",
        "notes",
        "important",
        "fees",
        "crn",
        "location",
        "cap",
        "enrl",
        "avail",
        "instructor",
        "credits",
        "dates",
        "weeks"
      ];
      var time = "", b;
      for(b in x.time){
        if(x.time[b].length > 1){
          if(time.length > 1){
            time += "<br/>";
          }
          time += x.time[b];
        }
      }
      x.time = time;
      var notes="";
      for(b in x.notes){
        if(x.notes[b].length > 1){
          if(notes.length > 1){
            notes += "<br/>";
          }
          notes += x.notes[b];
        }
      }
      x.notes = notes;
      var location="";
      for(b in x.location){
        if(x.location.hasOwnProperty(b)){
          if(x.location[b].length > 1){
            if(location.length > 1){
              location += "<br/>";
            }
            location += x.location[b];
          }
        }
      }
      x.location = location;
      for(var i=0; i<z.length; i++){
        str = str.replace(("THE"+z[i].toUpperCase()), x[z[i]]);
      }
      str = $(str);
      //console.log(x.avail);
      if(x.avail < 1){
        str.find(".avail, .enrl, .cap").addClass("no");
      }
      str.appendTo("#courses");
      str.data("info", origx);
    }
  });
}

$("#courses").on("click", ".add", function(){
  putOnSchedule($(this));
});
$("#schedule").on("click", ".remove", function(){
  removeFromSchedule($(this));
});

function updateSize(){
  var lateTime = 0;
  $(".class .time").parent().each(function(){
    var endTime = $(this).data("info").time;
    for(var x in endTime){
      var time = endTime[x].replace(/[^0-9\-]/g, "").split("-")[1];
      if(time > lateTime){
        lateTime = time;
      }
    }
  });
  var height = Math.round((lateTime / 100 - 8) * 80) + 160;
  if(lateTime === 0){
    height = 400;
  }
  $("#schedule").css("height", height+"px");
}

updateSize();

$("#terms select, #subjects select, #instructors select, #course select, #days select").chosen();
$("#online select").chosen({ width: "150px" });
$("#begintime select, #endtime select").chosen({ width: "60px" });
$('#search').click(search);
$('#print').click(function(){ window.print(); });
$("#clear").click(function(){
  $("#courses .row.classRow").not("#backdrop").remove();
});

$("#terms select").change(function(){
  populateInstBox(this.value);
});

})();
