import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket Connected:", socket.id);
    
    socket.on("join-call", (path) => {
      console.log("Join Call:", path);
      if(connections[path] === undefined) {
        connections[path] = [];
      }
      if (!connections[path].includes(socket.id)) {
        connections[path].push(socket.id);
      }

      timeOnline[socket.id] = new Date();

      const clients = [...connections[path]];

      connections[path].forEach((clientId) => {
          io.to(clientId).emit("user-joined", socket.id, clients);
      });

      // ✅ FIX: Chat history emitting block removed completely from here. 
      // New users joining will not automatically see old messages or open the panel.
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
      console.log("Signal:", socket.id, "->", toId);
    });

    socket.on("chat-message", (data, sender) => {
      const [matchingRoom, found] = Object.entries(connections)
      .reduce(([room, found], [roomKey, RoomValue]) => {
        if(!found && RoomValue.includes(socket.id)){
          return [roomKey, true];
        }
        return [room, found];
      }, [null, false]);

      if(found === true){
        if(messages[matchingRoom] === undefined){
          messages[matchingRoom] = [];
        }

        const messagePacket = {
          data,
          sender,
          "socket-id-sender": socket.id,
          seenBy: [socket.id]
        };

        messages[matchingRoom].push(messagePacket);
        console.log("Message ", matchingRoom , ":", sender, data);

        connections[matchingRoom].forEach((elem) => {
          io.to(elem).emit("chat-message", messagePacket);
        });
      }
    });

    socket.on("disconnect", () => {
      var diffTime = Math.abs(timeOnline[socket.id] - new Date());
      var key = Object.keys(connections).find(k => connections[k].includes(socket.id));

      for(const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))){
        for(let a = 0; a < v.length; a++){
          if(v[a] === socket.id){
            key = k;

            for(let a = 0; a < connections[key].length; a++){
              io.to(connections[key][a]).emit("user-left", socket.id);
            }

            var index = connections[key].indexOf(socket.id);
            connections[key].splice(index, 1);
            
            if(connections[key].length === 0){
              delete connections[key];
              // message deletion
              if (messages[key]) {
                delete messages[key];
                console.log(`Chat room cleared for path: ${key}`);
              }
            }
          }
        }
      }
    });
  });
  return io;
};

export default connectToSocket;