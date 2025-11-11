// src/tests/test-edge-detection.ts
import { ShapeDetector } from '../main';
import { TestUtils } from '../test-utils';

export function testEdgeDetection() {
    console.log('=== Testing Edge Detection ===');
    
    const detector = new ShapeDetector();
    detector.enableDebug();
    
    // Test with simple black square on white background
    const testImage = TestUtils.createTestImage(200, 200, (ctx) => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = 'black';
      ctx.fillRect(50, 50, 100, 100);
    });
    
    const grayscale = detector['convertToGrayscale'](testImage);
    const edges = detector['detectEdges'](grayscale, 200, 200);
    
    // Count edge pixels
    let edgeCount = 0;
    for (let i = 0; i < edges.length; i++) {
      if (edges[i] > 0) edgeCount++;
    }
    
    console.log(`✓ Edge pixels detected: ${edgeCount}`);
    console.log(`✓ Percentage of image: ${(edgeCount / edges.length * 100).toFixed(2)}%`);
    
    // Visualize edges
    visualizeEdges(edges, 200, 200, 'Edge Detection Result');
    
    // Expected: Edges should be ~400 pixels (perimeter of 100x100 square)
    const expectedEdges = 400;
    const tolerance = 0.3; // 30% tolerance
    const isValid = Math.abs(edgeCount - expectedEdges) / expectedEdges < tolerance;
    
    console.log(isValid ? '✓ Edge count within expected range' : '✗ Edge count outside range');
    console.log('');
  }
  
  function visualizeEdges(edges: Uint8ClampedArray, width: number, height: number, title: string) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < edges.length; i++) {
      imageData.data[i * 4] = edges[i];
      imageData.data[i * 4 + 1] = edges[i];
      imageData.data[i * 4 + 2] = edges[i];
      imageData.data[i * 4 + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Add to debug container
    const container = document.getElementById('debug-container');
    if (container) {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin: 10px 0; text-align: center;';
      
      const label = document.createElement('div');
      label.textContent = title;
      label.style.cssText = 'color: white; margin-bottom: 5px; font-size: 12px;';
      
      canvas.style.cssText = 'border: 1px solid white; max-width: 100%;';
      
      wrapper.appendChild(label);
      wrapper.appendChild(canvas);
      container.appendChild(wrapper);
    }
  }