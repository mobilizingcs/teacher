$(function(){
	
	var teachername;
	var classrecords = [];
	
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
	
	function campaignxml(campaign, handler){
		
		var filename = 'xml/' + campaign + ".xml";
		$.ajax({
			url: filename,
			data: {},
			success: handler,
			dataType: "text"
		}).fail(function() { 
			alert("Failed to download:" + filename);
		});
	}
	
	function populateclasses(){
		$("#inputClass").empty();
		oh.user.info(function(res){
			var userdata = res.data[first(res.data)];
			$.each(userdata.classes, function(key, value){
				$("#inputClass").append($("<option/>", {value: key, text:value}));
			});
		});
			
		function first(obj) {
		    for (var a in obj) return a;
		}
	}
	
	function createaccounts(accountlist, class_urn){
		$.each(accountlist, function(i, rec){
			oh.user.setup(rec.firstname, rec.lastname, "test_org", rec.id, function(data){
				rec.username = data.username;
				rec.password = data.password;
				rec.email = data["email_address"];
				rec.tr.append(td(rec.username));
				rec.tr.append(td(rec.password));
				rec.tr.append(td(rec.email));
				oh.class.update(class_urn, rec.username + ";" + "restricted", function(){
					rec.tr.append(td("OK"));					
				})
			})
		})		
	}
	
	
	$("#createbutton").on("click", function createclass(e){
		e.preventDefault();
		var year = $("#inputYear").val();
		var campaign = $("#inputSubject").val().toLowerCase();
		var period = $("#inputPeriod").val();
		var classname = (teachername + ":" + year + ":" + campaign + ":" + period).toLowerCase();
		var class_urn = "urn:class:teacher:" + classname;
		var campaign_urn = "urn:campaign:teacher:" + classname;
		
		campaignxml(campaign, function(myxml){
			oh.class.create(class_urn, function(){			
				oh.campaign.create(myxml, campaign_urn, class_urn, function(){
					populateclasses();
					createaccounts(classrecords, class_urn);
				});
			});			
		});		
	});
	
	$("#deletebutton").on("click", function deleteclass(e){
		e.preventDefault();
		var class_urn = $("#inputClass").val();
		
		if(!class_urn) {
			alert("No class selected to delete.");
			return
		}
		
		oh.class.delete(class_urn, function(){
			alert("Class " + class_urn + " deleted!")
			populateclasses();

		});
		
		if(/^urn:class:teacher/.test(class_urn)){
			var campaign_urn = class_urn.replace("urn:class:teacher", "urn:campaign:teacher");
			oh.campaign.delete(campaign_urn, function(){
				alert("Campaign " + campaign_urn + "deleted!")
			});
		}			
	});
	
	$("#inputRoster").on("change", function loadfile(e){
		e.preventDefault();
		readcsvfile($("#inputRoster")[0], function(records){
			$("#studenttable tbody").empty();
			classrecords = [];
			$("#createbutton").attr("disabled", "disabled");
			$.each(records, function(i, rec){
				try {
					rec.id = rec["Student ID"];				
					rec.firstname = rec["Student Name"].split(",")[0].trim();
					rec.lastname = rec["Student Name"].split(",")[1].trim();
					rec.tr = $("<tr>").append(td(rec.id)).append(td(rec.firstname)).append(td(rec.lastname));
					classrecords.push(rec);
					$("#studenttable tbody").append(rec.tr);
				} catch(err) {
					alert("CSV parsing error. Failed to read student record:\n\n" + JSON.stringify(rec));
				}
			});
			if(classrecords.length > 0){
				$("#createbutton").removeAttr("disabled");
			}
		});
	});
	
	function td(x){
		return($("<td>").text(x));
	}	
	
	//init page
	oh.ping(function(){
		oh.user.whoami(function(x){
			var teachervec1 = x.split("-");
			var teachervec2 = teachervec1[teachervec1.length-1].split(".");
			teachername = teachervec2[teachervec2.length-1];
		});
		
		oh.keepalive();
		populateclasses();		
	});

});





