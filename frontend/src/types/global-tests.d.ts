export {};

declare global {
  interface Window {
    alertCalled?: boolean;
    cspBlocked?: boolean;
  }
}


