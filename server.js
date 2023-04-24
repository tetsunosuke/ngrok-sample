const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const express = require("express");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const playerCount = 3;

// 設定関連
const config = {
  port: 8080,
  cards: {
    1: { color: "R", weight: 2 },
    2: { color: "B", weight: 0 },
    3: { color: "Y", weight: 2 },
    4: { color: "G", weight: 0 },
    5: { color: "Y", weight: 1 },
    6: { color: "B", weight: 2, name: "天文学者" },
    7: { color: "G", weight: 3 },
    8: { color: "R", weight: 3 },
    9: { color: "Y", weight: 3, name: "奇術師" },
    10: { color: "G", weight: 0, name: "農夫" },
    11: { color: "R", weight: 0, name: "牧師" },
    12: { color: "B", weight: 1 },
    13: { color: "G", weight: 1 },
    14: { color: "R", weight: 2 },
    15: { color: "Y", weight: 0 },
    16: { color: "B", weight: 2 },
    17: { color: "R", weight: 1 },
    18: { color: "B", weight: 3 },
    19: { color: "Y", weight: 0 },
    20: { color: "G", weight: 2 },
    21: { color: "B", weight: 1 },
    22: { color: "Y", weight: 1 },
    23: { color: "G", weight: 0 },
    24: { color: "R", weight: 3 },
    25: { color: "Y", weight: 1 },
    26: { color: "G", weight: 3 },
    27: { color: "R", weight: 0 },
    28: { color: "B", weight: 3 },
    29: { color: "G", weight: 1 },
    30: { color: "R", weight: 1 },
    31: { color: "B", weight: 0 },
    32: { color: "Y", weight: 2 },
    33: { color: "R", weight: 2 },
    34: { color: "B", weight: 2 },
    35: { color: "G", weight: 2 },
    JOKER: { color: null, weight: 0 },
  },

};

const loadConfig = (playersCount) => {
  if (typeof playersCount === "undefined") {
    playersCount = 4
  }

  switch(playersCount) {
    case 3:
      config.maxWeight = 4
      config.colors = ["R", "G", "B"]
      break;
    
    default:
      config.colors = ["R", "G", "B", "Y"]
      config.maxWeight =  5
      break;
  }
  config.players = config.colors.length;
}

/**
 * 
 * @param {*} array 
 * @returns 
 */
const shuffle = (array) => {
  return array.sort(() => Math.random() - 0.5);
};

// 静的ファイルを配信するルート
app.use(express.static("public"));
// player数などを変更可能に
loadConfig(playerCount);

// サーバ側では接続してきたクライアント情報はすべてここに集約して管理する
// それぞれの要素のclientの中にuuid, usernameなどを詰め込みます
const clients = [];
const serverData = {
  mode: "waiting",
  disposed: [],
  config: config,
  result: [],
};


// WebSocketサーバーの処理
wss.on("connection", (socket) => {
  console.log("WebSocket connection established");
  const uuid = uuidv4();
  socket.uuid = uuid;

  // 接続してきたクライアントをリストに追加
  clients.push(socket);

  socket.on("message", (message) => {
    let json = {};
    try {
      json = JSON.parse(message);
    } catch (e) {
      json = {};
    }

    //console.info("Received message:", json);

    // メッセージを受け取ったらそれごとに処理。
    // eventを見る。JOINとかカード選択とか。
    switch (json.type) {
      case "joinRequest":
        onJoin(clients, socket, json);
        break;
      case "connectRequest":
        onConnect(clients, socket, json);
        break;
      case "notifyRequest":
        onNotify(clients, socket, json);
        break;
      case "selectCardRequest":
        onSelectCard(clients, socket, json);
        break;
      case "resetRequest":
        onReset(clients, socket, json);
        break;
      default:
        console.log(json.type)
        break;
    }
  });

  socket.on("close", () => {
    // 切断したクライアントはUUIDベースでclientsから削除する
    clients.splice(clients.indexOf(socket), 1);
    console.log("WebSocket connection closed.", clients.length);
    // 誰かが切断したことを通知する
    // サーバから通知が来たのでリフレッシュをかけさせる
    clients.forEach((client) => {
      const message = {
        type: "notify",
        message: "refresh(someone is disconnected)",
        data: {
          clients: clients,
          mode: "waiting"
        }
      };
      try {
        client.send(JSON.stringify(message));
      } catch(e) {
        console.error(e);
      }
    });
  });
});

/**
 * 
 * @param {*} clients 
 * @param {*} socket 
 * @param {*} json 
 */
