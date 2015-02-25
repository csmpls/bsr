var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var bodyParser = require('body-parser')

// parse application/json
app.use(bodyParser.json())

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
})

app.post('/show_word', function (req, res) {
  console.log("new word: " + JSON.stringify(req.body['word']))
  io.sockets.emit('new_word', JSON.stringify(req.body['word']))
  res.send('Got a POST request');
})


// connect to client socket
io.on('connection', function (socket) {
  console.log('connected to client socket')
});

// listen
server.listen(3000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('Example app listening at http://%s:%s', host, port)
})
