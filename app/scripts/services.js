angular.module('tcpServices', [])
.factory('tcpClient', function () {

	var tcpClient = new TcpClient();
	return tcpClient;
	
})
.factory('x2js', function () {

	var x2js = new X2JS();
	return x2js;
	
})
.factory('crestronAPI', function($rootScope, tcpClient) {

	var x2js = new X2JS();	// converter from xml to json
	var isUpdating; 				// flag is true until last element of xml response is received
	var buffer;							// store xml response until all has been received

	var crestronAPI = {
		isConnected: "", 			// is true when "<programReady><status>" is received
		entryfile: "",
		device: {
			product: "",
			version: ""
		},
		guiObjs: {						// all joins and corresponding values from crestron are stored here
			serialObjs : [],
			digitalObjs : [],
			analogObjs : []
		},

		digitalObjsPressedState: [],	// all digital joins and corresponding values of buttons that
																	// are pressed are stored here. 
																	// a true value of a digital join needs to be resend to let
																	// crestron knows that it has not been released

		
		// xml strings required for communication	with crestron														
		connectRequestStr: "<cresnet><control><comm><connectRequest><passcode>1234</passcode><mode isUnicodeSupported='true'></mode></connectRequest></comm></control></cresnet>",
		updateRequestStr: "<cresnet><data><updateRequest></updateRequest></data></cresnet>",
		heartbeatRequestStr: "<cresnet><control><comm><heartbeatRequest></heartbeatRequest></comm></control></cresnet>",


		// a button press will invoke this function
		sendDigital: function(join, value) {

			// store state of button, need to resend later if button is held down
			crestronAPI.digitalObjsPressedState[join] = value;

			var sendDigitalStr = "<cresnet><data><bool id=\"" + join + "\" value=\"" + value + "\" repeating=\"" + "true" + "\"/></data></cresnet>";
			
			// debug
			//console.log(sendDigitalStr);
			
			tcpClient.sendMessage(sendDigitalStr, function() {

			});

		},

		// parser for crestron xml data
		// the xml response for 2 series and 3 series has a slight difference in how it embeds the analog/digital/string values	
		parseXML: function(xml) {
			
			//debug
			//console.log(xml);

			// store all converted xml data
			var jsonObj;

			// start index for the xml data	
			var startIndex = xml.indexOf("<data")

			// end index for the xml data
			var endIndex = xml.indexOf("</cresnet>");

			// the last index in the xml stream
			var lastIndex = ((xml.lastIndexOf("</updateCommand>")) > (xml.lastIndexOf("</cresnet>"))) ? (xml.lastIndexOf("</updateCommand>")) : (xml.lastIndexOf("</cresnet>"));

	
			// process start, end and last indexes for extraction of relevant info
			while (startIndex > 0) {

				// if start index is greater than the end index
				// it means the start index has overshot	
				if (startIndex > endIndex) {					
					
					// 	debug
					//	console.log("startIndex is greater than endIndex!!!");

					// trim the xml data from the first <cresnet> element found
					xml = xml.slice(xml.indexOf("<cresnet>"), lastIndex + 20);
					startIndex = xml.indexOf("<data");
					endIndex = xml.indexOf("</cresnet>");
					lastIndex = ((xml.lastIndexOf("</updateCommand>")) > (xml.lastIndexOf("</cresnet>"))) ? (xml.lastIndexOf("</updateCommand>")) : (xml.lastIndexOf("</cresnet>"));
				}

				// parse the <data></data> tags, convert to JSON and push to array
				jsonObj = x2js.xml_str2json(xml.substring(startIndex, endIndex))

				// debug
				// console.log(jsonObj);

				if (jsonObj.data.hasOwnProperty("string_asArray")) {
					for (i = 0, len = jsonObj.data.string_asArray.length; i < jsonObj.data.string_asArray.length; i++) {
						if(jsonObj.data.string_asArray[i].hasOwnProperty("_value")){ // 3-series
							crestronAPI.guiObjs.serialObjs[jsonObj.data.string_asArray[i]._id] = jsonObj.data.string_asArray[i]._value;
						} else
							if(jsonObj.data.string_asArray[i].hasOwnProperty("__text")){ // 2-series
								crestronAPI.guiObjs.serialObjs[jsonObj.data.string_asArray[i]._id] = jsonObj.data.string_asArray[i].__text;
							}

					}
				} else
				if (jsonObj.data.hasOwnProperty("bool_asArray")) {
					for (i = 0, len = jsonObj.data.bool_asArray.length; i < jsonObj.data.bool_asArray.length; i++) {
						if(jsonObj.data.bool_asArray[i].hasOwnProperty("_value")){ // 3-series
							crestronAPI.guiObjs.digitalObjs[jsonObj.data.bool_asArray[i]._id] = jsonObj.data.bool_asArray[i]._value;
						} else
							if(jsonObj.data.bool_asArray[i].hasOwnProperty("__text")){ // 2-series
								crestronAPI.guiObjs.digitalObjs[jsonObj.data.bool_asArray[i]._id] = jsonObj.data.bool_asArray[i].__text;
							}
					}
				} else
				if (jsonObj.data.hasOwnProperty("i32_asArray")) {
					for (i = 0, len = jsonObj.data.i32_asArray.length; i < jsonObj.data.i32_asArray.length; i++) {
						if(jsonObj.data.i32_asArray[i].hasOwnProperty("_value")){ // 3-series
							crestronAPI.guiObjs.analogObjs[jsonObj.data.i32_asArray[i]._id] = jsonObj.data.i32_asArray[i]._value;
						} else
							if(jsonObj.data.i32_asArray[i].hasOwnProperty("__text")){ // 2-series
								crestronAPI.guiObjs.analogObjs[jsonObj.data.i32_asArray[i]._id] = jsonObj.data.i32_asArray[i].__text;
							}

					}

				}

				// broadcast to all directives to refresh the feedback values
				$rootScope.$broadcast("_REFRESHFEEDBACK");

				// remove parsed the section xml data which has been processed
				xml = xml.slice(xml.indexOf("</cresnet>"), lastIndex + 20);

				// process new indexes for parsing
				startIndex = xml.indexOf("<data");
				endIndex = xml.indexOf("</cresnet>");
				lastIndex = ((xml.lastIndexOf("</updateCommand>")) > (xml.lastIndexOf("</cresnet>"))) ? (xml.lastIndexOf("</updateCommand>")) : (xml.lastIndexOf("</cresnet>"));

				// debug
				// console.log(crestronAPI.guiObjs)

			}
		},

		processFeedback: function(data) {			

			if (data.indexOf("<programReady><status>") >= 0) {
				crestronAPI.isConnected = "true";
				crestronAPI.connectRequest();

				$rootScope.$broadcast("_CONNECTSTATUS");

			} else if (data.indexOf("<connectResponse>") >= 0) {
				crestronAPI.updateRequest();
			
			} else if (data.indexOf("<string") >= 0 || data.indexOf("<bool") >= 0 || data.indexOf("<i32") >= 0) {

				buffer = buffer + data;

				if (data.indexOf("<updateCommand><endOfUpdate />") >= 0) {
					console.log("endOfUpdate");
					crestronAPI.parseXML(buffer);
					buffer = "";
					isUpdating = false;
				} else if (data.indexOf("<updateCommand><clearAll />") >= 0) {
					console.log("clearAll");
					isUpdating = true;
				}


				if (!isUpdating) {
					
					// the xml stream of data has all been received,
					// send to parser to extract the relevant info
					crestronAPI.parseXML(buffer);
					buffer = "";

					// if a button is still being pressed and held down, resend the join and true value to crestron
					for (i = 0, len = crestronAPI.digitalObjsPressedState.length; i < crestronAPI.digitalObjsPressedState.length; i++) {
						if(crestronAPI.digitalObjsPressedState[i] == "true"){
							console.log("resend");
							crestronAPI.sendDigital(i, "true");
						}
					}
				}

			} else if (data.indexOf("</heartbeatResponse>") >= 0) {
				crestronAPI.heartbeatRequest();
			} else if (data.indexOf("<heartbeatRequest>") >= 0) {
				crestronAPI.heartbeatRequest();
			} else if (data.indexOf("<disconnectRequest>") >= 0) {
				crestronAPI.isConnected = "false";
			}
			 console.log("isUpdating: " + isUpdating);

		},

		connectRequest : function() {
			tcpClient.sendMessage(crestronAPI.connectRequestStr, function() {
			});
		},

		updateRequest : function() {
			tcpClient.sendMessage(crestronAPI.updateRequestStr, function() {
			});
		},

		heartbeatRequest : function() {
			tcpClient.sendMessage(crestronAPI.heartbeatRequestStr, function() {
			});
		}

	}

	return crestronAPI
});

