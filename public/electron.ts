// public/electron.ts
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import isDev from "electron-is-dev";

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// robotjs 타입 선언
interface RobotJS {
  moveMouse(x: number, y: number): void;
  getMousePos(): { x: number; y: number };
  getScreenSize(): { width: number; height: number };
  keyTap(key: string, modifier?: string | string[]): void;
}

let robot: RobotJS;

// robotjs를 동적으로 로드
async function initRobot(): Promise<void> {
  try {
    const robotModule = await import("robotjs");
    robot = robotModule.default || robotModule;
    console.log("robotjs 로드 완료");
  } catch (error) {
    console.error("robotjs 로드 실패:", error);
    // robotjs가 로드되지 않으면 더미 객체로 대체
    robot = {
      moveMouse: (x: number, y: number) =>
        console.log(`마우스 이동 시뮬레이션: (${x}, ${y})`),
      getMousePos: () => ({ x: 0, y: 0 }),
      getScreenSize: () => ({ width: 1920, height: 1080 }),
      keyTap: (key: string, modifier?: string | string[]) =>
        console.log(
          `키 입력 시뮬레이션: ${key}${modifier ? ` + ${modifier}` : ""}`
        ),
    };
  }
}

let mainWindow: BrowserWindow | null;
let isMovingMouse = false;
let cursorOverlay: BrowserWindow | null = null;
let isCustomCursorActive = false;

// 마우스를 원형 궤적으로 움직이는 함수
function moveMouseInCircle(
  centerX: number,
  centerY: number,
  radius: number,
  duration: number = 3000
): void {
  if (isMovingMouse) {
    console.log("이미 마우스가 움직이는 중입니다.");
    return; // 이미 움직이고 있으면 중복 실행 방지
  }

  console.log(
    `마우스 원형 움직임 시작: 중심(${centerX}, ${centerY}), 반지름: ${radius}, 지속시간: ${duration}ms`
  );
  isMovingMouse = true;
  const startTime = Date.now();
  let frameCount = 0;

  const animate = () => {
    if (!isMovingMouse) {
      console.log("마우스 움직임이 중지되었습니다.");
      return;
    }

    const elapsed = Date.now() - startTime;
    const progress = (elapsed % duration) / duration; // 0~1 사이의 진행률
    const angle = progress * 2 * Math.PI; // 0~2π 사이의 각도

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    robot.moveMouse(Math.round(x), Math.round(y));

    frameCount++;
    if (frameCount % 50 === 0) {
      // 1초마다 로그
      console.log(
        `마우스 위치: (${Math.round(x)}, ${Math.round(y)}), 진행률: ${(
          progress * 100
        ).toFixed(1)}%`
      );
    }

    if (elapsed < duration) {
      setTimeout(animate, 20); // 50fps로 업데이트
    } else {
      isMovingMouse = false;
      console.log("마우스 원형 궤적 완료!");
      mainWindow?.webContents.send("mouse-movement-complete");
    }
  };

  animate();
}

