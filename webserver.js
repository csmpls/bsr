var express = require('express'),
	app = express()
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs')
var _ = require('lodash')
var exec = require('exec');
var bodyParser = require('body-parser')

app.use("/public", express.static(__dirname + '/public'))

// parse application/json
app.use(bodyParser.json())

// an object with all the titles, filepaths, contents of the articles
var articlesJson = listArticles()

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
  console.log("questions: " + JSON.stringify(req.body))
  io.sockets.emit('show_questions', JSON.stringify(req.body))
  res.send('Got a POST request');
})

// connect to client socket
io.on('connection', function (socket) {
  console.log('connected to client socket')
  io.sockets.emit('articles_list', getArticleTitles()) 

  socket.on('articles_please', function() {
    socket.emit('articles_list', getArticleTitles())
  })


  // this is where we run the python script
  socket.on('article_selection', function(data) {
    article_title = data
    article = _.filter(articlesJson, function(article) {
      return article.title === article_title
    })[0]
    // execute the python script with the article path + the condition as arguments
    console.log(article.path)
    exec(['python', 'bsr.py',article.path, getCondition()], function(err, out, code) {
      if (err instanceof Error)
        throw err;
      process.stderr.write(err);
      process.stdout.write(out);
    });
  })

});

// listen
server.listen(3000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('Example app listening at http://%s:%s', host, port)
})

function getCondition() {
  //TODO: return 'bsr' or 'AR'
  return 'constant'
}

function getArticleTitles() {
  return _.map(articlesJson, function(article) {
    return article.title
  })
}

// read the articles from the json file on disk
function listArticles() {
 return _.map(fs.readdirSync('articles/'), readArticleData)
}

function readArticleData(article) {
  var path = 'articles/'+article
  json = JSON.parse(
    fs.readFileSync(path , {encoding: 'utf-8'})
  )
  json.path = path
  return json
}