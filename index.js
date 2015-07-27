$(function(){

	//these should correspond to name.xml files in the xml dir
	var subjectcampaigns = {
		"science" : ["Trash", "TrashWarmUp"],
		"math" : ["Nutrition_v2", "Snack", "Height", "DiningOut"],
		"ecs" : ["Media", "Snack"],
		"ids" : ["Nutrition", "FootSize", "PersonalityColor", "StressChill", "TimeUse"]
	};

	//will be set automatically from login
	var teachername;
	var teacherorg;
	var user_campaigns;
	var table;

	//downloads a campaign.xml file
	function campaignxml(campaign, handler){
		var filename = 'xml/' + campaign + ".xml";
		return $.ajax({
			url: filename,
			data: {},
			success: handler,
			dataType: "text"
		}).fail(function() {
			message("Failed to download:" + filename);
		});
	}

	//repopulates GUI
	function populateclasses(){
		$("#inputClass").empty();
		$("#classtable tbody").empty();
		oh.user.info(function(res){
			var userdata = res.data[first(res.data)];
			user_campaigns = Object.keys(userdata.campaigns);
			oh.class.read(Object.keys(userdata.classes).toString(), function(classdata){
				$.each(userdata.classes, function(key, value){
					if(key.substr(0,15) == "urn:class:lausd" && classdata[key].role == "privileged"){
						makerow(key, value).appendTo("#classtable tbody");			
					}
				});
				initTable();
			});
		});
	}

	function testallempty(class_urn, cb){
		var subject = class_urn.replace("urn:class:lausd:", "").split(":")[4];
		var campaigns = subjectcampaigns[subject];
		if(!campaigns){
			message("Invalid URN subject format: " + subject)
			return;
		}

		var counts = {};
		var requests = $.map(campaigns, function(campaign, i){
			var campaign_urn = class_urn.replace("urn:class:lausd", "urn:campaign:lausd") + ":" + campaign.toLowerCase();

			//workaround for missing campaigns
			if(user_campaigns.indexOf(campaign_urn) < 0){
				console.log("Campaign " + campaign_urn + " does not exist or was just created. Not checking responses.")
				return oh.user.whoami();
			} else {
				return oh.survey.responsecount(campaign_urn, function(n){
					counts[campaign] = n;
				});
			}
		});

		//triggered after all counts are in
		$.when.apply($, requests).always(function() {
			var ok = true;
			$.each(counts, function(campaign, n){
				if(!ok || n === 0) return;
				if(!confirm("Campaign " + campaign + " has " + n + " responses which will be deleted. Are you sure?")){
					ok = false;
				}
			})
			if(ok && cb) cb();
		});
	}

	$("#createbutton").on("click", function createclass(e){
		e.preventDefault();
		if(teacherorg == "Empty" || teachername == "Empty"){
			message("Unable to create class. Your account does not have a valid name and organization.");
			return;
		}
		var school = teacherorg;
		var quarter = $("#inputQuarter").val();
		var period = $("#inputPeriod").val();
		var subject = $("#inputSubject").val();

		var class_urn = ("urn:class:lausd:" + quarter + ":" + school + ":"  + teachername + ":" + subject + ":" + period).toLowerCase();
		var class_name = toTitleCase(subject) + " " + period + " " + teachername + " " + quarter.replace(":", " ");
		var campaigns = subjectcampaigns[subject];

		//test if valid subject
		if(!campaigns){
			message("No campaigns found for subject:", subject);
			return;
		}

		//test if campaign files exists
		var requests = [];
		var xmlstrings = {};
		$.each(campaigns, function(index, value) {
			requests.push(campaignxml(value, function(myxml){
				xmlstrings[value] = myxml;
			}));
		});

	    // all requests finished successfully
		$.when.apply($, requests).done(function(){
			oh.class.create(class_urn, class_name, function(){
				$.each(campaigns, function(index, value) {
					var mycampaign = value;
					var myxml = xmlstrings[mycampaign];
					var campaign_urn = class_urn.replace("urn:class:lausd", "urn:campaign:lausd") + ":" + mycampaign.toLowerCase();
					var campaign_name = mycampaign + " " + period + " " + teachername + " " + quarter.replace(":", " ");

					if(user_campaigns.indexOf(campaign_urn) < 0){
						//campaign does not exist
						oh.campaign.create(myxml, campaign_urn, campaign_name, class_urn, function(){
							console.log("Campaign created: " + campaign_urn, "success");
						});
					} else {
						oh.campaign.addclass(campaign_urn, class_urn, function(){
							message("Campaign already exists. Adding class " + class_urn + " to campaign " + campaign_urn, "warning");
						});
					}
				});
				$('#myModal').modal('hide');
				table.row.add(makerow(class_urn, class_name).addClass("success")).draw();
			});
		});
	});

	function deleteClass(class_urn, class_name, tr){
		//confirm
		if(!confirm("Are you sure you want to delete class: " + class_name + "?\n\nThis can not be undone!")){
			return
		};

		//test for existing responses first
		testallempty(class_urn, function(){

			//delete class
			oh.class.delete(class_urn, function(){
				tr.hide("slow");
			});

			//try to delete corresponding campaigns
			var subject = class_urn.replace("urn:class:lausd:", "").split(":")[4];
			console.log("Deleting campaigns for subject: " + subject);

			//lookup campaigns
			var campaigns = subjectcampaigns[subject];

			//delete some campaigns
			$.each(campaigns, function(index, mycampaign) {
				var campaign_urn = class_urn.replace("urn:class:lausd", "urn:campaign:lausd") + ":" + mycampaign;
				oh.campaign.delete(campaign_urn, function(){
					message("Campaign deleted: " + campaign_urn, "success")
				});
			});
		});
	}

	function td(x){
		return($("<td>").text(x).attr("data-value", x || 0));
	}

	function toTitleCase(str) {
	    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	function first(obj) {
	    for (var a in obj) return a;
	}	

	function makerow(key, value){
		var mytr = $("<tr />")
		td(value).appendTo(mytr);
		td(key).appendTo(mytr);

		var mybtn = $('<a class="btn btn-sm btn-primary"><i class="glyphicon glyphicon-edit"></i> Edit</a>')
		.attr("href", "editclass.html?class=" + key).appendTo($("<td>").appendTo(mytr));

		var delbtn = $('<button class="btn btn-sm btn-danger"><i class="glyphicon glyphicon-trash"></i> Delete</button>').click(function(e){
			e.preventDefault();
			deleteClass(key, value, mytr)
		}).appendTo($("<td>").appendTo(mytr));
		return mytr;
	}

	//data tables widget
	function initTable(){
		table = $('#classtable').DataTable( {
			"dom" : '<"pull-right"l><"pull-left"f>tip',
			"lengthMenu": [[25, 50, 100, -1], [25, 50, 100, "All"]],
			"aoColumnDefs": [
				{ 'bSortable': false, 'aTargets': [ 2, 3 ] }
			]
		});
	}

	function message(msg, type){
		// type must be one of success, info, warning, danger
		type = type || "danger"
		$("#errordiv").append('<div class="alert alert-' + type + '"><a href="#" class="close" data-dismiss="alert">&times;</a>' + msg + '</div>');
		$('html, body').animate({
			scrollTop: 100
		}, 200);
	}

	//init page
	oh.ping(function(){
		oh.user.whoami(function(x){
			oh.user.read(x, function(data){

				var thisname = data[x] && data[x].last_name;
				var thisorg = data[x] && data[x].organization;

				if(!thisname){
					message("ERROR: this account has no last name set. Contact mobilize-support@cs.ucla.edu for assistance.")
				}
				if(!thisorg){
					message("ERROR: this account has no organization set. Contact mobilize-support@cs.ucla.edu for assistance.")
				}

				teachername = utf2ascii(thisname || "Empty" );
				teacherorg = utf2ascii(thisorg || "Empty" );

				oh.keepalive();
				populateclasses();
			});
		});
	});
});

$(function(){
	//Months range from 0 to 11 in javascript!
	var month = (new Date()).getMonth();
	var day = (new Date()).getDate();
	var year = (new Date()).getFullYear();

	if(month < 5 || (month == 5 && day < 16)){
		//up till June 15
		$("#inputQuarter")
			.append($("<option />").attr("value", year + ":Spring").text("Spring " + year))
			.append($("<option />").attr("value", year + ":Summer").text("Summer " + year))
			.append($("<option />").attr("value", year + ":Fall").text("Fall " + year));
	} else if(month < 7){
		//up till July 31
		$("#inputQuarter")
			.append($("<option />").attr("value", year + ":Summer").text("Summer " + year))
			.append($("<option />").attr("value", year + ":Fall").text("Fall " + year))
			.append($("<option />").attr("value", (year+1) + ":Spring").text("Spring " + (year+1)));
	} else {
		//rest of the year
		$("#inputQuarter")
			.append($("<option />").attr("value", year + ":Fall").text("Fall " + year))
			.append($("<option />").attr("value", (year+1) + ":Spring").text("Spring " + (year+1)))
			.append($("<option />").attr("value", (year+1) + ":Summer").text("Summer " + (year+1)));
	}
});
