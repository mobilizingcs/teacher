$(function(){
	
	//these should correspond to name.xml files in the xml dir 
	var subjectcampaigns = {
		"science" : ["Science_OneDayTrash", "Science_TrashType"],
		"math" : ["Math_Nutrition"],
		"ecs" : ["ECS_Media", "ECS_Snack"]
	};
	
	//will be set automatically from login
	var teachername;
	
	//downloads a campaign.xml file
	function campaignxml(campaign, handler){
		var filename = 'xml/' + campaign + ".xml";
		return $.ajax({
			url: filename,
			data: {},
			success: handler,
			dataType: "text"
		}).fail(function() { 
			alert("Failed to download:" + filename);
		});
	}
	
	//repopulates GUI
	function populateclasses(){
		$("#inputClass").empty();
		$("#classtable tbody").empty();
		oh.user.info(function(res){
			var userdata = res.data[first(res.data)];
			$.each(userdata.classes, function(key, value){
				if(key.substr(0,17) == "urn:class:teacher"){
					$("#inputClass").append($("<option/>", {value: key, text:value}));
					var mytr = $("<tr />").appendTo("#classtable tbody");
					td(value).appendTo(mytr);
					td(key).appendTo(mytr);
					
					var mybtn = $('<a class="btn btn-primary"><i class="icon-exclamation-sign icon-white"></i> Select</a>')
					.attr("href", "editclass.html?class=" + key)
					
					$("<td>").append(mybtn).appendTo(mytr);
				}
			});
		});
			
		function first(obj) {
		    for (var a in obj) return a;
		}
	}
			
	$("#createbutton").on("click", function createclass(e){
		e.preventDefault();
		var year = $("#inputYear").val().toLowerCase();
		var subject = $("#inputSubject").val().toLowerCase();
		var period = $("#inputPeriod").val().toLowerCase();
		var classname = (subject + ":" + year + ":"  + period + ":" + teachername).toLowerCase();
		var class_urn = "urn:class:teacher:" + classname;
		var campaigns = subjectcampaigns[subject];
		
		//test if valid subject
		if(!campaigns){
			alert("No campaigns found for subject:", subject);
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
		$.when.apply($, requests).done(function() {
			oh.class.create(class_urn, function(){	
				populateclasses();		
				$.each(campaigns, function(index, value) {
					var mycampaign = value;
					var myxml = xmlstrings[mycampaign];
					var campaign_urn = class_urn.replace("urn:class:teacher", "urn:campaign:teacher") + ":" + mycampaign;
					
					oh.campaign.create(myxml, campaign_urn, class_urn, function(){
						console.log("Campaign created: " + campaign_urn)
					});
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
		
		//confirm
		if(!confirm("Are you sure you want to delete class: " + class_urn + "?\n\nThis can not be undone!")){
			return
		};
		

		//delete class
		oh.class.delete(class_urn, function(){
			populateclasses();
		});
		
		//try to delete corresponding campaigns
		var subject = class_urn.replace("urn:class:teacher:", "").split(":")[0];
		console.log("Deleting campaigns for subject: " + subject);
		
		//lookup campaigns
		var campaigns = subjectcampaigns[subject];
		
		//delete some campaigns
		$.each(campaigns, function(index, value) {
			var mycampaign = value;
			var campaign_urn = class_urn.replace("urn:class:teacher", "urn:campaign:teacher") + ":" + mycampaign;		
			oh.campaign.delete(campaign_urn, function(){
				console.log("Campaign deleted: " + campaign_urn)
			});	
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





