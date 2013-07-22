$(function(){
	
	var class_urn; 
	var class_members;
	var teacherlogin;
	
	function n2(n){
	    return n > 9 ? "" + n: "0" + n;
	}
	
	function now(){
		var today = new Date();
		return today.getFullYear() + "-" + n2(today.getMonth()+1)  + "-" + n2(today.getDate()) + "_" + n2(today.getHours()) + ":" + n2(today.getMinutes());
	}
	
	function td(x){
		return($("<td>").text(x).attr("data-value", x || 0));
	}	
	
	function first(obj) {
	    for (var a in obj) return a;
	}		
	
	function readcsvfile(target, handler){
		if(!target.files[0]){
			alert("No Roster file selected");
			return false;
		}
		var filereader = new FileReader();
		filereader.onload = function(e){
			handler(d3.csv.parse(e.target.result));
		}
		filereader.readAsText(target.files[0]);
	}	
	
	function createaccounts(classrecords){
		var currentstudents = $.map(class_members, function(rec){return rec["personal_id"]});
		var requests1 = [];
		var requests2 = [];
		$.each(classrecords, function(i, rec){
			//add new students
			var index = currentstudents.indexOf(rec.id);
			if(index < 0){
				requests1.push(oh.user.setup(rec.firstname, rec.lastname, "LAUSD", rec.id, function(data){
					rec.username = data.username;
					rec.password = data.password;
					requests2.push(oh.class.adduser(class_urn, data.username + ";" + "restricted", function(){
						console.log("Added user " + data.username);			
					}));
				}));
			} else {
				currentstudents.splice(index, 1);
			}
		});
		
		if(currentstudents.length > 0){
			alert("The following users are in the class but not present in the latest roster:\n\n" + currentstudents.toString());
		}
		
		$.when.apply($, requests1).done(function() {
			$.when.apply($, requests2).done(function() {
				//populate the html table
				updatemembers(function(){
					loadtable(currentstudents);
				});
				
				//save the doc
				savedoc(classrecords);	
				console.log("all done.")
			});		
		});		
		
	}	
	
	function savedoc(classrecords){
		var classdb = $.map( classrecords, function(val, i) {
			return {
				"Student ID" : val["Student ID"],
				"Student Name" : val["Student Name"],
				"username" : val["username"],
				"password" : val["password"],
				
			}
		});	
		
		classdb.sort(function (a, b) {
			if (a["Student ID"] > b["Student ID"])
				return 1;
		    if (a["Student ID"] < b["Student ID"])
		    	return -1;
		    return 0;
		  });
		
		//save the doc		
		var doctitle = class_urn + "_" + now() + "_students.csv"
		oh.document.create(doctitle, d3.csv.format(classdb), class_urn);
	}	
	
	function getParameterByName(name) {
	    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	        results = regex.exec(location.search);
	    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}	
	
	function addrow(userdata, isdropped){
		var mytr = $("<tr />").appendTo("#studentable tbody");
		if(isdropped){
			mytr.addClass("error")
		}
		td(userdata["personal_id"]).appendTo(mytr);
		td(userdata["first_name"]).appendTo(mytr);
		td(userdata["last_name"]).appendTo(mytr);
		td(userdata["username"]).appendTo(mytr);
		td(userdata["role"]).appendTo(mytr);
		
		//password field
		var pwfield = td("");
		pwfield.appendTo(mytr);
		if(userdata["first_name"] && userdata["last_name"] && userdata["personal_id"]){
			oh.user.setup(userdata["first_name"], userdata["last_name"], "LAUSD", userdata["personal_id"], function(data){
				pwfield.text(data.password).attr("data-value", data.password);
			});
		} else {
			pwfield.text("");
		}
		if(teacherlogin != userdata["username"]){
			var delbutn = $('<button class="btn btn-danger btn-small"> Remove </button>').on("click", function(){
				oh.class.removeuser(class_urn, userdata["username"], function(){
					mytr.fadeOut();
				})
			})
			$("<td>").append(delbutn).appendTo(mytr);
			
			var resetbtn = $('<button class="btn btn-warning btn-small"> Reset </button>').on("click", function(){
				alert("Placeholder for resetting " + userdata["username"])
			})
			$("<td>").append(resetbtn).appendTo(mytr);		
		} else {
			td("").appendTo(mytr);
			td("").appendTo(mytr);
		}
		
		//for later reference
		userdata.tablerow = mytr;
	}
	
	function updatemembers(cb){
		oh.class.read(class_urn, function(classlist){
			oh.user.read(Object.keys(classlist[class_urn].users).toString(), function(userlist){
				$.each(userlist, function(id, rec){
					rec.role = classlist[class_urn].users[id];
					rec.username = id;
				});
				class_members = userlist;
				cb && cb();				
			});			
		});		
	}
	
	function loadtable(droppedstudents){
		$("#studentable tbody").empty();
		$.each(class_members, function(username, userdata){
			var isdropped = droppedstudents && (droppedstudents.indexOf(userdata["personal_id"]) > -1);
			addrow(userdata, isdropped)
		});
	}		
	
	//init page
	class_urn= getParameterByName("class");
	if(!class_urn){
		window.location = "index.html"
	} else {
		$("#urntitle").text(class_urn);
	}
	
	oh.ping(function(){
		oh.user.whoami(function(x){
			teacherlogin = x;
			var teachervec1 = x.split("-");
			var teachervec2 = teachervec1[teachervec1.length-1].split(".");
			var teachername = teachervec2[teachervec2.length-1];

		});
		
		oh.user.info(function(res){
			var userdata = res.data[first(res.data)];
			if(Object.keys(userdata.classes).indexOf(class_urn) < 0){
				alert("Class: " + class_urn + " does not belong to current user.");
				window.location = "index.html";
			} else {
				updatemembers(loadtable);
			}
		});
			
		oh.keepalive();
	});
	
	
	$("#inputRoster").on("change", function loadfile(e){
		e.preventDefault();
		readcsvfile($("#inputRoster")[0], function(records){
			classrecords = [];
			$.each(records, function(i, rec){
				try {
					rec.id = rec["Student ID"];				
					rec.firstname = rec["Student Name"].split(",")[1].trim();
					rec.lastname = rec["Student Name"].split(",")[0].trim();
					rec.tr = $("<tr>").append(td(rec.id)).append(td(rec.firstname)).append(td(rec.lastname));
					classrecords.push(rec);
				} catch(err) {
					alert("CSV parsing error. Failed to read student record:\n\n" + JSON.stringify(rec));
				}
			});
			if(classrecords.length > 0){
				createaccounts(classrecords)
			}
		});
	});	
	
});





