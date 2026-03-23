self.onmessage = async (event: MessageEvent) => {
  const { prefix, suffix, position } = event.data;
  
  try {
    // @ts-ignore - The WASM file is dynamically served and not available at type-check time
    const wasmModule = await import(/* webpackIgnore: true */ `${self.location.origin}/wasm/engine.js`);
    const { default: init, generate_vanity } = wasmModule;
    
    await init(`${self.location.origin}/wasm/engine_bg.wasm`);
    
    const jsonResult = generate_vanity(prefix, suffix, position);
    const result = JSON.parse(jsonResult);
    
    self.postMessage({ type: "DONE", result });
  } catch (err: any) {
    self.postMessage({ 
      type: "ERROR", 
      error: err.message || "Failed to load WASM. Ensure you ran wasm-pack build." 
    });
  }
};
