var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

app.get('/:roomid', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
  var room = null;

  socket.on('joinRoom', function(msg){
    room = msg.roomid;
    console.log(socket.id + " joined " + msg.roomid);
    socket.join(msg.roomid);
  });

  //plain websocket messages
  socket.on("chat message", (msg) => {
    socket.to(room).emit("chat message", msg);
  })

  //signalling messages
  socket.on("sendOffer", (msg) => {
    console.log("Got offer: " + JSON.stringify(msg.offer));
    socket.to(room).emit("sendOffer", msg);
  });

  socket.on("sendAnswer", (msg) => {
    console.log("Got answer: " + JSON.stringify(msg.answer));
    socket.to(room).emit("sendAnswer", msg);
  });

  socket.on("newICE", (msg) => {
    console.log("Got new ice candidate: " + JSON.stringify(msg.candidate));
    socket.to(room).emit("newICE", msg);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});