const onNotify = (clients, socket, json) => {
  const clientsInfo = getClientsInfo(clients)
  // サーバから通知が来たのでリフレッシュをかけさせる
  clients.forEach((client) => {
    const message = {
      type: "notify",
      message: "refresh(by server notification)",
      data: {
        clients: clientsInfo,
        serverData: serverData,
      }
    };
    client.send(JSON.stringify(message));
  });
};

/**
 * 
 * @param {*} clients 
 * @param {*} socket 
 * @param {*} json 
 */
const onSelectCard = (clients, socket, json) => {
  serverData.mode = "playing"

  const clientsInfo = getClientsInfo(clients)

  // 選択されたカード番号
  let number = json.data.card.number;
  const players = clients.filter( (client) => {
    return typeof client.user !== "undefined"
  })
  serverData.turn = json.data.serverData.turn + 1;
  serverData.round = calculateRound(serverData.turn, players)
  // ここまでで使われたデータをもとにここから先の細かいロジックを詰めていく
  serverData.result = []

  const playerIndex = players.findIndex( (client) => client.uuid === socket.uuid)

  // 最初のラウンドだけは特殊。捨てられたカードの無視と、JOKER保有者がそれを必ず捨てるようにする
  if(serverData.turn - 1 <= players.length) {
    // 送信してきた人のsocket.uuidから、その人がJOKERを持っているか調べる
    const jokerIndex = json.data.serverData.shuffledCards[playerIndex].findIndex((card) => card.number === 'JOKER')
    // JOKERを所有する人がいたらその人はそれをふせないといけない
    if (jokerIndex !== -1) {
      number = "JOKER"
    }
  }
  const card = turnProcess(number, playerIndex, json, players);
  // ラウンドの処理
  roundProcess(players);

  // serverData.resultをもとにスコアの集計を行う
  // すべての残りのカードの枚数を調べプレーヤー数と同じになったら投票開始
  allLengthProcess(players);

  const message = {
    type: "notify",
    message: `${json.data.card.number} played`,
    data: {
      clients: clientsInfo,
      selected: card,
      serverData: serverData
    },
  };
  // console.log("notify from server", serverData)
  // 全体に通知
  notifyAll(clients, message)
}

// 次のプレーヤー算出。配列の次の値ではあるが、循環したら先頭に戻る
const getNextPlayerIndex = (index, playersLength) => {
  // プレーヤー分の配列を作成する
  const arr = [...Array(playersLength)].map((_, i) => i) 
  const i = arr[arr.findIndex((n) =>  n === index)+1]
  if (typeof i === "undefined") {
    return 0
  }

  return i
}

/**
 * 
 * @param {*} clients 
 * @param {*} socket 
 * @param {*} json 
 */
const onConnect = (clients, socket, json) => {
  serverData.mode = "waiting"
  serverData.turn = 0
  const clientsInfo = getClientsInfo(clients)
  const message = {
    type: "connectResponse",
    message: `socket.uuid=${socket.uuid}, total clients: ${clients.length}`,
    data: {
      uuid: socket.uuid,
      clients: clientsInfo,
      serverData: serverData
    },
  };
  // まずは自身のUUIDを教える
  socket.send(JSON.stringify(message));

  message.type = "notify";
  // 全体に通知
  notifyAll(clients, message)
};

const onReset = (clients, socket, json) => {
  serverData.mode = "waiting"
  let clientsInfo = getClientsInfo(clients);
  const players = clients.filter( (client) => {
    return typeof client.user !== "undefined"
  })

  if ( typeof json.data.playerCount !== "undefined") {
    loadConfig(json.data.playerCount)
  }

  data = getInitServerData(players);
  serverData.mode = data.mode;
  serverData.turn = data.turn;
  serverData.round = data.round;
  serverData.nextPlayerIndex = data.nextPlayerIndex;
  serverData.shuffledCards = data.shuffledCards;
  serverData.hasJokerPlayerIndex = data.hasJokerPlayerIndex;
  serverData.players = data.players;
  serverData.disposed = data.disposed;
  server.gameResult = data.gameResult;


  // 接続中の全クライアントに通知
  const message = {
    type: "notify",
    message: `reset requested, socket.uuid=${socket.uuid}, total clients: ${clients.length}`,
    data: {
      clients: clientsInfo,
      serverData: serverData
    },
  };
  notifyAll(clients, message)  

}

/**
 * ユーザが参加したとき
 * @param {*} clients
 * @param {*} socket
 * @param {*} json
 */