// 커스텀 커서 오버레이 창 생성
function createCursorOverlay(): void {
  if (cursorOverlay) return;

  cursorOverlay = new BrowserWindow({
    width: 32,
    height: 32,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // 커서 HTML 로드
  cursorOverlay.loadURL(`data:text/html;charset=utf-8,
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          background: transparent;
          overflow: hidden;
          cursor: none;
        }
        .cursor {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: radial-gradient(circle, #ff6b6b, #ee5a24);
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          animation: pulse 1s infinite;
        }
        .cursor.arrow {
          background: linear-gradient(45deg, #4ecdc4, #44a08d);
          border-radius: 0;
          transform: rotate(45deg);
          clip-path: polygon(0 0, 100% 0, 50% 100%);
        }
        .cursor.rainbow {
          background: conic-gradient(red, orange, yellow, green, blue, indigo, violet, red);
          animation: spin 2s linear infinite, pulse 1s infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div id="cursor" class="cursor"></div>
    </body>
    </html>
  `);
}

// 커스텀 커서 업데이트
function updateCursorPosition(): void {
  if (!cursorOverlay || !isCustomCursorActive) return;

  const mousePos = robot.getMousePos();
  cursorOverlay.setPosition(mousePos.x - 12, mousePos.y - 12);
}

// 커스텀 커서 활성화
function enableCustomCursor(cursorType: string = "default"): void {
  if (!cursorOverlay) createCursorOverlay();

  isCustomCursorActive = true;
  mainWindow?.webContents.executeJavaScript(`
    document.body.style.cursor = 'none';
  `);

  // 커서 타입 변경
  cursorOverlay?.webContents.executeJavaScript(`
    const cursor = document.getElementById('cursor');
    cursor.className = 'cursor ${cursorType}';
  `);

  cursorOverlay?.show();

  // 마우스 위치 추적 시작
  const updateInterval = setInterval(() => {
    if (!isCustomCursorActive) {
      clearInterval(updateInterval);
      return;
    }
    updateCursorPosition();
  }, 16); // 60fps
}

// 커스텀 커서 비활성화
function disableCustomCursor(): void {
  isCustomCursorActive = false;

  if (cursorOverlay) {
    cursorOverlay.hide();
  }

  mainWindow?.webContents.executeJavaScript(`
    document.body.style.cursor = 'default';
  `);
}

// IPC 이벤트 핸들러 설정
function setupIpcHandlers(): void {
  // 테스트용 핸들러 추가
  ipcMain.handle("test-robotjs", () => {
    console.log("=== robotjs 테스트 시작 ===");
    try {
      const currentPos = robot.getMousePos();
      console.log("현재 마우스 위치:", currentPos);

      const screenSize = robot.getScreenSize();
      console.log("화면 크기:", screenSize);

      // 현재 위치에서 10픽셀 오른쪽으로 이동 테스트
      robot.moveMouse(currentPos.x + 10, currentPos.y);
      console.log("마우스를 10픽셀 오른쪽으로 이동했습니다.");

      // 원래 위치로 복귀
      setTimeout(() => {
        robot.moveMouse(currentPos.x, currentPos.y);
        console.log("마우스를 원래 위치로 복귀했습니다.");
      }, 500);

      return { success: true, message: "robotjs 테스트 완료!" };
    } catch (error) {
      console.error("robotjs 테스트 실패:", error);
      return { success: false, message: "robotjs 테스트 실패: " + error };
    }
  });

  ipcMain.handle("start-circle-movement", () => {
    console.log("=== 원형 궤적 시작 요청 받음 ===");

    try {
      const screenSize = robot.getScreenSize();
      console.log("화면 크기:", screenSize);

      const centerX = screenSize.width / 2;
      const centerY = screenSize.height / 2;
      const radius = 100;

      console.log(
        `원형 궤적 설정: 중심(${centerX}, ${centerY}), 반지름: ${radius}`
      );

      moveMouseInCircle(centerX, centerY, radius, 5000); // 5초 동안 원 그리기
      return {
        success: true,
        message: "마우스가 원형 궤적을 그리기 시작했습니다!",
      };
    } catch (error) {
      console.error("원형 궤적 시작 실패:", error);
      return {
        success: false,
        message: "원형 궤적 시작 실패: " + error,
      };
    }
  });

  ipcMain.handle("stop-mouse-movement", () => {
    isMovingMouse = false;
    return { success: true, message: "마우스 움직임이 중지되었습니다." };
  });

  ipcMain.handle("get-mouse-position", () => {
    return robot.getMousePos();
  });

  // 볼륨 업
  ipcMain.handle("volume-up", () => {
    console.log("볼륨 업 요청");
    try {
      robot.keyTap("audio_vol_up");
      return { success: true, message: "볼륨을 올렸습니다!" };
    } catch (error) {
      console.error("볼륨 업 실패:", error);
      return { success: false, message: "볼륨 업 실패: " + error };
    }
  });

  // 볼륨 다운
  ipcMain.handle("volume-down", () => {
    console.log("볼륨 다운 요청");
    try {
      robot.keyTap("audio_vol_down");
      return { success: true, message: "볼륨을 내렸습니다!" };
    } catch (error) {
      console.error("볼륨 다운 실패:", error);
      return { success: false, message: "볼륨 다운 실패: " + error };
    }
  });

  // 음소거 토글
  ipcMain.handle("volume-mute", () => {
    console.log("음소거 토글 요청");
    try {
      robot.keyTap("audio_mute");
      return { success: true, message: "음소거를 토글했습니다!" };
    } catch (error) {
      console.error("음소거 실패:", error);
      return { success: false, message: "음소거 실패: " + error };
    }
  });

  // 커스텀 커서 활성화
  ipcMain.handle("enable-custom-cursor", (event, cursorType: string) => {
    console.log(`커스텀 커서 활성화 요청: ${cursorType}`);
    try {
      enableCustomCursor(cursorType);
      return { success: true, message: `${cursorType} 커서를 활성화했습니다!` };
    } catch (error) {
      console.error("커스텀 커서 활성화 실패:", error);
      return { success: false, message: "커스텀 커서 활성화 실패: " + error };
    }
  });

  // 커스텀 커서 비활성화
  ipcMain.handle("disable-custom-cursor", () => {
    console.log("커스텀 커서 비활성화 요청");
    try {
      disableCustomCursor();
      return { success: true, message: "기본 커서로 복원했습니다!" };
    } catch (error) {
      console.error("커스텀 커서 비활성화 실패:", error);
      return { success: false, message: "커서 복원 실패: " + error };
    }
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      devTools: isDev,
    },
  });

  // ***중요***
  mainWindow.loadURL(
    isDev
      ? "http://localhost:5173"
      : `file://${path.join(__dirname, "../build/index.html")}`
  );

  // 개발자 도구 자동 시작 비활성화
  // if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });

  mainWindow.setResizable(true);
  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });
  mainWindow.focus();
}

app.on("ready", async () => {
  await initRobot();
  createWindow();
  setupIpcHandlers();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
