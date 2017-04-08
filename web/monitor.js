/*
 * Labqueue-monitor. Copyright (c) 2015, 2016, 2017, Linus Karlsson
 * See LICENSE file at https://github.com/zozs/labqueue-monitor
 */

var app = angular.module('labqueue-monitor', []);

app.controller('LabqueueMonitorCtrl', function ($scope, $rootScope) {
  var monitor = this;

  this.queues = config.queues;

  /* For every object, add two dynamic properties which tracks queue content
   * and the reconnection status. */
  this.queues.forEach(function (q) {
    q['queue'] = [];
    q['reconnecting'] = true;
  });


  this.setTotalInQueue = function () {
    var sum = 0;
    monitor.queues.forEach(function (queue) {
      sum += queue.queue.length;
    });
    $rootScope.header = '(' + sum + ') Labqueue monitor';
  };

  // now launch all socket.io-connections.
  this.queues.forEach(function (queue) {
    var socket = io(queue.host, { 'force new connection': true });
    socket.on('connect', function () {
      queue.reconnecting = false;
      $scope.$apply();
    });
    socket.on('queue', function (msg) {
      queue.queue.length = 0;
      msg.queue.forEach(function (s) {
        queue.queue.push(s.subject);
      });
      // recalculate total count in queues.
      monitor.setTotalInQueue();
      $scope.$apply();
    });
    socket.on('reconnect', function (/*nbr*/) {
      queue.reconnecting = false;
      $scope.$apply();
    });
    socket.on('reconnecting', function (/*nbr*/) {
      queue.reconnecting = true;
      $scope.$apply();
    });
  });

  // default number of (empty) rows to show per queue.
  this.emptyArray = function (n) {
    if (n > 0) {
      return new Array(n);
    } else {
      return [];
    }
  };
});

