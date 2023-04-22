
new Vue({
  el: "#app",
  template: `
    <div>
      <p v-for="message in messages">{{ message }}</p>
      <input v-model="username" @keyup.enter="join" />
    </div>
  `,
  data() {
    return {
      socket: null,
      messages: [],
      username: "",
    };
  },
  mounted() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const host = location.hostname;
    const path = "/";
    const port = "8080";
    const websocketUrl = `${protocol}//${host}:${port}${path}`;
    // WebSocketの初期化
    this.socket = new WebSocket(websocketUrl);
    // WebSocketイベントハンドラの設定
    this.socket.onopen = () => {
      console.log("WebSocket connection established.");
    };
    this.socket.onmessage = (event) => {
      //this.messages.push(event.data);
      console.log(event.data);
    };
    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    this.socket.onclose = () => {
      console.log("WebSocket connection closed.");
    };
  },
  methods: {
    join() {
      // JOIN時には自分の名前だけを送る
      console.log("join")
      const message = {
        type: "join",
        message: {
          user: this.username
        }
      }
      console.log("join event message", JSON.stringify(message))
      this.socket.send(JSON.stringify(message))
    },
    // なにか起きたときは必ず全体にその状況を撒く
    sendEvent() {
      this.socket.send(this.json);
    }
  },
});