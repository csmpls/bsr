var express = require('express'),
	app = express()
var server = require('http').Server(app);
var io = require('socket.io')(server);

var bodyParser = require('body-parser')

app.use("/public", express.static(__dirname + '/public'))

// parse application/json
app.use(bodyParser.json())

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
})

// accepts word {'word': 'someword'}
app.post('/show_word', function (req, res) {
  console.log("show word: " + JSON.stringify(req.body['word']))
  io.sockets.emit('show_word', JSON.stringify(req.body['word']))
  res.send('Got a POST request');
})

// accepts json {'questions': [{'question': }, .. ]}
app.post('/show_questions', function (req, res) {
  console.log("questions: " + JSON.stringify(req.body['questions']))
  io.sockets.emit('show_questions', JSON.stringify(req.body['questions']))
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
