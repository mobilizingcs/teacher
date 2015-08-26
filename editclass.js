$(function(){

	var class_urn;
	var class_name;
	var class_members;

	var teacherid;
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
			//replace is because LAUSD csv files has incorrect line endings
			handler(d3.csv.parse(e.target.result.replace(/[\n\r]+/g, '\n')));
		}
		filereader.readAsText(target.files[0]);
	}

	function createaccounts(classrecords){
		var currentstudents = $.map(class_members, function(rec){return rec["personal_id"]});
		var newstudents = [];
		var requests1 = [];

		$(".progress .bar").css("width", "0%")
		$(".progress").addClass("progress-success").show()
		var n = 0;

		$.each(classrecords, function(i, rec){
			//add new students
			var index = currentstudents.indexOf(rec.id);
			if(index < 0){
				requests1.push(oh.user.setup(rec.firstname, rec.lastname, teacherorg, rec.id, class_urn, function(data){
					newstudents.push(rec.id);
					n++
					rec.username = data.username;
					rec.password = data.password;
				}).always(function(){
					$(".progress .bar").css("width", (n/classrecords.length) * 100 + "%")
				}));
			} else {
				currentstudents.splice(index, 1);
			}
		});

		$.when.apply($, requests1).always(function() {
			//$.when.apply($, requests2).always(function() {
				//at this point, 'currentstudents' contains class members that were not in the latest roster
				//repopulate the html table
				updatemembers(function(){
					loadtable(currentstudents, newstudents);
				});

				//report added students
				$("#usercount").text(n);
				$("#donealert").show();

				//reset the upload field
				$("#inputRoster").val("");

				//save the doc
				//savedoc(classrecords);
			});
		//});

	}

	function savedoc(classrecords){
		var classdb = $.map( classrecords, function(val, i) {
			return {
				"Student ID" : val["Student ID"],
				"Student Name" : val["Student Name"],
				"username" : val["username"],
				"password" : val["password"]
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

	function addrow(userdata, isdropped, isadded){
		//update Aug 20: only show students
		if(!userdata.password && userdata["username"] != teacherid){
			console.log("Skipping non-student user: " + userdata["username"])
			return;
		}

		//for printing slip:
		$("#studentable tbody").append('<tr class="printtitlerow"><th>Student ID</th><th>First</th><th>Last</th><th>Username</th><th class="noprint">role</th><th>Password</th><th class="noprint"></th><th class="noprint"></th></tr>');

		var mytr = $("<tr />").appendTo("#studentable tbody");
		td(userdata["personal_id"]).appendTo(mytr);
		td(userdata["first_name"]).appendTo(mytr);
		td(userdata["last_name"]).appendTo(mytr);
		td(userdata["username"]).appendTo(mytr);
		td(userdata["role"]).addClass("noprint").appendTo(mytr);

		//password field
		var pwfield = td("");
		pwfield.appendTo(mytr);

		//these are student accounts
		if(userdata.password){

			//set if this user is a student
			if(isdropped){
				mytr.addClass("error")
			}

			if(isadded){
				mytr.addClass("success")
			}

			//check for username collisions
			if(userdata.permissions.new_account){
				//only display the initial password if new_account is true
				pwfield.text(userdata.password).attr("data-value", userdata.password);
			} else {
				pwfield.text("<changed>");
			}

			//add the deletebutton
			var delbtn = $('<button class="btn btn-danger btn-small"> Remove </button>').on("click", function(){
				delbtn.attr("disabled", "disabled")
				oh.class.removeuser(class_urn, userdata["username"], function(){
					mytr.fadeOut();
				})
			})
			$("<td>").addClass("noprint").append(delbtn).appendTo(mytr);

			//add the reset password button
			var resetbtn = $('<button class="btn btn-warning btn-small"> Change Passwd </button>').on("click", function(){
				$("#usernamepass").text(userdata["username"]);
				$(".modal a.btn").off("click");
				$(".modal a.btn").on("click", function(e){
					e.preventDefault();
					if($("#newpassword").val().length < 8){
						alert("Student password must be at least 8 characters.");
						return;
					}
					$(".modal a.btn").attr("disabled", "disabled")
					oh.user.password(teacherid, $("#teacherpassword").val(), userdata["username"], $("#newpassword").val(), function(){
						pwfield.text("<changed>");
						$(".modal").modal('hide');
					}).always(function(){
						$(".modal a.btn").removeAttr("disabled")
					});
				});
				$("#newpassword").val("");
				$(".modal").modal();
			})
			$("<td>").addClass("noprint").append(resetbtn).appendTo(mytr);

		} else {
			//these are accounts with no student id. Note sure what to do with them.
			pwfield.text("");
			td("").addClass("noprint").appendTo(mytr);
			td("").addClass("noprint").appendTo(mytr);
		}

		//for later reference
		userdata.tablerow = mytr;
	}

	//this function updates the global variable class_members which contains the current class members and their password
	function updatemembers(cb, nosetup){
		if(!nosetup){
			$(".progress .bar").css("width", "0%")
			$(".progress").removeClass("progress-success").show();
		}
		oh.class.read(class_urn, function(classlist){
			oh.user.read(Object.keys(classlist[class_urn].users).toString(), function(userlist){
				var requests = [];
				var n = 0;
				$.each(userlist, function(id, rec){

					//store role and username in record
					rec.role = classlist[class_urn].users[id];
					rec.username = id;

					//shortcut
					if(nosetup){
						return;
					}

					//call user setup for each user to get the initial password
					if(rec["first_name"] && rec["last_name"] && rec["personal_id"] && rec["organization"]){
						requests.push(oh.user.setup(rec["first_name"], rec["last_name"], rec["organization"], rec["personal_id"], "", function(data){
							if(data.username != rec.username){
								alert("Username collision detected: " + data.username + ", " + rec.username);
							} else {
								rec.password = data.password;
							}
						}).always(function(){
							$(".progress .bar").css("width", (n++/Object.keys(userlist).length) * 100 + "%")
						}));
					}
				});

				$.when.apply($, requests).always(function() {
					$(".progress").hide();
					class_members = userlist;
					cb && cb();
				});
			}).fail(function(){
				$(".progress").hide();
			});
		}).fail(function(){
			$(".progress").hide();
		});
	}

	function loadtable(droppedstudents, addedstudents){
		$("#studentable tbody").empty();
		var count = Object.keys(class_members).filter(function(studentusername){
			return studentusername.substring(0, 6) == "lausd-";
		}).length;
		$("#urntitle").text(class_name + "   (" + count + " students)");
		$.each(class_members, function(username, userdata){
			var isdropped = droppedstudents && (droppedstudents.indexOf(userdata["personal_id"]) > -1);
			var isadded = addedstudents && (addedstudents.indexOf(userdata["personal_id"]) > -1);
			addrow(userdata, isdropped, isadded);
		});
		if($("#studentable tbody tr.error").length){
			$("#deletealart").show();
		}
	}

	//init page
	class_urn = getParameterByName("class");
	if(!class_urn){
		window.location = "index.html"
	} else {
		$("#urntitle").text(class_urn);
	}

	oh.ping(function(){
		oh.user.whoami(function(x){
			teacherid = x;
			oh.user.read(x, function(data){
				var thisname = data[x].last_name;
				var thisorg = data[x].organization;

				if(!thisname){
					alert("ERROR: this account has no last name set. Please contact mobilize support.")
				}
				if(!thisorg){
					alert("ERROR: this account has no organization set. Please contact mobilize support.")
				}

				teachername = utf2ascii(thisname || "empty" );
				teacherorg = utf2ascii(thisorg || "empty" );
			});
		});

		oh.user.info(function(res){
			var userdata = res.data[first(res.data)];
			if(Object.keys(userdata.classes).indexOf(class_urn) < 0){
				alert("Class: " + class_urn + " does not belong to current user.");
				window.location = "index.html";
			} else {
				class_name = userdata.classes[class_urn]
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
						if(rec["StudentCode"]){
							rec.id = rec["StudentCode"]
							rec.firstname = rec["StudentName1"].split(",")[1].trim();
							rec.lastname = rec["StudentName1"].split(",")[0].trim();
						} else if(rec["Student ID"]){
							rec.id = rec["Student ID"];
							rec.firstname = rec["Student Name"].split(",")[1].trim();
							rec.lastname = rec["Student Name"].split(",")[0].trim();
						} else if(rec["students_id"]){
							rec.id = rec["students_id"];
							rec.firstname = rec["students_firstname"].trim();
							rec.lastname = rec["students_lastname"].trim();
						} else {
							//new format has white lines, so these are expected
							alert("Failed to read line " + i + "\n" + JSON.stringify(rec));
							return;
						}

						//add student
						rec.tr = $("<tr>").append(td(rec.id)).append(td(rec.firstname)).append(td(rec.lastname));
						classrecords.push(rec);
					} catch(err) {
						alert("CSV parsing error. Failed to read line " + i + "\n\n" + JSON.stringify(rec));
					}
				});
				if(classrecords.length > 0){
					createaccounts(classrecords);
				} else {
					alert("No valid records found in this CSV file. Either formatting is incorrect or CSV file is empty.");
				}
			});
		}, true)
	});

	$('.alert .close').on('click', function () {
	  $(this).parent().hide();
	})

	$("#printbutton").on("click", function(){
		$("#wrap").toggleClass("printstyle");
		if($("#wrap").hasClass("printstyle")){
			window.print();
		}
	});

	$("#signoutbutton").on("click", function(e){
		e.preventDefault();
		oh.logout(function(){
			location.reload(true);
		});
	});

	$("#genbutton").on("click", function(e){
		e.preventDefault();
		$("#genbutton").attr("disabled", "disabled")
		$.get("/password/simple/", function(data){
			$("#newpassword").val(data);
		}).always(function(){
			$("#genbutton").removeAttr("disabled")
		}).fail(function(){
			alert("Failed to generate random password.")
		});
		return false;
	});

});





