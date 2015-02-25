var socket = io.connect()

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

function set_word(word) {
  $('#wordContainer').html(strip_quotes(word))
}

function set_questions(questions) {
  $('#questionsContainer').html(questions)

}

function strip_quotes(word) {
  return word.substring(1, word.length-1)
}
