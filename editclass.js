$(function(){
	
	var class_urn; 
	var class_doc;
	
	function n2(n){
	    return n > 9 ? "" + n: "0" + n;
	}
	
	function now(){
		var today = new Date();
		return today.getFullYear() + "-" + n2(today.getMonth()+1)  + "-" + n2(today.getDate()) + "_" + n2(today.getHours()) + ":" + n2(today.getMinutes());
	}
	
	function td(x){
		return($("<td>").text(x));
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
	
	function createaccounts(accountlist){
		var requests1 = [];
		var requests2 = [];
		$.each(accountlist, function(i, rec){
			requests1.push(oh.user.setup(rec.firstname, rec.lastname, "LAUSD", rec.id, function(data){
				rec.username = data.username;
				rec.password = data.password;
				requests2.push(oh.class.update(class_urn, data.username + ";" + "restricted", function(){
					console.log("Added user " + data.username);			
				}));
			}));
		});
		
		$.when.apply($, requests1).done(function() {
			$.when.apply($, requests2).done(function() {
				console.log("all done.")
				savedoc(accountlist);
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
		
		var doctitle = class_urn + "_" + now() + "_students.csv"
		oh.document.create(doctitle, d3.csv.format(classdb), class_urn, function(){
			console.log("Document created!");
			finddocs();
		});
	}	
	
	function getParameterByName(name) {
	    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	        results = regex.exec(location.search);
	    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}	
	
	//finds all docs for the current 
	function finddocs(){
		oh.document.search(class_urn, function(results){
			var requests = [];
			var data = [];
			$.each(results, function(id, obj){
				var docname = obj.name;
				var docdate = obj.last_modified;
				var docid = id;
				requests.push(oh.document.contents(id, function(x){
					data.push(x);
				}));				
			});
			$.when.apply($, requests).done(function() {
				loadtable(data);
			});				
		});
	}
	
	function loadtable(data){
		var students = {};		
		$.each(data, function(i, dataset){
			var records = d3.csv.parse(dataset);
			$.each(records, function(j, rec){
				//this way we filter duplicates
				students[rec["username"]] = rec;
			})
		});
		oh.class.read(class_urn, function(classdata){
			$.each(classdata[class_urn].users, function(username, role){
				students[username] = students[username] || {};
				students[username].role = role;
			});
			populate(students)
		});		
	}
	
	function populate(students){
		$("#studentable tbody").empty();
		$.each(students, function(username, rec){
			var mytr = $("<tr />").appendTo("#studentable tbody");
			td(rec["Student ID"]).appendTo(mytr);
			td(rec["Student Name"]).appendTo(mytr);
			td(username).appendTo(mytr);
			td(rec["password"]).appendTo(mytr);
			td(rec["role"] || "dropped").appendTo(mytr);
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
			var teachervec1 = x.split("-");
			var teachervec2 = teachervec1[teachervec1.length-1].split(".");
			teachername = teachervec2[teachervec2.length-1];

		});
		
		oh.user.info(function(res){
			var userdata = res.data[first(res.data)];
			if(Object.keys(userdata.classes).indexOf(class_urn) < 0){
				alert("Class: " + class_urn + " does not belong to current user.");
				window.location = "index.html";
			} else {
				finddocs();
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





