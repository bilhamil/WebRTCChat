var socket=io();

function addChatMessage(msg, type = "chat") {
  var node = document.createElement("li");             
  var textnode = document.createTextNode(msg);         
  node.appendChild(textnode); 

  node.classList.add(type);
  
  document.getElementById("messages").appendChild(node);
};

const configuration = {'iceServers': [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.l.google.com:5349" },
  { urls: "stun:stun1.l.google.com:3478" },
  { urls: "stun:stun1.l.google.com:5349" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:5349" },
  { urls: "stun:stun3.l.google.com:3478" },
  { urls: "stun:stun3.l.google.com:5349" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:5349" }],
  iceTransportPolicy: "all"};

const peerConnection = new RTCPeerConnection(configuration);

var dataChannel = null;

var iSentOffer = false;

function setupDataChannel()
{
  //setup data channel events
  dataChannel.onopen =  event => {
    addChatMessage("Data Channel Open!", "debug");
  };

  dataChannel.onmessage = event => {
    addChatMessage("Data Channel: " + event.data, "webrtc");
  };

  dataChannel.addEventListener = event => {
    addChatMessage("Data Channel Closed!", "debug");
  };
}


// Listen for connectionstatechange on the local RTCPeerConnection
peerConnection.addEventListener('connectionstatechange', event => {
  console.log("Connection State: " + peerConnection.connectionState);
  if (peerConnection.connectionState === 'connected') {
    addChatMessage("Peers Connected!", "debug");
  }
});

window.onload = function() {
  var form = document.getElementById("chatForm");
  
  form.onsubmit = function(e) {
    e.preventDefault(); // prevents page reloading
    var messageInput = document.getElementById("m");
    
    //send chat message to the server
    if(dataChannel == null || dataChannel.readyState != "open")
    {
      addChatMessage("Socket.io Message: " + messageInput.value, "websocket");
      socket.emit('chat message', messageInput.value);
    }
    //if data channel open send data through webrtc
    else
    {
      addChatMessage("Data Channel: " + messageInput.value, "webrtc");
      dataChannel.send(messageInput.value);
    }
      
    
    messageInput.value = "";
    return false;
  };

  socket.emit("joinRoom", {roomid:window.location.pathname});

  socket.on('chat message', function(msg){
    addChatMessage("Socket.io Message: " + msg, "websocket");
  });

  socket.on("sendOffer", async msg => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(msg.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("sendAnswer", {answer: answer});

    peerConnection.ondatachannel = function(event) {
      dataChannel = event.channel;
      setupDataChannel();
    };

    peerConnection.addEventListener('icecandidate', event => {
      if (event.candidate) {
          socket.emit("newICE", {candidate: event.candidate});
      }
    });
  });

  socket.on("newICE", async function(msg) {
    if(msg.candidate)
    {
      try {
        console.log("Adding Ice Candidate: " + JSON.stringify(msg.candidate));
        await peerConnection.addIceCandidate(msg.candidate);
      } catch (e) {
          console.error('Error adding received ice candidate', e);
      }
    }
  });
};

async function sendOffer() {
  //setup listener for the answer from the remote peer
  socket.on('sendAnswer', async message => {
      if (message.answer) {
          //set their answer as my remote session description
          const remoteDesc = new RTCSessionDescription(message.answer);
          await peerConnection.setRemoteDescription(remoteDesc);

          //after everything is setup listen for ice candidates
          peerConnection.addEventListener('icecandidate', event => {
            if (event.candidate) {
                //send ice candidate to the remote peer
                socket.emit("newICE", {candidate: event.candidate});
            }
          });
      }
  });

  //create the data channel so it can be added in the offer
  dataChannel = peerConnection.createDataChannel("chatChannel");
  setupDataChannel();

  //create the offer
  const offer = await peerConnection.createOffer({iceRestart:true});
  await peerConnection.setLocalDescription(offer);
  
  //send offer to the remote peer
  socket.emit("sendOffer", {'offer': offer});
  
  iSentOffer = true;
}
