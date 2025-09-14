// public/preload.js
const { contextBridge, ipcRenderer } = require("electron");

// 렌더러 프로세스에서 사용할 수 있는 API를 안전하게 노출
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, listener) => {
      ipcRenderer.on(channel, listener);
    },
    removeListener: (channel, listener) => {
      ipcRenderer.removeListener(channel, listener);
    },
  },
});
