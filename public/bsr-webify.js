var socket = io.connect()

socket.on('articles_list', function (data) {
  populate_articles_dropdown(data)
})

socket.on('show_word', function (data) {
  set_word(data)
})

socket.on('show_questions', function (data) {
  $('#wordContainer').hide()
  set_questions(data)
})

$(window).on('beforeunload', function(){
	socket.close()
})

function populate_articles_dropdown(article_titles) {
  var options = $("#options")
  $.each(article_titles, function() {
    options.append($("<option />").text(this));
  })
}

// TODO: hide #selectArticle after the selection is made
function sendArticle() {
	articleTitle = $("#options").children("option").filter(":selected").text()
	socket.emit('article_selection', articleTitle)
}

function set_word(word) {
  $('#wordContainer').html(strip_quotes(word))
}

function set_questions(questions) {
  $('#questionsContainer').html(questions)

}

function strip_quotes(word) {
  return word.substring(1, word.length-1)
}
