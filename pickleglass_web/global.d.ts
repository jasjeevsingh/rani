interface Window {
  api: {
    getWorkAreaHeight: () => Promise<number>;
    headerController: {
      resizeHeaderWindow: (opts: { width: number; height: number }) => void;
      setSidebarCollapsed: (isCollapsed: boolean) => Promise<void>;
    };
    // Add other methods as needed
  };
}
