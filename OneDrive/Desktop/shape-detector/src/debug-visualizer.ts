// src/debug-visualizer.ts
interface Point {
  x: number;
  y: number;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Shape {
  type: 'circle' | 'rectangle' | 'square' | 'triangle' | 'pentagon';
  boundingBox: BoundingBox;
  center: Point;
  area: number;
  confidence: number;
}

interface Contour {
  points: Point[];
}

export class DebugVisualizer {
    private container: HTMLElement;
    
    constructor() {
      this.container = this.createContainer();
    }
    
    private createContainer(): HTMLElement {
      let container = document.getElementById('debug-visualizer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'debug-visualizer';
        container.style.cssText = `
          position: fixed;
          right: 10px;
          top: 10px;
          width: 400px;
          max-height: 90vh;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.9);
          padding: 15px;
          border-radius: 8px;
          z-index: 10000;
          font-family: monospace;
          font-size: 12px;
          color: #0f0;
        `;
        document.body.appendChild(container);
      }
      return container;
    }
    
    clear() {
      this.container.innerHTML = '<h3 style="color: #0f0; margin: 0 0 10px 0;">Debug Visualizer</h3>';
    }
    
    addImage(imageData: Uint8ClampedArray | ImageData, width: number, height: number, title: string) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      
      // Fill with black background first
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      
      // Convert Uint8ClampedArray to ImageData if needed
      let imgData: ImageData;
      if (imageData instanceof Uint8ClampedArray) {
        imgData = ctx.createImageData(width, height);
        const expectedLength = width * height;
        
        // Handle case where array length matches expected
        if (imageData.length === expectedLength) {
          for (let i = 0; i < imageData.length; i++) {
            const val = imageData[i];
            imgData.data[i * 4] = val;
            imgData.data[i * 4 + 1] = val;
            imgData.data[i * 4 + 2] = val;
            imgData.data[i * 4 + 3] = 255;
          }
        } else {
          // Fallback: fill with data we have
          const minLen = Math.min(imageData.length, expectedLength * 4);
          for (let i = 0; i < minLen; i += 4) {
            const idx = Math.floor(i / 4);
            if (idx < imageData.length) {
              const val = imageData[idx];
              imgData.data[i] = val;
              imgData.data[i + 1] = val;
              imgData.data[i + 2] = val;
              imgData.data[i + 3] = 255;
            }
          }
        }
      } else {
        imgData = imageData;
      }
      
      ctx.putImageData(imgData, 0, 0);
      
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin: 15px 0; border-top: 1px solid #333; padding-top: 10px;';
      
      const label = document.createElement('div');
      label.textContent = title;
      label.style.cssText = 'color: #0f0; margin-bottom: 8px; font-weight: bold;';
      
      canvas.style.cssText = 'width: 100%; border: 1px solid #333; cursor: pointer;';
      canvas.onclick = () => {
        // Open full size in new window
        const win = window.open('', '_blank');
        win!.document.write(`<img src="${canvas.toDataURL()}" style="max-width: 100%; background: #000;" />`);
      };
      
      wrapper.appendChild(label);
      wrapper.appendChild(canvas);
      this.container.appendChild(wrapper);
    }
    
    addMetrics(metrics: Record<string, any>) {
      const metricsDiv = document.createElement('div');
      metricsDiv.style.cssText = 'margin: 15px 0; border: 1px solid #333; padding: 10px; border-radius: 4px;';
      
      const title = document.createElement('div');
      title.textContent = 'Metrics';
      title.style.cssText = 'color: #ff0; font-weight: bold; margin-bottom: 8px;';
      metricsDiv.appendChild(title);
      
      for (const [key, value] of Object.entries(metrics)) {
        const metric = document.createElement('div');
        metric.textContent = `${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`;
        metric.style.cssText = 'color: #0f0; margin: 3px 0;';
        metricsDiv.appendChild(metric);
      }
      
      this.container.appendChild(metricsDiv);
    }
    
    drawContours(imageData: ImageData, contours: Contour[], title: string) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;
      
      // Draw original image
      ctx.putImageData(imageData, 0, 0);
      
      // Draw each contour in different color
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
      
      contours.forEach((contour, idx) => {
        ctx.strokeStyle = colors[idx % colors.length];
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        contour.points.forEach((point, i) => {
          if (i === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        
        ctx.closePath();
        ctx.stroke();
      });
      
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin: 15px 0; border-top: 1px solid #333; padding-top: 10px;';
      
      const label = document.createElement('div');
      label.textContent = `${title} (${contours.length} contours)`;
      label.style.cssText = 'color: #0f0; margin-bottom: 8px; font-weight: bold;';
      
      canvas.style.cssText = 'width: 100%; border: 1px solid #333;';
      
      wrapper.appendChild(label);
      wrapper.appendChild(canvas);
      this.container.appendChild(wrapper);
    }
    
    drawShapes(imageData: ImageData, shapes: Shape[], title: string) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;
      
      // Draw original image
      ctx.putImageData(imageData, 0, 0);
      
      // Draw each shape
      shapes.forEach((shape) => {
        const bbox = shape.boundingBox;
        
        // Draw bounding box
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
        
        // Draw center point
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(shape.center.x, shape.center.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw label
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.fillText(
          `${shape.type} (${(shape.confidence * 100).toFixed(0)}%)`,
          bbox.x,
          bbox.y - 5
        );
      });
      
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin: 15px 0; border-top: 1px solid #333; padding-top: 10px;';
      
      const label = document.createElement('div');
      label.textContent = `${title} (${shapes.length} shapes)`;
      label.style.cssText = 'color: #0f0; margin-bottom: 8px; font-weight: bold;';
      
      canvas.style.cssText = 'width: 100%; border: 1px solid #333;';
      
      wrapper.appendChild(label);
      wrapper.appendChild(canvas);
      this.container.appendChild(wrapper);
    }
  }