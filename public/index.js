const app = Vue.createApp({
  el: "#app",
  template: `
  <div>
  <!--
  <h1 class="h5">
    debug: mode：{{serverData.mode}} 接続しているPlayer：{{playerIndex}}
  </h1>
  <h2 class="h6">
    ターンのプレイヤー{{serverData.nextPlayerIndex}}, JOKER:
    {{serverData.hasJokerPlayerIndex}}
  </h2>
  -->
  <div class="container text-center">
    <p
      v-show="playerIndex && (serverData.hasJokerPlayerIndex == playerIndex)"
      class="alert alert-warning"
    >
      あなたがJOKERです
    </p>
    <div>
      <div v-if="serverData.mode=='start'">
        <!-- 参加者の情報 -->
        <p>
          <span v-for="(player, index) in serverData.players" :key="index">
            <span
              v-if="index == serverData.nextPlayerIndex"
              class="btn font-weight-bold text-light border border-dark border-2"
              :class="cardColor(player.color)"
              >{{player.playerName}}</span
            >
            <span
              v-if="!(index == serverData.nextPlayerIndex)"
              class="btn font-weight-bold text-light"
              :class="cardColor(player.color)"
              >{{player.playerName}}</span
            >
            <span v-if="index < players.length - 1">
              <i class="bi bi-arrow-right"></i>
            </span>
          </span>
        </p>
        <!-- 自分のターンの場合だけ表示する -->
        <div v-show="(playerIndex == serverData.nextPlayerIndex)">
          <h4 class="alert alert-info" v-if="serverData.turn <= players.length">
            最初のカードを伏せてください
          </h4>
          <p v-if="playerIndex==serverData.hasJokerPlayerIndex">
            あなたはJOKERなので何をクリックしてもJOKERを伏せます
          </p>
        </div>
        <p
          class="btn text-light"
          :class="cardColor(serverData.players[playerIndex].color)"
        >
          あなた({{user}})の色
        </p>
        <div class="row row-cols-3 g-3">
          <div v-for="card in playerHands" class="card">
            <div
              class="card-body"
              :class="cardColor(card.color)"
              @click="(playerIndex == serverData.nextPlayerIndex) && handleCardClick(card)"
            >
              <h5 class="card-text text-light">
                <i
                  v-for="n in card.weight"
                  :key="n"
                  class="fa-solid fa-bomb"
                ></i>
              </h5>
              <h3 class="card-title text-light">{{card.number}}</h3>
            </div>
          </div>
        </div>
      </div>

      <div v-if="serverData.mode=='playing'">
        <!-- 自分のターンの場合だけ表示する -->
        <p
          v-show="serverData.nextPlayerIndex==playerIndex"
          class="alert alert-info"
        >
          あなたの番です
        </p>

        <table class="table">
          <thead>
            <tr>
              <th scope="col">ラウンド</th>
              <th scope="col">数字</th>
              <th scope="col">爆弾</th>
              <th>トリック</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(result, index) in serverDataResult" :key="index">
              <th scope="row">{{index+1}}</th>
              <td>
                <span
                  class="btn"
                  v-for="(card, idx) in result.cards"
                  :key="idx"
                  :class="borderColor(serverData.players[card.playerIndex].color)"
                  >{{card.number}}({{serverData.config.cards[card.number].weight}})</span
                >
              </td>
              <td>{{result.weight}}</td>
              <td>
                <span
                  class="btn text-light"
                  :class="cardColor(serverData.players[result.trickPlayerIndex].color)"
                  >{{players[result.trickPlayerIndex].user.name}}</span
                >
                <span
                  v-if="result.weight >= serverData.config.maxWeight"
                  class="btn text-light bg-info"
                  >JOKER</span
                >
              </td>
            </tr>
            <tr>
              <th scope="row">このラウンド</th>
              <td>
                <span
                  class="btn"
                  :class="borderColor(serverData.players[card.playerIndex].color)"
                  v-for="(card, index) in serverData.thisTurn"
                  :key="index"
                >
                  {{card.number}}
                  ({{serverData.config.cards[card.number].weight}})
                </span>
              </td>
              <td>?</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <!-- 参加者の情報 -->
        <p>
          <span v-for="(player, index) in players" :key="index">
            <span
              v-if="(index == serverData.nextPlayerIndex)"
              class="btn font-weight-bold text-light border border-dark border-2"
              :class="cardColor(serverData.players[player.index].color)"
              >{{player.user.name}}</span
            >
            <span
              v-if="!(index == serverData.nextPlayerIndex)"
              class="btn font-weight-bold text-light"
              :class="cardColor(serverData.players[player.index].color)"
              >{{player.user.name}}</span
            >
            <span v-if="index < players.length - 1">
              <i class="bi bi-arrow-right"></i>
            </span>
          </span>
        </p>
        <!-- 自分のターンの場合だけ表示する -->
        <div v-show="(playerIndex == serverData.nextPlayerIndex)">
          <h4
            class="alert alert-warning"
            v-if="serverData.turn <= players.length"
          >
            最初のカードを伏せてください
          </h4>
        </div>
        <p
          class="btn text-light"
          :class="cardColor(serverData.players[playerIndex].color)"
        >
          あなた({{user}})の色
        </p>
        <div class="row row-cols-3 g-3">
          <div v-for="card in playerHands" class="card">
            <div
              class="card-body text-light"
              :class="cardColor(card.color)"
              @click="(playerIndex == serverData.nextPlayerIndex) && handleCardClick(card)"
            >
              <h5 class="card-text text-light">
                <i
                  v-for="n in card.weight"
                  :key="n"
                  class="fa-solid fa-bomb"
                ></i>
              </h5>
              <h3 class="card-title text-light">{{card.number}}</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- waiting -->
      <div v-if="serverData.mode=='waiting'">
        <div>
          <p v-show="players.length > 0">他のユーザを待っています...現在集まってるユーザ</p>
          <div class="row row-cols-3 g-3">
            <div v-for="player in players" class="card">
              <div class="card-body">
                <h5 class="card-title">{{player.user.name}}</h5>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!inputUser">
          <form @submit.prevent="handleJoin">
            <div>
              <label for="name" class="form-label">プレーヤー名</label>
              <p>
                <input
                  type="text"
                  class="form-control form-control-lg"
                  id="name"
                  aria-describedby="nameHelp"
                  v-model="user"
                />
              </p>
              <p id="nameHelp" class="form-text">
                参加するプレーヤー名を入れてください
              </p>
              <!--
              <button
                type="submit"
                class="btn btn-secondary"
                @click="randomName()"
              >
                適当な名前を生成して参加
              </button>
              -->
              <button type="submit" class="btn btn-primary">Submit</button>
              </div>
            </form>
        </div>
        <div v-if="inputUser">
          <p>あなたのプレーヤー名: {{ inputUser }}</p>
        </div>
      </div>

      <!-- vote -->
      <div v-if="serverData.mode=='vote'">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">ラウンド</th>
              <th scope="col">数字</th>
              <th scope="col">爆弾</th>
              <th>トリック</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(result, index) in serverDataResult" :key="index">
              <th scope="row">{{index+1}}</th>
              <td>
                <span
                  class="btn"
                  v-for="(card, idx) in result.cards"
                  :key="idx"
                  :class="borderColor(serverData.players[card.playerIndex].color)"
                  >{{card.number}}({{serverData.config.cards[card.number].weight}})</span
                >
              </td>
              <td>{{result.weight}}</td>
              <td>
                <span
                  class="btn text-light"
                  :class="cardColor(serverData.players[result.trickPlayerIndex].color)"
                  >{{players[result.trickPlayerIndex].user.name}}</span
                >
                <span
                  v-if="result.weight >= serverData.config.maxWeight"
                  class="btn text-light bg-info"
                  >JOKER</span
                >
              </td>
            </tr>
          </tbody>
        </table>
        <p>投票を行いました</p>
        <div v-if="serverData.maxVoted.index >= 0">
        <p class="btn text-light" :class="cardColor(serverData.maxVoted.color)">
          {{serverData.maxVoted.playerName}}
        </p>
        <p
          class="alert alert-info"
          v-show="serverData.maxVoted.index == serverData.hasJokerPlayerIndex"
        >
          JOKERだった！
        </p>
        <p
          class="alert alert-info"
          v-show="!(serverData.maxVoted.index == serverData.hasJokerPlayerIndex)"
        >
          JOKERではなかった！
        </p>
        </div>
        <div v-if="serverData.maxVoted.index < 0">
          <p
          class="alert alert-info"
          v-show="!(serverData.maxVoted.index == serverData.hasJokerPlayerIndex)"
          >
          JOKERの投票はされませんでした！
          </p>
        </div>
        <div>
          <div>
            <span class="btn btn-primary" @click="reset()"
              >リセットして次へ</span
            >
          </div>
        </div>
        <p>
          市民陣営：回収＋JOKER={{serverData.gameResult.citizen}} :
          {{serverData.gameResult.stored}} + {{serverData.gameResult.joker}}=
          {{serverData.gameResult.stored+serverData.gameResult.joker}}
        </p>
      </div>
    </div>
  </div>
</div>


  `,
  data() {
    return {
      socket: null,
      messages: [],
      user: null,
      inputUser: "",
      connectedClients: null,
      players: [],
      // サーバ・プレイヤー全体が持つべきデータをすべて保有。多分手持ちカードも
      // 他には場のカードとか、ターン数とか
      serverData: {},
      myUUID: "",
      playerIndex: -1,
    };
  },
  computed: {
    serverDataResult() {
      if (typeof this.serverData.result === "undefined") {
        return []
      }
      // 先頭の伏せたカードだけは表示しない
      return this.serverData.result
    }
  },
  mounted() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const host = location.hostname;
    const port = "8080";
    const path = "/";
    const websocketUrl =
      host === "localhost"
        ? `${protocol}//${host}:${port}${path}`
        : `${protocol}//${host}${path}`;
    // WebSocketの初期化
    this.socket = new WebSocket(websocketUrl);
    // WebSocketイベントハンドラの設定
    this.socket.onopen = () => {
      this.handleOpen();
    };
    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    this.socket.onclose = () => {
      console.log("WebSocket connection closed.");
    };
  },
  methods: {
    // ゲームのリセット
    reset() {
      console.error("リセットした状況の実装")
      this.onReset(serverData.json)
    },
    // 初期接続時
    handleOpen() {
      this.serverData.mode = "waiting";
      // 接続時は現状の接続しているクライアント情報を取得するだけ
      const message = {
        type: "connectRequest",
        message: {},
      };
      this.socket.send(JSON.stringify(message));
    },
    handleMessage(message) {
      const json = JSON.parse(message);
      console.log("handleMessage response from server", json)
      // 主にデバッグ用。返ってきたメッセージの中にserverDataがあれば保持する
      if (typeof json.data.serverData !== "undefined") {
        this.serverData = json.data.serverData;
      }
      // サーバから返ってきたメッセージをなんかする
      const players = json.data.clients.filter((client) => {
        return typeof client.user !== "undefined";
      });
      this.connectedClients = json.data.clients;
      this.players = players;
      switch (json.type) {
        case "notify":
          // 画面のリフレッシュがサーバから要求された
          switch (this.serverData.mode) {
            case "waiting":
              break;
            case "start":
              this.onStart(json.data);
              break;
            case "playing":
              this.onPlaying(json.data)
              break;
            case "vote":
              this.onVote(json.data)
              break;
            default:
              console.error(json.data);
              break;
          }
          // 自分以外のユーザに全通知するためにサーバに通知を送る
          // this.socket.send(JSON.stringify(notifyMessage))
          return;
        case "connectResponse":
          this.myUUID = json.data.uuid;
          this.serverData.turn = 0;
          break;
        default:
          console.error("default", json.type);
          break;
      }
    },
    handleJoin() {
      if (this.user.length === 0) {
        return
      }
      // JOIN時には自分の名前だけを送る
      const message = {
        type: "joinRequest",
        message: {
          user: this.user,
        },
      };
      // TODO: ここからログインしようとしたときに同じ名前があったらリクエストは受けないようにしたい
      this.socket.send(JSON.stringify(message));

      // 入力欄を消して入力した名前に変更する
      this.inputUser = this.user;
    },
    onVote(json) {
      this.serverData = json.serverData;
    },
    // 主な描画を担当
    onPlaying(json) {
      console.info("ゲームプレイ中", "TODO: 前回のラウンドの結果をもとに誰がトリックを取ったかを見て、そのプレーヤーからのスタートとする")
      console.log("直近のラウンドの結果", json.serverData.nextPlayerIndex)
      this.serverData.turn = json.serverData.turn;
      // 何番目のプレーヤーか
      const players = JSON.parse(JSON.stringify(this.players));
      // 自分自身が何番のプレーヤーか
      const playerIndex = players.findIndex((player) => player.uuid === this.myUUID);
      this.playerHands = json.serverData.shuffledCards[playerIndex];
      this.serverData = json.serverData;
      this.playerIndex = playerIndex;
    },
    onStart(json) {
      console.info("ゲームスタート");
      this.turn = 1;
      const players = JSON.parse(JSON.stringify(this.players));
      // 何番目のプレーヤーか
      const playerIndex = players.findIndex((player) => player.uuid === this.myUUID);

      // プレーヤーのカラーカード
      this.playerColor = json.serverData.players[playerIndex];
      
      // プレーヤーのカード
      this.playerHands = json.serverData.shuffledCards[playerIndex];
      this.serverData = json.serverData;
      this.serverData.turn = this.turn;
      this.playerIndex = playerIndex;
      this.serverData.disposed = []
    },
    onReset(json) {
      const message = {
        type: "resetRequest",
        message: "reset requested",
        data: {
          serverData: serverData
        }
      }
      // 自分以外のユーザに全通知するためにサーバに通知を送る
      this.socket.send(JSON.stringify(message))

    },
    cardColor(color) {
      // bgColorに基づいてクラスを切り替える
      switch (color) {
        case "B":
          return "bg-primary";
        case "R":
          return "bg-danger";
        case "Y":
          return "bg-warning";
        case "G":
          return "bg-success";
      }
      return "bg-info";
    },
    borderColor(color) {
      switch (color) {
        case "B":
          return "border-primary";
        case "R":
          return "border-danger";
        case "Y":
          return "border-warning";
        case "G":
          return "border-success";
      }
      return "border-info";

    },
    // カードがクリックされた
    handleCardClick(card) {
      serverData = JSON.parse(JSON.stringify(this.serverData))
      // どのカードがクリックされたか
      console.log("Selected card:", card, card.number);
      const message = {
        type: "selectCardRequest",
        message: "card selected",
        data: {
          card: card,
          serverData: serverData
        }
      }
      // 自分以外のユーザに全通知するためにサーバに通知を送る
      this.socket.send(JSON.stringify(message))
    },
    randomName() {
      const names = [  "夏目",  "鈴木",  "田中",  "佐藤",  "山田",  "伊藤",  "木村",  "渡辺",  "小林",  "中村",  "加藤",  "吉田",  "山本",  "斉藤",  "山口",  "松本",  "井上",  "高橋",  "後藤",  "岡田"]
      this.user = names[Math.floor(Math.random() * names.length)];
    }
  }
});

app.mount("#app");
