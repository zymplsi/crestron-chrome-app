'use strict';


function CrestronUICtrl($scope, tcpClient, crestronAPI) {

	$scope.connectInitialise = function() {


		tcpClient.host = $scope.host;
		tcpClient.port = $scope.port;

		// hide disconnect button
		$scope.disconnectIsVisible = false;	


		if (crestronAPI.isConnected !== "true") {
			tcpClient.connect(function() {

				// add listener to the crestron connection
				tcpClient.addResponseListener(function(data) {
			
					// show disconnect butCAPton
					$scope.disconnectIsVisible = true;	
					$scope.$apply();

					// debug tcp client response
					// console.log(data);

					// process all feedback from crestron processor
					crestronAPI.processFeedback(data);
				});
			})
		} else {
				// when there is not hearbeat response after timeout,
				// force a disconnect
				// tcpClient.disconnect();
		};
	}



	// need to refactor/clean up this code
	$scope.disconnect = function(){
				tcpClient.disconnect();
				$scope.disconnectIsVisible = false;
				crestronAPI.isConnected  = "false";	
				$scope.isConnected = "";

	}

	// crestron APIs exposed for debugging

	$scope.connectRequest = function(){
       crestronAPI.connectRequest();
	}

	$scope.updateRequest = function(){
       crestronAPI.updateRequest();
	}

	$scope.heartbeatRequest = function(){
       crestronAPI.heartbeatRequest();
	}

}