const onJoin = (clients, socket, json) => {
  serverData.mode = "waiting";
  socket.user = { name: json.message.user };

  let clientsInfo = getClientsInfo(clients);
  const players = clients.filter( (client) => {
    return typeof client.user !== "undefined"
  })

  // 自分がJOINしたときにユーザ数がいっぱいになったらステータスをstartにする
  // その際にゲームの初期情報としてのカードを渡す
  if (players.length >= config.players) {
    data = getInitServerData(players);
    serverData.mode = data.mode;
    serverData.turn = data.turn;
    serverData.round = data.round;
    serverData.nextPlayerIndex = data.nextPlayerIndex;
    serverData.shuffledCards = data.shuffledCards;
    serverData.hasJokerPlayerIndex = data.hasJokerPlayerIndex;
    serverData.players = data.players;
    serverData.disposed = data.disposed;
    server.gameResult = data.gameResult;
  }

  // 接続中の全クライアントに通知
  const message = {
    type: "notify",
    message: `${json.message.user} has joined, socket.uuid=${socket.uuid}, total clients: ${clients.length}`,
    data: {
      clients: clientsInfo,
      serverData: serverData
    },
  };
  notifyAll(clients, message)
};

const calculateRound = (turn, players) => {
  return Math.floor( (turn - 1) / players.length)
}

/**
 * 
 * @param {*} clients 
 * @param {*} message 
 */
const notifyAll = (clients, message) => {
  // 接続中の全クライアントに通知
  clients.forEach((client) => client.send(JSON.stringify(message)));
}

server.listen(config.port, () => {
  console.log(`Server started on port ${config.port}`);
});

const getClientsInfo = (clients) =>  {
  return clients.map((client, index) => {
    return {
      index: index,
      user: client.user,
      uuid: client.uuid,
    };
  });
}

const getInitServerData = (players)  => {
  const data = {}
  data.mode = "start";
  data.shuffledCards = [];

  // カードを配るためにサーバ側ですべてシャッフルします
  const sTmp = shuffle(Object.keys(config.cards)).map((index) => {
    config.cards[index].number = index;
    return config.cards[index];
  });
  // シャッフルしたカードをプレーヤーに配ります
  for (let i = 0; i < players.length; i++) {
    data.shuffledCards.push(
      sTmp.slice(i * sTmp.length / players.length, (i + 1) * (sTmp.length / players.length))
    );
  }

  // ゲーム開始に必要な情報をすべて渡します
  data.turn = 0;
  data.nextPlayerIndex = 0;
  data.round = calculateRound(data.turn, players);
  const shuffledColors = shuffle(config.colors);
  data.shuffledColors = shuffledColors
  // 誰がJOKERを持っていたかをplayerIndexとして覚えておく。Playerの情報に詰め込みたい
  data.hasJokerPlayerIndex = data.shuffledCards.findIndex((row) => {
    const index = row.findIndex((item) => item.number === 'JOKER');
    if (index !== -1) {
      return true;
    }
  });
  data.players = players.map( (player, idx) => {
    return {
      uuid: player.uuid,
      playerName: player.user.name,
      hasJoker: idx === data.hasJokerPlayerIndex,
      color: shuffledColors[idx],
      index: idx
    }
  })
  data.disposed = [];
  data.result = [];
  data.gameResult = [];

  return data
}



const turnProcess = (number, playerIndex, json, players) => {
  const card = config.cards[number];
  console.log("played card", card)
  // 誰が捨てたかという情報追加
  card.playerIndex = playerIndex;
  // 選択されたカードを捨てる（＝フィルタして絞ったものを再代入する）
  serverData.shuffledCards[playerIndex] = json.data.serverData.shuffledCards[playerIndex].filter(card => card.number !== number);
  serverData.disposed.push(card);
  // 捨てられたカードの中からこのラウンドで捨てられたものを抽出
  if (serverData.round < 1) {
    serverData.thisTurn = {};
  } else {
    serverData.thisTurn = serverData.disposed.slice((serverData.round) * players.length, (serverData.round) * (players.length + 1) + 1);
  }
  return card;
}

const  roundProcess = (players) => {
  const cards = [];
  if (serverData.round > 0) {
    for (let i = 1; i < serverData.round; i++) {
      // そのラウンドで出されたカード
      cards[i - 1] = serverData.disposed.slice(i * players.length, (i + 1) * players.length);
      // 次はトリックを取ったプレーヤーからゲームがスタートする
      let trickPlayerIndex = calcTrick(cards, i, players);

      // 誰がそのターンでトリックを取ったかなどを把握する
      serverData.result[i - 1] = {
        cards: cards[i - 1],
        weight: cards[i - 1].map((card) => config.cards[card.number].weight).reduce((sum, element) => sum + element, 0),
        trickPlayerIndex: trickPlayerIndex
      };
    }
    // どの人が何枚取ったか: trickPlayerIndex に対して何枚なのか
    calcOwned();

    serverData.nextPlayerIndex = roundNextPlayerIndex(players);
  } else {
    // 最初のラウンドなので循環させずに普通に加算する
    serverData.nextPlayerIndex = getNextPlayerIndex(serverData.nextPlayerIndex, players.length);
  }
}

