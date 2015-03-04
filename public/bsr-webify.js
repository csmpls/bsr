var socket = io.connect()

// data is stored here throughout the experiment
var state = {
  article:  null
  , questions: []
  , answers: []
}

// after each trial, the state (above) is pushed to this array
// the length of this array == the number of trials the subject has completed
var completed_trials = []

socket.on('articles_list', function (data) {
  $('#options').empty()
  populate_articles_dropdown(data)
  $('#selectArticle').show()
  $('#selectArticle').append ($('<button onclick="sendArticle()">go!</button>'))
})

socket.on('show_word', function (data) {
  $('#wordContainer').show()
  set_word(data)
})

socket.on('show_questions', function (data) {
  $('#wordContainer').hide()
  set_questions(data)
})

$(window).on('beforeunload', function(){
  socket.close()
})

// TODO: hide articles we have done before
function populate_articles_dropdown(article_titles) {
  var options = $("#options")

  done_titles = _.map(completed_trials, function(trial) { return trial.article})
  article_titles = _.filter(article_titles, function(title) { 
    if (!_.includes(done_titles, title)) return title
  })

  $.each(article_titles, function() {
    options.append($("<option />").text(this));
  })
}

function sendArticle() {
  state.article = $("#options").children("option").filter(":selected").text()
  socket.emit('article_selection', state.article)
  $('#selectArticle').hide()
}

function set_word(word) {
  $('#wordContainer').html(strip_quotes(word))
}

function get_response(div, type) {

  // for free_response, get the value of the textarea 
  if (type === 'free_response') {
    return {question: type
    , response: div.children('textarea').val()
    }
  }
  if (type === 'free_recall') {
    return {question: type
    , response: div.children('textarea').val().split('\n')
    }
  }
  // for multiple choice, get the list of values that were checked
  else if (type === 'multiple_choice') {
    var checked = div.children ( 'input:checked')
    return {question: type
      , response: _.map(checked, function(box){ return $(box).val() })
    }
  }
}

function make_only_next_question_visible() {
  // hide all but the next question
  $('#questionsContainer').children().hide()
  $('#questionsContainer').children().first().show()
}

function submit_answer(context,type) {
  var div = $(context).parent()
  state.answers.push(get_response(div, type)) 
  $(context).parent().remove()
  make_only_next_question_visible()
}

function set_questions(questions) {

  function make_checkbox_string(choice) {
    var checkbox = _.template('<input type="checkbox" value="<%=choice%>" > <%=choice%> <br>')
    return checkbox({'choice':choice})
  }

  function make_question_div(question) {

    // start off with a label for the question
    var label = _.template('<b> <%= prompt %> </b><br>')
    var qDiv = label({'prompt':question.question})

    var type = question['type']

    if (type === 'free_response') {
       qDiv += '<textarea></textarea>'
    } else if (type === 'free_recall') {
       qDiv += '<textarea></textarea>'
    } else if  (type == 'multiple_choice') {
      _.forEach(question['choices'], function(choice) {
        qDiv += make_checkbox_string(choice)
      })
    }
    qDiv += '<br><button onclick="submit_answer(this,' + "'" + type + "'" + ')">Next question</button>'
    return $('<div>'+qDiv+'</div>')
  }

  state.questions = JSON.parse(questions)

  // make a list of questions
  var question_divs = _.map(state.questions, function(question) {
    return make_question_div(question)
  })

  // modify the last div's button to make onclick="submit_and_go_to_next_trial"
  question_divs = modify_last_button(question_divs)

  _.forEach(question_divs, function(div) {
    $('#questionsContainer').append(div)
  })

  make_only_next_question_visible()

}

function strip_quotes(word) {
  return word.substring(1, word.length-1)
}

function modify_last_button(question_divs) {
  var last_question_div = question_divs.pop()
  var button = last_question_div.find('button')
  var onclick = button.attr('onclick').split('(')
  onclick[0] = 'submit_and_go_to_next_trial('
  onclick = onclick.join('')
  button.attr('onclick',onclick)
  button.html('Submit')
  question_divs.push(last_question_div)
  return question_divs
}

function submit_and_go_to_next_trial(context,type) {
  submit_answer(context,type)
  if (completed_trials.length<4) go_to_next_trial()
  else $(document).html('You are done with this experiment! Congrats! Go tell the experimenter.')
}

function go_to_next_trial() {
  completed_trials.push(state)
  state =  {
  article:  null
    , questions: []
    , answers: []
  }
  socket.emit('articles_please')
}