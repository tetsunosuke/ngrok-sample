const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const wsServer = new WebSocket.Server({ port: 8080 });

// サーバ側では接続してきたクライアント情報はすべてここに集約して管理する
// それぞれの要素のclientの中にuuid, usernameなどを詰め込みます
const clients = []

wsServer.on('connection', (socket, req) => {
  const uuid = uuidv4();
  socket.uuid = uuid;

  // 接続してきたクライアントをリストに追加
  clients.push(socket);

  socket.on('message', (message) => {
    let json = {}
    try {
      json = JSON.parse(message);
    } catch (e) {
      json = {};
    }
    console.info("Received message:", json);

    // メッセージを受け取ったらそれごとに処理。
    // eventを見る。JOINとかカード選択とか。
    switch(json.type) {
      case "join":
        onJoin(clients, socket, json);      
        break;
      case "start":
        onStart(clients, socket, json);
        break;
      default:
        play(clients, socket, json);
        break;
    }    
  });
  
  socket.on('close', () => {
    // 切断したクライアントはUUIDベースで？clientsから削除する
    clients.splice(clients.indexOf(socket), 1);
    console.log('WebSocket connection closed.', clients.length);
  });
});


const onStart = (clients, socket, json) => {
  console.log(clients.length, socket.uuid, json);
}

/**
 * ユーザが参加したとき
 * @param {*} clients 
 * @param {*} socket 
 * @param {*} json 
 */
const onJoin = (clients, socket, json) => { 
  socket.username = json.message.user
  // これでUUIDとユーザ名の対応が取れるので表示できるように画面側に返すと良いはず
  // もしユーザ名の上限に達したらゲームスタートモードにして良い
  clients.forEach((client) => {
    console.log(client.username, client.uuid)
  })
  // 入室のメッセージなんかも全員に出すとよいかもしれない
  clients.forEach((client) => {
    // あれ？これだと自分自身にしかUUID送っていないことになるな
    const message = {
      type: "notify-by-server",
      message: json.message.user + "has joined," + socket.uuid + "total clients:" + clients.length
    }
    client.send(JSON.stringify(message))
  });
}




const server = http.createServer((req, res) => {
  let filePath;
  if(req.url === "/") {
    filePath = path.join(__dirname, "/index.html");
  } else {
    filePath = path.join(__dirname, req.url);
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
        contentType = 'image/jpg';
        break;
    }
    
    res.writeHead(200, {'Content-Type': contentType});
    res.end(data);
  });
});






server.listen(3000, () => {
  console.log('Server is listening on port 3000.');
});