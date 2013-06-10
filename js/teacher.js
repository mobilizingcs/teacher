$(function(){
	
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
	
	
	$("#createbutton").on("click", function createclass(e){
		e.preventDefault();
		var year = $("#inputYear").val();
		var campaign = $("#inputSubject").val().toLowerCase();
		var period = $("#inputPeriod").val();
		var classname = (year + ":" + campaign + ":" + period).toLowerCase();
		var class_urn = "urn:class:teacher:" + classname;
		var campaign_urn = "urn:campaign:teacher:" + classname;
		
		campaignxml(campaign, function(myxml){
			oh.class.create(class_urn, function(){			
				alert("Class " + class_urn + " created!")
				oh.campaign.create(myxml, campaign_urn, class_urn, function(){
					populateclasses();
					alert("Campaign " + campaign_urn + " created!")					
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
	
	//init page
	oh.ping(function(){
		oh.keepalive();
		populateclasses();		
	});

	
	// readcsvfile($("#inputRoster")[0], console.log)
	// oh.keepalive();
});





