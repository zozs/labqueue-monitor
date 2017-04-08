var blessed = require('blessed');
var io = require('socket.io-client');
var config = require('config');

var queues = config.get('queues');

/* For every object, add two dynamic properties which tracks queue content
 * and the reconnection status. */
queues.forEach(function (q) {
  q['queue'] = [];
  q['reconnecting'] = true;
});

// Create a screen object.
var screen = blessed.screen({
  smartCSR: true,
  dockBorders: true
});

screen.title = 'labqueue monitor';

var outerBox = blessed.box({
  top: '0',
  left: '0',
  width: '100%',
  height: '100%',
  content: '',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    border: {
      fg: '#f0f0f0'
    }
  }
});

// now launch all socket.io-connections.
queues.forEach(function (queue, queueIndex) {
  var row = Math.floor(queueIndex / 3);
  var col = Math.floor(queueIndex % 3);

  var topPercent = (row * 48) + '%';
  var leftPercent = (col * 33) + '%';
  var box = blessed.box({
    parent: outerBox,
    top: topPercent,
    left: leftPercent,
    width: '33%',
    height: '48%',
    content: '',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      border: {
        fg: '#f0f0f0'
      }
    }
  });

  var header = blessed.text({
    parent: box,
    top: 0,
    left: 'center',
    width: 'shrink',
    height: 1,
    tags: true,
    content: queue.prettyName + ' {red-fg}(Reconnecting...){/red-fg}'
  });

  var line = blessed.line({
    parent: box,
    top: 1,
    width: '100%-2',
    orientation: 'horizontal',
    border: {
      type: 'line'
    },
    style: {
      fg: 'white',
      border: {
        fg: '#f0f0f0'
      }
    }
  });

  var list = blessed.listtable({
    parent: box,
    top: 2,
    left: 0,
    width: '100%-2',
    height: '100%-4'
  });
  
  var socket = io(queue.host, { 'force new connection': true });
  socket.on('connect', function () {
    queue.reconnecting = false;
    header.setContent(queue.prettyName);
    screen.render();
  });
  socket.on('queue', function (msg) {
    queue.queue.length = 0;
    msg.queue.forEach(function (s) {
      queue.queue.push(s.subject);
    });
    // recalculate total count in queues.
    var newData = queue.queue.map(function (row, index) {
      return [(index + 1).toString(), row];
    });
    // apparently blessed acts weird when it gets an empty queue.
    if (newData.length === 0) {
      newData = [[" ", " "]];
    }
    list.setData(newData);
    screen.render();
  });
  socket.on('reconnect', function (/*nbr*/) {
    queue.reconnecting = false;
    header.setContent(queue.prettyName);
    screen.render();
  });
  socket.on('reconnecting', function (/*nbr*/) {
    queue.reconnecting = true;
    header.setContent(queue.prettyName + ' {red-fg}(Reconnecting...){/red-fg}');
    screen.render();
  });
});

// Append our box to the screen.
screen.append(outerBox);

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

// Focus our element.
outerBox.focus();

// Render the screen.
screen.render();
