import { useState, useEffect } from "react";
import "./App.css";

// Electron IPC 타입 선언
declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
        on: (channel: string, listener: (...args: unknown[]) => void) => void;
        removeListener: (
          channel: string,
          listener: (...args: unknown[]) => void
        ) => void;
      };
    };
  }
}

function App() {
  const [isMoving, setIsMoving] = useState(false);
  const [status, setStatus] = useState("마우스 제어 준비");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // robotjs 테스트
  const testRobotJS = async () => {
    try {
      if (window.electron) {
        const result = (await window.electron.ipcRenderer.invoke(
          "test-robotjs"
        )) as { success: boolean; message: string };
        setStatus(result.message);
        console.log("테스트 결과:", result);
      }
    } catch (error) {
      console.error("robotjs 테스트 실패:", error);
      setStatus("robotjs 테스트 실패");
    }
  };

  // 볼륨 업
  const volumeUp = async () => {
    try {
      if (window.electron) {
        const result = (await window.electron.ipcRenderer.invoke(
          "volume-up"
        )) as { success: boolean; message: string };
        setStatus(result.message);
        console.log("볼륨 업:", result);
      }
    } catch (error) {
      console.error("볼륨 업 실패:", error);
      setStatus("볼륨 업 실패");
    }
  };

  // 볼륨 다운
  const volumeDown = async () => {
    try {
      if (window.electron) {
        const result = (await window.electron.ipcRenderer.invoke(
          "volume-down"
        )) as { success: boolean; message: string };
        setStatus(result.message);
        console.log("볼륨 다운:", result);
      }
    } catch (error) {
      console.error("볼륨 다운 실패:", error);
      setStatus("볼륨 다운 실패");
    }
  };

  // 음소거 토글
  const volumeMute = async () => {
    try {
      if (window.electron) {
        const result = (await window.electron.ipcRenderer.invoke(
          "volume-mute"
        )) as { success: boolean; message: string };
        setStatus(result.message);
        console.log("음소거 토글:", result);
      }
    } catch (error) {
      console.error("음소거 실패:", error);
      setStatus("음소거 실패");
    }
  };

  // 커스텀 커서 활성화
  const enableCustomCursor = async (cursorType: string) => {
    try {
      if (window.electron) {
        const result = (await window.electron.ipcRenderer.invoke(
          "enable-custom-cursor",
          cursorType
        )) as { success: boolean; message: string };
        setStatus(result.message);
        console.log("커스텀 커서 활성화:", result);
      }
    } catch (error) {
      console.error("커스텀 커서 활성화 실패:", error);
      setStatus("커스텀 커서 활성화 실패");
    }
  };

  // 커스텀 커서 비활성화
  const disableCustomCursor = async () => {
    try {
      if (window.electron) {
        const result = (await window.electron.ipcRenderer.invoke(
          "disable-custom-cursor"
        )) as { success: boolean; message: string };
        setStatus(result.message);
        console.log("커스텀 커서 비활성화:", result);
      }
    } catch (error) {
      console.error("커스텀 커서 비활성화 실패:", error);
      setStatus("커스텀 커서 비활성화 실패");
    }
  };

  // 마우스 위치 업데이트
  const updateMousePosition = async () => {
    try {
      // Node.js 환경에서만 실행 (Electron 메인 프로세스)
      if (window.electron) {
        const pos = (await window.electron.ipcRenderer.invoke(
          "get-mouse-position"
        )) as { x: number; y: number };
        setMousePosition(pos);
      }
    } catch (error) {
      console.error("마우스 위치 가져오기 실패:", error);
    }
  };

  // 원형 궤적으로 마우스 이동 시작
  const startCircleMovement = async () => {
    try {
      setIsMoving(true);
      setStatus("마우스가 원형 궤적을 그리는 중...");

      // Electron 메인 프로세스와 통신
      if (window.electron) {
        const result = (await window.electron.ipcRenderer.invoke(
          "start-circle-movement"
        )) as { success: boolean; message: string };
        console.log(result.message);
      } else {
        // 브라우저에서 테스트용
        setTimeout(() => {
          setIsMoving(false);
          setStatus("마우스 움직임 완료 (브라우저 테스트 모드)");
        }, 5000);
      }
    } catch (error) {
      console.error("마우스 제어 실패:", error);
      setIsMoving(false);
      setStatus("마우스 제어 실패");
    }
  };

  // 마우스 움직임 중지
  const stopMouseMovement = async () => {
    try {
      if (window.electron) {
        const result = (await window.electron.ipcRenderer.invoke(
          "stop-mouse-movement"
        )) as { success: boolean; message: string };
        console.log(result.message);
      }
      setIsMoving(false);
      setStatus("마우스 움직임 중지됨");
    } catch (error) {
      console.error("마우스 중지 실패:", error);
    }
  };

  // 컴포넌트 마운트 시 마우스 움직임 완료 이벤트 리스너 설정
  useEffect(() => {
    const handleMovementComplete = () => {
      setIsMoving(false);
      setStatus("마우스 원형 궤적 완료!");
    };

    if (window.electron) {
      window.electron.ipcRenderer.on(
        "mouse-movement-complete",
        handleMovementComplete
      );
    }

    // 마우스 위치 주기적 업데이트
    const interval = setInterval(updateMousePosition, 500);

    return () => {
      if (window.electron) {
        window.electron.ipcRenderer.removeListener(
          "mouse-movement-complete",
          handleMovementComplete
        );
      }
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🖱️ 마우스 제어 앱</h1>
        <p>마우스를 원형 궤적으로 움직여보세요!</p>
      </header>

      <main className="app-main">
        <div className="status-section">
          <h2>상태: {status}</h2>
          <div className="mouse-info">
            <p>
              현재 마우스 위치: ({mousePosition.x}, {mousePosition.y})
            </p>
            <button onClick={updateMousePosition} className="update-btn">
              위치 업데이트
            </button>
          </div>
        </div>

        <div className="control-section">
          <button
            onClick={testRobotJS}
            className="control-btn test-btn"
            style={{ background: "linear-gradient(45deg, #ffa726, #ff9800)" }}
          >
            🧪 robotjs 테스트
          </button>

          <button
            onClick={startCircleMovement}
            disabled={isMoving}
            className={`control-btn start-btn ${isMoving ? "disabled" : ""}`}
          >
            {isMoving ? "움직이는 중..." : "🔄 원형 궤적 시작"}
          </button>

          <button
            onClick={stopMouseMovement}
            disabled={!isMoving}
            className={`control-btn stop-btn ${!isMoving ? "disabled" : ""}`}
          >
            ⏹️ 중지
          </button>
        </div>

        <div className="control-section">
          <h3
            style={{ width: "100%", textAlign: "center", margin: "0 0 1rem 0" }}
          >
            🔊 볼륨 제어
          </h3>

          <button
            onClick={volumeUp}
            className="control-btn volume-btn"
            style={{ background: "linear-gradient(45deg, #66bb6a, #4caf50)" }}
          >
            🔊+ 볼륨 업
          </button>

          <button
            onClick={volumeDown}
            className="control-btn volume-btn"
            style={{ background: "linear-gradient(45deg, #ef5350, #f44336)" }}
          >
            🔉- 볼륨 다운
          </button>

          <button
            onClick={volumeMute}
            className="control-btn volume-btn"
            style={{ background: "linear-gradient(45deg, #bdbdbd, #9e9e9e)" }}
          >
            🔇 음소거
          </button>
        </div>

        <div className="control-section">
          <h3
            style={{ width: "100%", textAlign: "center", margin: "0 0 1rem 0" }}
          >
            🖱️ 커스텀 커서
          </h3>

          <button
            onClick={() => enableCustomCursor("default")}
            className="control-btn cursor-btn"
            style={{ background: "linear-gradient(45deg, #ff6b6b, #ee5a24)" }}
          >
            🔴 빨간 원형 커서
          </button>

          <button
            onClick={() => enableCustomCursor("arrow")}
            className="control-btn cursor-btn"
            style={{ background: "linear-gradient(45deg, #4ecdc4, #44a08d)" }}
          >
            ▲ 화살표 커서
          </button>

          <button
            onClick={() => enableCustomCursor("rainbow")}
            className="control-btn cursor-btn"
            style={{ background: "linear-gradient(45deg, #a8e6cf, #7fcdcd)" }}
          >
            🌈 무지개 커서
          </button>

          <button
            onClick={disableCustomCursor}
            className="control-btn cursor-btn"
            style={{ background: "linear-gradient(45deg, #95a5a6, #7f8c8d)" }}
          >
            ↺ 기본 커서로 복원
          </button>
        </div>

        <div className="info-section">
          <h3>📋 사용법</h3>
          <ul>
            <li>
              🧪 "robotjs 테스트" 버튼으로 마우스 제어 기능을 먼저
              테스트해보세요
            </li>
            <li>
              ✨ "원형 궤적 시작" 버튼을 클릭하면 마우스가 화면 중앙에서 원을
              그리며 움직입니다
            </li>
            <li>⏱️ 5초 동안 원형 궤적을 그린 후 자동으로 멈춥니다</li>
            <li>🛑 "중지" 버튼으로 언제든 움직임을 중단할 수 있습니다</li>
            <li>📍 현재 마우스 위치를 실시간으로 확인할 수 있습니다</li>
            <li>
              🔊 볼륨 업/다운/음소거 버튼으로 시스템 볼륨을 제어할 수 있습니다
            </li>
            <li>
              🖱️ 커스텀 커서 버튼으로 시스템 전체 마우스 커서를 변경할 수
              있습니다
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
