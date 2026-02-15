/**
 * Vitest setup file.
 *
 * Provides minimal browser API mocks required by Phaser 3 when running
 * in a jsdom environment. Phaser's initialization code probes for canvas
 * and WebGL support; these stubs prevent it from throwing during import.
 */

// jsdom does not implement HTMLCanvasElement.getContext for WebGL.
// Phaser probes for this during module initialization, so we provide a stub.
const originalGetContext = HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.getContext = function (
  contextId: string,
  options?: any,
): any {
  if (contextId === '2d') {
    // Minimal Canvas2D stub for Phaser's CanvasFeatures detection
    return {
      fillStyle: '',
      fillRect: () => {},
      clearRect: () => {},
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
      }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
      canvas: this,
    };
  }

  if (contextId === 'webgl' || contextId === 'webgl2') {
    // Return a minimal WebGL context stub to prevent Phaser from erroring
    return {
      getExtension: () => null,
      getParameter: () => 0,
      getShaderPrecisionFormat: () => ({
        precision: 1,
        rangeMin: 1,
        rangeMax: 1,
      }),
      createShader: () => ({}),
      createProgram: () => ({}),
      createBuffer: () => ({}),
      createFramebuffer: () => ({}),
      createTexture: () => ({}),
      createRenderbuffer: () => ({}),
      bindBuffer: () => {},
      bindFramebuffer: () => {},
      bindRenderbuffer: () => {},
      bindTexture: () => {},
      blendFunc: () => {},
      bufferData: () => {},
      clearColor: () => {},
      clear: () => {},
      compileShader: () => {},
      deleteShader: () => {},
      deleteProgram: () => {},
      depthFunc: () => {},
      disable: () => {},
      enable: () => {},
      framebufferTexture2D: () => {},
      framebufferRenderbuffer: () => {},
      frontFace: () => {},
      generateMipmap: () => {},
      getAttribLocation: () => 0,
      getUniformLocation: () => ({}),
      linkProgram: () => {},
      pixelStorei: () => {},
      renderbufferStorage: () => {},
      shaderSource: () => {},
      texImage2D: () => {},
      texParameteri: () => {},
      uniform1i: () => {},
      uniform2f: () => {},
      useProgram: () => {},
      vertexAttribPointer: () => {},
      viewport: () => {},
      enableVertexAttribArray: () => {},
      disableVertexAttribArray: () => {},
      activeTexture: () => {},
      scissor: () => {},
      drawArrays: () => {},
      drawElements: () => {},
      getProgramParameter: () => true,
      getShaderParameter: () => true,
      getProgramInfoLog: () => '',
      getShaderInfoLog: () => '',
      attachShader: () => {},
      getSupportedExtensions: () => [],
      canvas: this,
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
    };
  }

  return originalGetContext.call(this, contextId, options);
} as any;

// Phaser may also check for AudioContext
if (typeof globalThis.AudioContext === 'undefined') {
  (globalThis as any).AudioContext = class AudioContext {
    createGain() {
      return {
        connect: () => {},
        gain: {
          value: 1,
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
      };
    }
    createBufferSource() {
      return {
        connect: () => {},
        start: () => {},
        stop: () => {},
        buffer: null,
        playbackRate: {
          value: 1,
          setValueAtTime: () => {},
        },
      };
    }
    createDynamicsCompressor() {
      return {
        connect: () => {},
        threshold: { value: -50 },
        knee: { value: 40 },
        ratio: { value: 12 },
        attack: { value: 0 },
        release: { value: 0.25 },
      };
    }
    decodeAudioData() {
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
    resume() {
      return Promise.resolve();
    }
    get currentTime() {
      return 0;
    }
    get destination() {
      return {
        connect: () => {},
      };
    }
    get state() {
      return 'running';
    }
  };
}

// Phaser checks for requestAnimationFrame
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(cb, 16);
  (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
}
