'use strict';

var app = angular.module('crestronConnectApp', ['tcpServices']);

app.config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/partials/crestronui.html',
        controller: 'CrestronUICtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });


app.directive('crestronConnection',function(){
  return   {
      restrict : 'A',
      template : '<div>Connection:{{isConnected}}</div>',
      replace : true,
      controller: function($scope, $element, $attrs, crestronAPI) {
        this.crestronUpdateConnectionStatus =  function(){
          if(crestronAPI.isConnected == "true"){
            $scope.isConnected = "Success";
          }
          else{
           $scope.isConnected = "Fail"; 
          }
          $scope.$apply();
        }
      },
      link: function(scope,element,attrs,controllers){
       scope.$on("_CONNECTSTATUS", function(evt,arg){
          console.log("connected!!!")
           controllers.crestronUpdateConnectionStatus();
        })
      }  
    }
 });



app.directive('crestronsimpletext',function(){
  return   {
      restrict : 'E',
      template : '<div>{{strValue}}</div>',
      scope : {},
      replace : true,
      transclude: true,
      controller: function($scope, $element, $attrs, crestronAPI) {
        this.crestronUpdateSerialFeedback = function(join){
          $scope.strValue = crestronAPI.guiObjs.serialObjs[join];
          $scope.$apply();
        }
      },
      link: function(scope, element, attrs, controllers) {
        scope.$on("_REFRESHFEEDBACK", function(evt, arg) {
          controllers.crestronUpdateSerialFeedback(attrs.join);
        })
      }
    }
 });


app.directive('crestronsimplegauge',function(){
  return   {
      restrict : 'E',
      template : "<div class={{gauge}} >" +
                    "<div class={{indicator}} style='width: {{analogValue}}%' ng-transclude></div>" +
                  "</div>",
      scope : {},
      replace : true,
      transclude: true,
      controller: function($scope, $element, $attrs, crestronAPI) {
        $scope.gauge = $attrs.gauge;
        $scope.indicator = $attrs.indicator;
        this.crestronUpdateAnalogFeedback = function(join){
          $scope.analogValue = (crestronAPI.guiObjs.analogObjs[join]*100)/65535;
          $scope.$apply();
        }
      },
      link: function(scope, element, attrs, controllers) {
        scope.$on("_REFRESHFEEDBACK", function(evt, arg) {
          controllers.crestronUpdateAnalogFeedback(attrs.join);
        })
      }
    }
 });


app.directive("crestronsimplebutton", function() {
  return {
    restrict: 'E',
    template: '<button ng-mousedown=crestronDigitalPress() ng-mouseup=crestronDigitalRelease() class={{btnState}} ng-transclude></button>',
    scope: {},
    replace: true,
    transclude: true,
    controller: function($scope, $element, $attrs, crestronAPI) {
      //initialise state to off state
      if ($scope.btnState == undefined) {
        $scope.btnState = $attrs.offState;
      }
      // process feedback  
      this.crestronUpdateDigitalFeedback = function(join) {
        if (crestronAPI.guiObjs.digitalObjs[join] == "true") {
          $scope.btnState = $attrs.onState;
        } else
        if (crestronAPI.guiObjs.digitalObjs[join] == "false") {
          $scope.btnState = $attrs.offState;
        }
        $scope.$apply();
      }
      // send digital join value
      this.crestronSendDigital = function(join, value) {
        crestronAPI.sendDigital(join, value);
      }

    },
    link: function(scope, element, attrs, controllers) {
      scope.crestronDigitalPress = function() {
        controllers.crestronSendDigital(attrs.join, 'true');
      }
      scope.crestronDigitalRelease = function() {
        controllers.crestronSendDigital(attrs.join, 'false');
      }

      scope.$on("_REFRESHFEEDBACK", function(evt, arg) {
        controllers.crestronUpdateDigitalFeedback(attrs.join);
      });
    }
  }

});