const calcOwned = () => {
  serverData.owned = serverData.result.map((result) => {
    return {
      trickPlayerIndex: result.weight >= config.maxWeight ? -1 : result.trickPlayerIndex,
      cards: result.cards
    };
  }).reduce((acc, cur) => {
    if (!acc[cur.trickPlayerIndex]) {
      acc[cur.trickPlayerIndex] = 0;
    }
    acc[cur.trickPlayerIndex] += cur.cards.length;
    return acc;
  }, {});
}

const roundNextPlayerIndex = (players) => {
  if (serverData.result.length > 0) {
    if (serverData.disposed.length % players.length === 0) {
      // ターンが終わったので前回トリックをとったプレーヤーが次のスタートとなる
      return serverData.result[serverData.result.length - 1].trickPlayerIndex;
    }
  }
  // 次のプレーヤー
  return getNextPlayerIndex(serverData.nextPlayerIndex, players.length);
}

const  calcTrick = (cards, i, players) => {
  let trickPlayerIndex = -1;
  // そのターンはまだ終わっていない
  if (cards[i-1].length < players.length) {
    if (i-2 >= 0) {
      return cards[i-2].trickPlayerIndex;
    } else {
      return 0;
    }
  }

  // 全員が出し揃ったのでトリックを決定する
  trickPlayerIndex = cards[i - 1].reduce((acc, curr) => {
    return curr.number - 0 > acc.maxNumber
      ? { maxNumber: curr.number - 0, playerIndex: curr.playerIndex }
      : acc;
  }, { maxNumber: -1, playerIndex: -1 }).playerIndex;
  if (trickPlayerIndex < 0) {
    return 0;
  }  

  return trickPlayerIndex;
}

const allLengthProcess = (players) => {
  const allCardsLength = serverData.shuffledCards.reduce((ac, ci) => { return ac + ci.length; }, 0);
  if (allCardsLength === players.length) {
    serverData.mode = "vote";
    // 投票の結果が {"B": 1, "R": 2} の ように得られる。
    // ここから最も大きな数字を持つ色が投票されたことになる
    const voted = serverData.shuffledCards.reduce((ac, ci) => { ac.push(ci[0].color); return ac; }, []).reduce((acc, curr) => {
      if (typeof acc[curr] == 'undefined') {
        acc[curr] = 1;
      } else {
        acc[curr] += 1;
      }
      return acc;
    }, {});

    // 投票結果に応じて追放を行う。なお、maxVotedが長さ２以上になった場合、ランダムに決定して良い
    const tmp = shuffle(Object.keys(voted).filter(key => voted[key] === Math.max(...Object.values(voted))));
    serverData.maxVoted = serverData.players[serverData.players.findIndex((player) => player.color === tmp[0])];
    const copied = serverData.owned;

    // TODO: 利用されていない色が投票されたときの処理がしくじってるので修正する
    let expelled;
    if (typeof serverData.maxVoted === "undefined") {
      serverData.maxVoted = {index: -1}
    } else {
      // 追放されたユーザのデータを消す
      expelled = serverData.owned[serverData.maxVoted.index];
      delete serverData.owned[serverData.maxVoted.index];
    }

    // 追放されたデータを除いてすべてのスコアを計算する
    // すべて・市民の獲得数・除外された数
    // ジョーカーの人の取得数・追放された人の取得数
    serverData.gameResult = {
      citizen: Object.keys(serverData.owned).filter(key => ((key - 0 !== serverData.hasJokerPlayerIndex))).filter(key => key !== "-1").reduce((acc, val) => acc + serverData.owned[val], 0),
      stored: Object.keys(copied).filter(key => ((key === "-1"))).reduce((acc, val) => acc + copied[val], 0),
      joker: typeof serverData.owned[serverData.hasJokerPlayerIndex] !== 'undefined' ? serverData.owned[serverData.hasJokerPlayerIndex] : 0,
      expelled: typeof expelled !== "undefined" ? expelled : 0,
      // 捨てカード、投票カードを除く全てのカードの枚数
      all: Object.keys(config.cards).length - serverData.players.length * 2,
    };
    console.log("gameResult", serverData.gameResult);
  }
}