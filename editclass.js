$(function(){
	
	var class_urn; 
	var class_members;
	
	var teachername;
	var teacherorg
	
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
				requests1.push(oh.user.setup(rec.firstname, rec.lastname, teacherorg, rec.id, function(data){
					rec.username = data.username;
					rec.password = data.password;
					requests2.push(oh.class.adduser(class_urn, data.username + ";" + "restricted", function(){
						//console.log("Added user " + data.username);			
					}));
				}));
			} else {
				currentstudents.splice(index, 1);
			}
		});
		
		$.when.apply($, requests1).always(function() {
			$.when.apply($, requests2).always(function() {
				//at this point, 'currentstudents' contains class members that were not in the latest roster
				
				
				//repopulate the html table
				updatemembers(function(){
					loadtable(currentstudents);
				});
				
				//report added students
				$("#usercount").text(requests2.length)
				$("#donealert").show();		
				
				//reset the upload field
				$("#inputRoster").val("");
				
				//save the doc
				savedoc(classrecords);	
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

		td(userdata["personal_id"]).appendTo(mytr);
		td(userdata["first_name"]).appendTo(mytr);
		td(userdata["last_name"]).appendTo(mytr);
		td(userdata["username"]).appendTo(mytr);
		td(userdata["role"]).appendTo(mytr);
		
		//password field
		var pwfield = td("");
		pwfield.appendTo(mytr);
		
		//these are student accounts
		if(userdata["first_name"] && userdata["last_name"] && userdata["personal_id"]){
			oh.user.setup(userdata["first_name"], userdata["last_name"], userdata["organization"], userdata["personal_id"], function(data){
				//set if this user is a student
				if(data.password && isdropped){
					mytr.addClass("error")
				}
				//check for username collisions
				if(data.username != userdata.username){
					alert("Username collision detected: " + data.username + ", " + userdata.username);
				} else if(userdata.permissions.new_account){
					//only display the initial password if new_account is true
					pwfield.text(data.password).attr("data-value", data.password);
				} else {
					pwfield.text("");	
				}
				
				//only display the reset buttons if the user has an initial password.
				//this is a hacky way of determining if the student was created with /user/setup
				if(data.password){
					var delbtn = $('<button class="btn btn-danger btn-small"> Remove </button>').on("click", function(){
						delbtn.attr("disabled", "disabled")
						oh.class.removeuser(class_urn, userdata["username"], function(){
							mytr.fadeOut();
						})
					})
					$("<td>").append(delbtn).appendTo(mytr);
					
					var resetbtn = $('<button class="btn btn-warning btn-small"> Change Passwd </button>').on("click", function(){
						$("#usernamepass").text(userdata["username"]);
						$(".modal a.btn").off("click");
						$(".modal a.btn").on("click", function(e){
							e.preventDefault();
							oh.user.password(userdata["username"], data.password, $("#newpassword").val(), function(){
								$(".modal").modal('hide');
							});						
						});
						$("#newpassword").val("");					
						$(".modal").modal();
					})
					$("<td>").append(resetbtn).appendTo(mytr);	
				} else {
					td("").appendTo(mytr);
					td("").appendTo(mytr);							
				}
			});				
		} else {
			//these are accounts with no student id. Note sure what to do with them.
			pwfield.text("");
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
		var total = 0;
		$.each(class_members, function(username, userdata){
			var isdropped = droppedstudents && (droppedstudents.indexOf(userdata["personal_id"]) > -1);
			addrow(userdata, isdropped)
			total++;
		});
		$("#urntitle").text(class_urn + "   (" + total + " members)");
		if($("#studentable tbody tr.error").length){
			$("#deletealart").show();
		}
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
			oh.user.read(x, function(data){
				teachername = data[x].last_name.toLowerCase();				
				teacherorg = data[x].organization.toLowerCase();
				if(!teachername){
					alert("ERROR: this account has no last name set.")
				}
				if(!teacherorg){
					alert("ERROR: this account has no organization set.")
				}				
			});				
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
		if(!$("#inputRoster").val()){
			return;
		}
		updatemembers(function(){
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
		})
	});	
	
	$('.alert .close').on('click', function () {
	  $(this).parent().hide();
	})	
	
});





