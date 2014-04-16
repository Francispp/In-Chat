var AM = require('./../modules/account-manager');
var SMM = require('./../modules/system-message-manager');
var CMM = require('./../modules/chat-message-manager');
var SAH = require('./../modules/salt-and-hash');

module.exports = function(io, sessionStore, cookieParser) {
  var SessionSockets = require('session.socket.io');
  var sessionSockets = new SessionSockets(io, sessionStore, cookieParser, 'jsessionid');
  var users = {}; // online users
  
  sessionSockets.on('connection', function (err, socket, session) {
    
    if(!session.user) return;
    
    console.log('server>socket-chat: socket connect '+session.user.user)
    
    users[session.user.user] = {
      "socket": socket.id
    };
    
    // get system message
    SMM.getSystemMessage(session.user.user, function(e, o){
      if (e) {
        console.log('server>socket-chat: error-get-system-message '+ e);
      } else {
        console.log('server>socket-chat: ok-get-system-message~');
        io.sockets.socket(users[session.user.user].socket).emit("get-system-message", o);
        // delete system message
        SMM.delSystemMessage(session.user.user, function(e){
          if(e){
            console.log('server>socket-chat: error-del-system-message '+e)
          } else {
            console.log('server>socket-chat: ok-del-system-message')
          }
        })
      }
    })
    
    // get chat message
    CMM.getChatMessage(session.user.user, function(e, o){
      if (e) {
        console.log('server>socket-chat: error-get-chat-message '+ e);
      } else {
        console.log('server>socket-chat: ok-get-chat-message~');
        io.sockets.socket(users[session.user.user].socket).emit("get-chat-message", o);
        // delete chat message
        CMM.delChatMessage(session.user.user, function(e){
          if(e){
            console.log('server>socket-chat: error-del-chat-message '+e)
          } else {
            console.log('server>socket-chat: ok-del-chat-message')
          }
        })
      }
    })
    
    // get user data
    function getAccountData(){
      AM.getAccountData(session.user.user, function(e, o){
        if (e) {
          console.log('server>socket-chat: get-account-data '+ e);
        } else {
          console.log('server>socket-chat: get-account-data OK');
          io.sockets.socket(users[session.user.user].socket).emit("send-account-data", o);
        }
      })
    }
    
    socket.on('get-account-data', function(){
      getAccountData();
    })
    
    // create group, chaters join group chat
    socket.on('create-group', function(data){
      var _chatId = SAH.saltAndHash(data.grouptitle);
      data.chatid = _chatId;
      AM.addNewGroup(data, function(e, o){
        console.log(o);
        socket.emit('create-group-success', o);
      })
    })
    
    // send comm message
    socket.on('send-realtime-message', function(data){
      // save chat message for offline user
      for(var i=0; i<data.chaters.length; i++){
        if(data.chaters[i] in users){
          io.sockets.socket(users[data.chaters[i]].socket).join(data.chatid);
        } else {
          console.log('server > socket-chat : user is no online '+data.chaters[i])
          CMM.setChatMessage(data, function(){
            console.log('server > socket-chat: set chat message done~');
          })
        }
      }
      // send chat message for online user
      console.log("Sending: " + data.message + " to " + data.chatid);
      socket.broadcast.to(data.chatid).emit("get-realtime-message", data);
      io.sockets.socket(users[data.sendmessageuser].socket).emit("get-realtime-message", data);
    })
    
    socket.on('disconnect', function(){
      delete users[session.user.user];
      console.log('server>socket-chat: socket disconnect user '+session.user.user);
    })
    
    socket.on('add-friend', function(data){
      if (data.getmessageuser in users){
        console.log("server>socket-chat: add: " + data.getmessageuser); 
        io.sockets.socket(users[data.getmessageuser].socket).emit("add-friend", data);
      } else {
        console.log("server>socket-chat: User does not online: " + data.getmessageuser); 
        // set system message
        SMM.setSystemMessage(data, function(){
          console.log('server>socket-chat: set system message done~');
        })
      }
    })
    
    socket.on('response-add-friend', function(data){
      // create chat id
      var _str = data.requireuser > data.responseuser ? (data.requireuser+data.responseuser) : (data.responseuser+data.requireuser);
      var _chatId = SAH.saltAndHash(_str);
      data.chatid = _chatId;
      data.chaters = [data.requireuser, data.responseuser]
      // save add friend
      AM.addNewFriend(data, function(e, responseUserData, requireUser){
        if (e) {
          console.log('server>socket-chat: error-response-add-friend');
        } else {
          console.log('server>socket-chat: ok-response-add-friend '+responseUserData.user);
          io.sockets.socket(users[requireUser].socket).emit("response-add-friend-success", {
            type : 'comm',
            message : 'add '+ responseUserData.user +' success~'
          });
          io.sockets.socket(users[responseUserData.user].socket).emit("response-add-friend-success", {
            type : 'comm',
            message : 'add '+ requireUser +' success~'
          });
        }
      })
    })
    
  })
};
