var socket = io.connect()

socket.on('new_word', function (data) {
  set_word(data)
})

	$(window).on('beforeunload', function(){
  	socket.close()
})

function set_word(word) {
  $('#wordContainer').html(strip_quotes(word))
}

function strip_quotes(word) {
  return word.substring(1, word.length-1)
}
