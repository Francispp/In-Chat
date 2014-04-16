$(document).ready(function() {
  var host = window.location.host.split(':')[0];
  var socket = io.connect('http://' + host);
  var userName = $.cookie('user');
  var accountData = null;

  var $usersList = $('.users-list');
  var $groupsList = $('.groups-list');
  var $usersBoxBd = $('.users-box-bd');
  var $chatExtend = $('.chat-extend');
  var $chatExtendBd = $chatExtend.find('.chat-extend-bd');
  
  var systemMessageCollection = []; // collect system message
  /*{
    user : 'memo'
    , message : [
      {
        type : 'comm'
        , getmessageuser : 'memo'
        , sendmessageuser : 'double'
        , isread : false
      }
    ] 
  }*/
  var chatMessageCollection = {}; // collect chat message
  /*{
    user : 'memo'
    , message : {
      user : [
        {
          getmessageuser : 'double'
          , sendmessageuser : 'memo'
          , message : 'hi~'
          , isread : false
        }
      ]
    }
  }*/
  
  // get system message from mongodb
  socket.on('get-system-message', function(data){
    systemMessageCollection = systemMessageCollection.concat(data.message);
    appendSystemMessage(data.message[i]);
  })
  
  // get chat message from mongodb
  socket.on('get-chat-message', function(data){
    chatMessageCollection = data.message;
    for(k in data.message){
      // append to message panel
      appendChatMessage(data.message[k][data.message[k].length-1]);
    }
  })
  
  // get account data when socket connect
  socket.on('send-account-data', function(data){
    accountData = data;
    console.log(accountData);
    
    var _htmlFriends = '';
    for (var k in data.friends) {
      _htmlFriends += '<li><a href="#none" data-chaters="' + data.friends[k].chaters + '" data-chatid="' + data.friends[k].chatid + '">' + k + '</a></li>';
    }
    $usersList.html(_htmlFriends);
    
    var _htmlGroups = '';
    for (var k in data.groups) {
      _htmlGroups += '<li><a href="#none" data-chaters="' + data.groups[k].chaters + '" data-chatid="' + data.groups[k].chatid + '">' + k + '</a></li>';
    }
    $groupsList.html(_htmlGroups);

    $usersBoxBd.find('a').click(function(e) {
      e.preventDefault();
      
      var $this = $(this);
      $this.removeClass('active');
      var chatTitle = $this.html();
      var chatId = $this.data('chatid');
      var chaters = $this.data('chaters');
      
      var template = _.template(
        $('script.template-chat-box').html()
      );
      $chatExtendBd.html(template({chatid: chatId, chaters: chaters}));
      
      showChatMessageCollection(chatId);
      showExtend(chatTitle);
    })
  })
  
  function loadAccountData(){
    socket.emit('get-account-data');
  }
  // show & init friends list 
  loadAccountData();
  
  //get message
  socket.on('get-realtime-message', function(data) {
    console.log(data.message);
    // store message by chatuser
    var _chatId = data.chatid;
    if(chatMessageCollection[_chatId] == undefined){
      chatMessageCollection[_chatId] = [];
    }
    chatMessageCollection[_chatId].push(data);
    
    // show message
    if($('.chatid-input').val() == _chatId){ // if chat user is chating
      if (data.sendmessageuser == userName) {
        var _html = '<p class="send-message"><span>' + data.message + '</span></p>';
      } else {
        var _html = '<p class="get-message"><span>' + data.message + '</span></p>';
      }
      $('.chat-message-box').append(_html);
      // message box keep scroll to bottom
      if($('.chat-box-bd').css('overflow-y') == 'auto'){
        $('.chat-box-bd').scrollTop($('.chat-message-box').height());
      }
    } else {
      playMessageSound();
    }
    // append to message panel
    appendChatMessage(data);
  })
  
  socket.on('add-friend', function(data){
    playMessageSound();
    systemMessageCollection.push(data);
    appendSystemMessage(data)
  })
  
  socket.on('response-add-friend-success', function(data) {
    loadAccountData();
    
    playMessageSound();
    systemMessageCollection.push(data);
    appendSystemMessage(data)
  })
  
  socket.on('create-group-success', function(o){
    loadAccountData();
  })

  // show search-box
  $('.j-search-friend-btn').on('click', function(){
    showExtend('Search');
    
    if($('.search-box').length == 0){
      var template = _.template(
        $('script.template-search-box').html()
      );
      $chatExtendBd.html(template());
    }
    
    $('#search-form').submit(function(e){
      e.preventDefault();
      var user = $('#search-user').val();
      
      $.ajax({
        type: 'get',
        url: '/search-friend',
        data: { user: user },
        success : function(response, status, xhr, $form){
          if (status == 'success'){
            console.log('search success~~~')
            var template = _.template(
              $('script.search-friends-list').html()
            );
            $('.search-list').html(template(response));
            
            $('.search-list').removeClass('hide');
            $('.search-list .add').click(function(){
              var getmessageuser = $(this).siblings('.user').html();
              socket.emit('add-friend', {
                type : 'add-friend'
                , getmessageuser : getmessageuser
                , sendmessageuser : userName
              });
              $(this).remove();
            })
          }
        },
        error : function(e){
          console.log('search fail~~~')
        }
      })
    })
  })
  
  // show create group box
  $('.j-show-create-group').click(function(){
    showExtend('Create Group');
    
    var template = _.template(
      $('script.template-select-friend').html()
    );
    $chatExtendBd.html(template({friends:accountData.friends}));
  })
  
  // create group
  $(document).delegate('#group-select-form', 'submit', function(e){
    e.preventDefault();
    var _arr = [userName];
    var _groupTitle = $('.select-friend-box-ft').find('.group-title').val();
    $('.select-friend-box-bd').find( ":checked" ).each(function(){
      _arr.push($(this).val());
    })
    
    // create-group
    socket.emit('create-group', {
      'grouptitle': _groupTitle
      , 'chaters': _arr
      , 'user': userName
    })
  })
  
  // send message
  $(document).delegate(".chat-form", 'submit', function(e) {
    e.preventDefault();
    var message = $('.message-input').val();
    // stop empty message
    if($.trim(message) == '') return;
    var _chatId = $('.chatid-input').val();
    var _chaters = $('.chaters-input').val().split(',');
    var _chatTitle = $('.chat-extend-title').html();
    socket.emit('send-realtime-message', {
      'message' : message
      , 'sendmessageuser' : userName
      , 'chatid' : _chatId
      , 'chaters' : _chaters
      , 'chattitle' : _chatTitle
    })
    $('.message-input').val('');
  })
  
  // close extend-box
  $(document).delegate('.j-extend-box-close', 'click', function(){
    $(this).parents('.extend-box').fadeOut().delay(1000).remove();
  })
  
  // get indexedDB message 10 item per require
  $(document).delegate('.get-indexeddb-message', 'click', function(){
    var currentMessageLength = $('.chat-message-box').find('.send-message, .get-message').length;
    var _chatId = $('.chatid-input').val();
    
  })
  
  // show message detail
  $(document).delegate('.messages-item', 'click', function(){
    showExtend('System Message');
    $chatExtendBd.html('');
    
    var _type = $(this).data('type');
    switch(_type){
      case 'chat':
        var _chatId = $(this).data('chatid');
        var _chaters = $(this).data('chaters');
        var _chatTitle = $(this).find('.item-title').html();
        if($('.chat-extend .chat-box').length == 0){
          var template = _.template(
            $('script.template-chat-box').html()
          );
          $chatExtendBd.html(template({chatid:_chatId, chaters: _chaters}));
        }
        
        showChatMessageCollection(_chatId);
        showExtend(_chatTitle);
        break;
      case 'add-friend': // system add friend message
        var _data = {sendmessageuser: $(this).data('user')}
        var template = _.template(
          $('script.add-friend-box').html()
        );
        $chatExtendBd.prepend(template(_data));
        
        $('.add-friend-yes').click(function(){
          var requireuser = $(this).siblings('.j-require-user').html();
          socket.emit('response-add-friend', {
            type: 'add-friend'
            , requireuser: requireuser
            , responseuser: userName
          })
          console.log('agree add~');
          $(this).parents('.extend-box').fadeOut().remove();
        })
        $('.add-friend-no').click(function(){
          console.log('disagree add~');
          $(this).parents('.extend-box').fadeOut().remove();
        })
        $(this).remove();
        break;
      case 'comm': // system common message
      default:
        var _message = $(this).data('message');
        var _data = {message: _message}
        var template = _.template(
          $('script.comm-box').html()
        );
        $chatExtendBd.prepend(template(_data));
        $(this).remove();
        break;
    }
  })
  
  // hide chat-extend panel 
  $('.chat-extend-hd .glyphicon-chevron-right').click(function(){
    hideExtend();
  })
  
  $('.chat-extend').hammer().on('dragright', function(){
    hideExtend();
  })
  
  // panel control button
  $('.chat-main-ft .glyphicon-comment').click(function(){
    $('.chat-main-bd .main-box').addClass('hide');
    $('.chat-main-bd .messages-box').removeClass('hide');
    $('.chat-main-ft .glyphicon').removeClass('active');
    $('.chat-main-ft .glyphicon-comment').addClass('active');
  })
  $('.chat-main-ft .glyphicon-user').click(function(){
    $('.chat-main-bd .main-box').addClass('hide');
    $('.chat-main-bd .users-box').removeClass('hide');
    $('.chat-main-ft .glyphicon').removeClass('active');
    $('.chat-main-ft .glyphicon-user').addClass('active');
  })
  $('.chat-main-ft .glyphicon-home').click(function(){
    location.href = '/home';
  })
  
  /* extend methods */
 
  // read chat message from var chatMessageCollection
  function showChatMessageCollection(user){
    var _html = '<p class="message-tip"><button class="btn get-indexeddb-message">more message</button></p>';
    
    if(!(user in chatMessageCollection)){
      $('.chat-message-box').html(_html);
      return;
    } 
    
    for(var i=0; i<chatMessageCollection[user].length; i++){
      if (chatMessageCollection[user][i].sendmessageuser == userName) {
        _html += '<p class="send-message"><span>' + chatMessageCollection[user][i].message + '</span></p>';
      } else {
        _html += '<p class="get-message"><span>' + chatMessageCollection[user][i].message + '</span></p>';
      }
    }
    $('.chat-message-box').html(_html);
    
    // message box keep scroll to bottom on pc
    if($('.chat-box-bd').css('overflow-y') == 'auto'){
      $('.chat-box-bd').scrollTop($('.chat-message-box').height());
    }
  }
  
  // chat message append to message panel
  function appendChatMessage(data){
    var _chatUser = (data.sendmessageuser == userName ? data.getmessageuser : data.sendmessageuser);
    if($('.messages-item[data-chatid="'+data.chatid+'"]').length > 0){
      $('.messages-item[data-chatid="'+data.chatid+'"]').find('.item-content').html(data.sendmessageuser+': '+data.message);
    } else {
      var _html = '<div class="messages-item" data-type="chat"  data-chaters="'+data.chaters+'" data-chatid="'+data.chatid+'">';
      _html += '<h3 class="item-title">'+data.chattitle+'</h3>'
      _html += '<p class="item-content">'+data.sendmessageuser+': '+data.message+'</p>'
      _html += '</div>';
      $('.messages-box').prepend(_html);
    }
  }
  
  // system message append to message panel
  function appendSystemMessage(data){
    var _type = data.type;
    switch(_type){
      case 'add-friend':
        var _html = '<div class="messages-item" data-type="'+data.type+'" data-user="'+data.sendmessageuser+'">';
        _html += '<h3 class="item-title">'+data.sendmessageuser+'</h3>'
        _html += '<p class="item-content">add friend require~</p>'
        _html += '</div>';
        $('.messages-box').prepend(_html);
        break;
      case 'comm':
      default:
        var _html = '<div class="messages-item" data-type="'+data.type+'" data-message="'+data.message+'">';
        _html += '<h3 class="item-title">System Message</h3>'
        _html += '<p class="item-content">'+data.message+'</p>'
        _html += '</div>';
        $('.messages-box').prepend(_html);
        break;
    }
  }
  
  // for mobile device
  function showExtend(title){
    $('.chat-extend-title').html(title);
    $('.chat-extend').animate({
      width: '100%'
    })
  }
  
  // for mobile device
  function hideExtend(){
    $('.chat-extend').animate({
      width: 0
    }).find('.chat-extend-bd').html('');
  }
  
  // play message sound
  function playMessageSound(){
    document.getElementById('chat-get-message-sound').play();
  }
  
})
