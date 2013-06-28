var oh = oh || {};
oh.utils = oh.utils || {};
oh.user = oh.user || {};
oh.class = oh.class || {};
oh.campaign = oh.campaign || {};
oh.document = oh.document || {};

oh.utils.delayexec = function(){
	var timer;
	function exec(call, delay){
		if(timer) {
			dashboard.message("clear " + timer);			
			clearTimeout(timer);
		}
		timer = setTimeout(function(){
			timer = null;
			call();
		}, delay);
		dashboard.message("added " + timer)		
	};
	return exec;
}

oh.utils.parsedate = function(datestring){
	if(!datestring) {
		return null;
	}
	var a = datestring.split(/[^0-9]/);
	return new Date (a[0],a[1]-1,a[2],a[3],a[4],a[5]);
}

oh.utils.get = function(item){
	return function(d){
		if(d[item] && d[item] != "NOT_DISPLAYED"){
			return d[item];
		}
		//NA support in dc.js piechart is really bad.
		return "NA"
	}
}

oh.utils.getnum = function(item){
	return function(d){
		if(d[item] && d[item] != "NOT_DISPLAYED"){
			return parseFloat(d[item]) || null;
		}
	}
}

oh.utils.getdate = function(item){
	return function(d){
		if(d[item] && d[item] != "NOT_DISPLAYED"){
			return d3.time.day(oh.utils.parsedate(d[item]));
		}
	}
}

oh.utils.bin = function(binwidth){
	return function(x){
		return Math.floor(x/binwidth) * binwidth;
	}
}

oh.utils.gethour = function(item){
	return function(d){
		if(d[item] && d[item] != "NOT_DISPLAYED"){
			return oh.utils.parsedate(d[item]).getHours();
		}
	}
}

oh.utils.state = function(mycampaign, myresponse){
	if(!mycampaign){
		return window.location.hash.substring(1).split("/");
	} 
	if(!myresponse){
		window.location.hash = mycampaign;
		return;
	}
	window.location.hash = mycampaign + "/" + myresponse;
}

oh.utils.readconfig = function(next){
	$.ajax({
		url: "config.json",
		dataType: "json"
	})
	.success(function(data) {
		dashboard.config = data;
		if(next) next();
	})
	.fail(function(err) { 
		alert("error loading config.json"); 
		dashboard.message(err) 
	});
}

oh.utils.error = function(msg){
	throw new Error(msg)
}

oh.call = function(path, data, datafun){
	
	function processError(errors){
		if(errors[0].code && errors[0].code == "0200"){
			var pattern = /(is unknown)|(authentication token)|(not provided)/i;
			if(!errors[0].text.match(pattern)) {
				alert(errors[0].text);
			}
			if(!/login.html$/.test(window.location.pathname)){
				oh.sendtologin();
			}
		} else {
			alert("Fail: " + path + ":\n" + errors[0].text)
		}
	}	
	
	//input processing
	var data = data ? data : {};		
	
	//default parameter
	data.client = "dashboard"
		
	//add auth_token from cookie
	if($.cookie('auth_token')){
		data.auth_token = $.cookie('auth_token');
	}
		
	var myrequest = $.ajax({
		type: "POST",
		url : "/app" + path,
		data: data,
		dataType: "text",
		xhrFields: {
			withCredentials: true
		}
	}).done(function(rsptxt) {
		if(!rsptxt || rsptxt == ""){
			alert("Undefined error.")
			return false;
		}
		var response = jQuery.parseJSON(rsptxt);
		if(response.result == "success"){
			if(datafun) datafun(response)
		} else if(response.result == "failure") {
			processError(response.errors)
			return false;
		} else{
			alert("JSON response did not contain result attribute.")
		}
		
	}).error(function(){alert("Ohmage returned an undefined error.")});		
	
	return(myrequest)
}

oh.login = function(user, password, cb){
	var req = oh.call("/user/auth_token", { 
		user: user, 
		password: password
	}, function(response){
		if(!cb) return;
		cb()
	})
	return req;
}

oh.logout = function(cb){
	oh.call("/user/logout", {}, cb);
}

oh.sendtologin = function(){
	window.location = "../web/#login"
}

oh.campaign_read = function(cb){
	var req = oh.call("/campaign/read", {
		output_format : "short"
	}, function(res){
		if(!cb) return;
		var arg = (res.metadata && res.metadata.items) ? res.metadata.items : null;
		cb(arg)
	});
	return req;
};

oh.user.whoami = function(cb){
	var req = oh.call("/user/whoami", {}, function(res){
		if(!cb) return;
		cb(res.username)
	});
	return req;
}

oh.user.info = function(cb){
	oh.call("/user_info/read", {},
	function(res){
		if(!cb) return;
		cb(res)
	});
}

oh.user.setup = function(first_name, last_name, organization, personal_id, cb){
	oh.call("/user/setup", {
		first_name : first_name,
		last_name : last_name,
		organization : organization,
		personal_id : personal_id
	}, function(res){
		if(!cb) return;
		cb(res.data)
	});
}

oh.class.create = function(class_urn, cb){
	var req = oh.call("/class/create", {
		class_urn : class_urn,
		class_name : class_urn
	}, function(res){
		if(!cb) return;
		cb()
	});
	return req;	
}

oh.class.delete = function(class_urn, cb){
	var req = oh.call("/class/delete", {
		class_urn : class_urn
	}, function(res){
		if(!cb) return;
		cb()
	});
	return req;	
}

oh.class.update = function(class_urn, user_role_list_add, cb){
	var req = oh.call("/class/update", {
		class_urn : class_urn,
		user_role_list_add : user_role_list_add
	}, function(res){
		if(!cb) return;
		cb()
	});
	return req;	
}

oh.campaign.create = function(xml, campaign_urn, class_urn, cb){
	var req = oh.call("/campaign/create", {
		xml : xml,
		privacy_state : "shared",
		running_state : "running",
		campaign_urn : campaign_urn,	
		class_urn_list : class_urn		
	}, function(res){
		if(!cb) return;
		cb()
	});
	return req;		
}

oh.campaign.delete = function(campaign_urn, cb){
	var req = oh.call("/campaign/delete", {
		campaign_urn : campaign_urn,		
	}, function(res){
		if(!cb) return;
		cb()
	});
	return req;	
}

oh.document.create = function(document_name, privacy_state, document, cb){
	var req = oh.call("/document/create", {
		document_name : document_name,
		privacy_state : privacy_state,
		document : document
	}, function(res){
		if(!cb) return;
		cb()
	});
	return req;	
}

//no more than 1 ping every 60 sec
oh.ping = _.debounce(oh.user.whoami, 60*1000, true);

//ping once every t sec
oh.keepalive = _.once(function(t){
	t = t || 60;
	setInterval(oh.ping, t*1000)
});

//or: keep alive only when active
oh.keepactive = _.once(function(t){
	$('html').click(function() {
		oh.ping();
	});
});
