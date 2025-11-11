// src/main.ts - Complete Shape Detection Implementation
import { DebugVisualizer } from './debug-visualizer';
// Import runAllTests to make it available globally
import './tests/run-all-tests';

export interface DetectionResult {
  shapes: Shape[];
  processingTime: number;
}

export interface Shape {
  type: 'circle' | 'rectangle' | 'square' | 'triangle' | 'pentagon';
  boundingBox: BoundingBox;
  center: Point;
  area: number;
  confidence: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

interface Contour {
  points: Point[];
}

class ShapeDetector {
  private DEBUG = false; // Toggle this for debugging
  private visualizer: DebugVisualizer | null = null;
  private debugCanvas: HTMLCanvasElement | null = null;
  
  enableDebug() {
    this.DEBUG = true;
    this.visualizer = new DebugVisualizer();
    this.setupDebugCanvas();
  }
  
  disableDebug() {
    this.DEBUG = false;
    this.visualizer = null;
    if (this.debugCanvas) {
      this.debugCanvas.remove();
      this.debugCanvas = null;
    }
  }
  
  private setupDebugCanvas() {
    // Create debug container
    let container = document.getElementById('debug-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'debug-container';
      container.style.cssText = `
        position: fixed;
        right: 10px;
        top: 10px;
        max-width: 400px;
        max-height: 90vh;
        overflow-y: auto;
        background: rgba(0,0,0,0.8);
        padding: 10px;
        border-radius: 8px;
        z-index: 10000;
      `;
      document.body.appendChild(container);
    }
  }
  async detectShapes(imageData: ImageData): Promise<DetectionResult> {
    const startTime = performance.now();
    
    try {
      if (this.DEBUG && this.visualizer) {
        this.visualizer.clear();
        this.visualizer.addImage(imageData, imageData.width, imageData.height, '1. Original Image');
      }
      // Step 1: Preprocess image
      const grayscale = this.convertToGrayscale(imageData);
      if (this.DEBUG && this.visualizer) {
        this.visualizer.addImage(grayscale, imageData.width, imageData.height, '2. Grayscale');
      }
      if (this.DEBUG) {
        console.log(
          '1. Grayscale - non-white pixels:',
          Array.from(grayscale).filter((v) => v < 250).length
        );
      }
      
      // Step 2: Detect edges
      const edges = this.detectEdges(grayscale, imageData.width, imageData.height);
      if (this.DEBUG && this.visualizer) {
        this.visualizer.addImage(edges, imageData.width, imageData.height, '3. Edge Detection');
      }
      if (this.DEBUG) {
        console.log('2. Edge pixels detected:',
          Array.from(edges).filter((v) => v > 0).length
        );
      }
      
      // Step 3: Find contours
      const contours = this.findContours(edges, imageData.width, imageData.height);
      if (this.DEBUG && this.visualizer) {
        this.visualizer.drawContours(imageData, contours, '4. Detected Contours');
        this.visualizer.addMetrics({
          'Total Contours': contours.length,
          'Avg Points per Contour':
            contours.length ? contours.reduce((sum, c) => sum + c.points.length, 0) / contours.length : 0
        });
      }
      if (this.DEBUG) {
        console.log('3. Contours found:', contours.length);
        console.log(
          '4. Contours after filtering:',
          contours.filter((c) => c.points.length >= 10).length
        );
      }
      
      // Step 4: Filter and classify shapes
      const shapes: Shape[] = [];
      
      for (const contour of contours) {
        // Filter out noise (very small contours) - reduced threshold
        if (contour.points.length < 5) continue;
        
        const shape = this.analyzeContour(contour, imageData.width, imageData.height);
        
        if (this.DEBUG && !shape) {
          const area = this.calculateContourArea(contour);
          const minArea = (imageData.width * imageData.height) * 0.0001;
          const epsilon = 0.03 * this.calculatePerimeter(contour);
          const approxPoints = this.douglasPeucker(contour.points, epsilon);
          console.log('Contour rejected:', {
            points: contour.points.length,
            area,
            minArea,
            vertices: approxPoints.length,
            areaTooSmall: area < minArea
          });
        }
        
        // Lower confidence threshold to catch more shapes
        if (shape && shape.confidence > 0.3) {
          shapes.push(shape);
          if (this.DEBUG) {
            console.log('Shape detected:', shape.type, 'confidence:', shape.confidence.toFixed(2));
          }
        }
      }
      if (this.DEBUG) {
        console.log('5. Shapes classified:', shapes.length);
        console.log(
          '6. Shapes after confidence filter:',
          shapes.filter((s) => s.confidence > 0.5).length
        );
      }
      
      // Step 5: Remove duplicate detections
      const filteredShapes = this.removeDuplicates(shapes);
      
      const processingTime = performance.now() - startTime;
      if (this.DEBUG && this.visualizer) {
        this.visualizer.drawShapes(imageData, filteredShapes, '5. Final Detections');
        this.visualizer.addMetrics({
          'Shapes Detected': filteredShapes.length,
          'Processing Time': `${processingTime.toFixed(2)}ms`,
          'Avg Confidence':
            filteredShapes.length
              ? ((filteredShapes.reduce((sum, s) => sum + s.confidence, 0) / filteredShapes.length) * 100).toFixed(1) + '%'
              : '0.0%'
        });
      }
      
      return {
        shapes: filteredShapes,
        processingTime
      };
    } catch (error) {
      console.error('Shape detection error:', error);
      return {
        shapes: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  /**
   * Convert ImageData to grayscale
   */
  private convertToGrayscale(imageData: ImageData): Uint8ClampedArray {
    const { data, width, height } = imageData;
    const grayscale = new Uint8ClampedArray(width * height);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Use luminosity method for better results
      grayscale[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    
    return grayscale;
  }

  /**
   * Canny edge detection implementation
   */
  private detectEdges(grayscale: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    // Step 1: Apply Gaussian blur to reduce noise
    const blurred = this.gaussianBlur(grayscale, width, height);
    
    // Step 2: Calculate gradients
    const { magnitude, direction } = this.calculateGradients(blurred, width, height);
    
    // Step 3: Non-maximum suppression
    const suppressed = this.nonMaximumSuppression(magnitude, direction, width, height);
    
    // Step 4: Double threshold and edge tracking
    const edges = this.doubleThreshold(suppressed, width, height);
    
    return edges;
  }

  /**
   * Apply Gaussian blur
   */
  private gaussianBlur(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ];
    const kernelSum = 16;
    
    const result = new Uint8ClampedArray(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            sum += data[idx] * kernel[ky + 1][kx + 1];
          }
        }
        
        result[y * width + x] = sum / kernelSum;
      }
    }
    
    return result;
  }

  /**
   * Calculate image gradients using Sobel operator
   */
  private calculateGradients(data: Uint8ClampedArray, width: number, height: number) {
    const magnitude = new Float32Array(width * height);
    const direction = new Float32Array(width * height);
    
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];
    
    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            gx += data[idx] * sobelX[ky + 1][kx + 1];
            gy += data[idx] * sobelY[ky + 1][kx + 1];
          }
        }
        
        const idx = y * width + x;
        magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
        direction[idx] = Math.atan2(gy, gx);
      }
    }
    
    return { magnitude, direction };
  }

  /**
   * Non-maximum suppression to thin edges
   */
  private nonMaximumSuppression(
    magnitude: Float32Array,
    direction: Float32Array,
    width: number,
    height: number
  ): Uint8ClampedArray {
    const result = new Uint8ClampedArray(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const angle = direction[idx] * (180 / Math.PI);
        const mag = magnitude[idx];
        
        let neighbor1 = 0;
        let neighbor2 = 0;
        
        // Determine neighbors based on gradient direction
        if ((angle >= -22.5 && angle < 22.5) || (angle >= 157.5 || angle < -157.5)) {
          neighbor1 = magnitude[y * width + (x + 1)];
          neighbor2 = magnitude[y * width + (x - 1)];
        } else if ((angle >= 22.5 && angle < 67.5) || (angle >= -157.5 && angle < -112.5)) {
          neighbor1 = magnitude[(y - 1) * width + (x + 1)];
          neighbor2 = magnitude[(y + 1) * width + (x - 1)];
        } else if ((angle >= 67.5 && angle < 112.5) || (angle >= -112.5 && angle < -67.5)) {
          neighbor1 = magnitude[(y - 1) * width + x];
          neighbor2 = magnitude[(y + 1) * width + x];
        } else {
          neighbor1 = magnitude[(y - 1) * width + (x - 1)];
          neighbor2 = magnitude[(y + 1) * width + (x + 1)];
        }
        
        if (mag >= neighbor1 && mag >= neighbor2) {
          result[idx] = Math.min(255, mag);
        }
      }
    }
    
    return result;
  }

  /**
   * Double threshold and hysteresis
   */
  private doubleThreshold(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const result = new Uint8ClampedArray(width * height);
    
    // Calculate thresholds based on histogram
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > max) max = data[i];
    }
    
    // More sensitive edge detection
    const highThreshold = max * 0.08;
    const lowThreshold = highThreshold * 0.4;
    
    const STRONG = 255;
    const WEAK = 127;
    
    // Apply threshold
    for (let i = 0; i < data.length; i++) {
      if (data[i] >= highThreshold) {
        result[i] = STRONG;
      } else if (data[i] >= lowThreshold) {
        result[i] = WEAK;
      }
    }
    
    // Edge tracking by hysteresis
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (result[idx] === WEAK) {
          let hasStrongNeighbor = false;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (result[(y + dy) * width + (x + dx)] === STRONG) {
                hasStrongNeighbor = true;
                break;
              }
            }
            if (hasStrongNeighbor) break;
          }
          
          result[idx] = hasStrongNeighbor ? STRONG : 0;
        }
      }
    }
    
    return result;
  }

  /**
   * Find contours in edge image
   */
  private findContours(edges: Uint8ClampedArray, width: number, height: number): Contour[] {
    const visited = new Uint8Array(width * height);
    const contours: Contour[] = [];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (edges[idx] > 0 && !visited[idx]) {
          const contour = this.traceContour(edges, visited, x, y, width, height);
          
          // Reduced threshold to catch smaller shapes
          if (contour.points.length >= 5) {
            contours.push(contour);
          }
        }
      }
    }
    
    return contours;
  }

  /**
   * Trace a single contour
   */
  private traceContour(
    edges: Uint8ClampedArray,
    visited: Uint8Array,
    startX: number,
    startY: number,
    width: number,
    height: number
  ): Contour {
    const points: Point[] = [];
    const stack: Point[] = [{ x: startX, y: startY }];
    
    const directions = [
      { dx: 1, dy: 0 },
      { dx: 1, dy: 1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: -1, dy: -1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: -1 }
    ];
    
    while (stack.length > 0) {
      const point = stack.pop()!;
      const idx = point.y * width + point.x;
      
      if (visited[idx]) continue;
      
      visited[idx] = 1;
      points.push(point);
      
      // Check 8-connected neighbors
      for (const dir of directions) {
        const nx = point.x + dir.dx;
        const ny = point.y + dir.dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nidx = ny * width + nx;
          
          if (edges[nidx] > 0 && !visited[nidx]) {
            stack.push({ x: nx, y: ny });
          }
        }
      }
    }
    
    return { points };
  }

  /**
   * Analyze contour and classify shape
   */
  private analyzeContour(contour: Contour, imgWidth: number, imgHeight: number): Shape | null {
    // Approximate contour to polygon using Douglas-Peucker algorithm
    // Use more lenient epsilon to preserve shape details
    const perimeter = this.calculatePerimeter(contour);
    const epsilon = Math.max(2, 0.02 * perimeter); // Minimum epsilon of 2 pixels
    const approxPoints = this.douglasPeucker(contour.points, epsilon);
    
    // Calculate properties
    const area = this.calculateContourArea(contour);
    const boundingBox = this.calculateBoundingBox(contour);
    const center = this.calculateCenter(contour);
    
    // Minimum area threshold - more lenient
    const minArea = (imgWidth * imgHeight) * 0.0001;
    if (area < minArea) {
      if (this.DEBUG) {
        console.log('Area too small:', area, 'min:', minArea);
      }
      return null;
    }
    
    // Circularity test
    const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
    
    if (circularity > 0.8) {
      return {
        type: 'circle',
        boundingBox,
        center,
        area,
        confidence: Math.min(0.95, circularity)
      };
    }
    
    // Polygon classification based on vertices
    // Allow some tolerance for vertex count
    const numVertices = approxPoints.length;
    
    if (this.DEBUG) {
      console.log('Analyzing contour:', {
        vertices: numVertices,
        area,
        perimeter,
        bbox: boundingBox
      });
    }
    
    // Triangle detection - most lenient
    // Accept 3-5 vertices as potential triangles
    if (numVertices >= 3 && numVertices <= 5) {
      // Always classify as triangle if we have 3 vertices
      if (numVertices === 3) {
        const confidence = Math.max(0.7, this.calculatePolygonConfidence(approxPoints, 3));
        return {
          type: 'triangle',
          boundingBox,
          center,
          area,
          confidence
        };
      }
      // Check if 4-5 vertices form a triangle-like shape
      if (numVertices >= 4 && this.isLikelyTriangle(approxPoints)) {
        const confidence = Math.max(0.5, this.calculatePolygonConfidence(approxPoints, 3) * 0.8);
        return {
          type: 'triangle',
          boundingBox,
          center,
          area,
          confidence
        };
      }
      // If 4 vertices but not clearly a rectangle, might be triangle with noise
      if (numVertices === 4) {
        // Check aspect ratio - triangles usually aren't very rectangular
        const aspectRatio = boundingBox.width > 0 && boundingBox.height > 0 
          ? Math.max(boundingBox.width / boundingBox.height, boundingBox.height / boundingBox.width)
          : 1;
        // If not too elongated and not square-like, likely triangle
        if (aspectRatio < 2) {
          const rectConfidence = this.calculatePolygonConfidence(approxPoints, 4);
          // If rectangle confidence is low, it's probably a triangle
          if (rectConfidence < 0.6) {
            return {
              type: 'triangle',
              boundingBox,
              center,
              area,
              confidence: 0.5
            };
          }
        }
      }
    }
    
    // Rectangle/Square detection
    if (numVertices >= 4 && numVertices <= 6) {
      const aspectRatio = boundingBox.width > 0 && boundingBox.height > 0 
        ? boundingBox.width / boundingBox.height 
        : 1;
      const isSquare = aspectRatio > 0.85 && aspectRatio < 1.15;
      
      const confidence = this.calculatePolygonConfidence(approxPoints, 4);
      if (confidence > 0.3) {
        return {
          type: isSquare ? 'square' : 'rectangle',
          boundingBox,
          center,
          area,
          confidence: Math.max(0.5, confidence)
        };
      }
    }
    
    // Pentagon detection
    if (numVertices >= 5 && numVertices <= 7) {
      const confidence = Math.max(0.5, this.calculatePolygonConfidence(approxPoints, 5));
      if (confidence > 0.3) {
        return {
          type: 'pentagon',
          boundingBox,
          center,
          area,
          confidence
        };
      }
    }
    
    // Check if it might be a circle with noisy edges
    if (numVertices > 6 && circularity > 0.6) {
      return {
        type: 'circle',
        boundingBox,
        center,
        area,
        confidence: circularity * 0.9
      };
    }
    
    // Fallback: if we have a valid contour but couldn't classify it, 
    // try to classify based on bounding box and area
    if (numVertices > 0 && area > minArea) {
      // Try to classify as the most likely shape based on vertices
      if (numVertices >= 3 && numVertices <= 5) {
        const shapeTypes = ['triangle', 'rectangle', 'pentagon'];
        const likelyType = shapeTypes[Math.min(numVertices - 3, 2)] as 'triangle' | 'rectangle' | 'pentagon';
        return {
          type: likelyType,
          boundingBox,
          center,
          area,
          confidence: 0.4 // Lower confidence for fallback
        };
      }
    }
    
    return null;
  }

  /**
   * Douglas-Peucker algorithm for polygon approximation
   */
  private douglasPeucker(points: Point[], epsilon: number): Point[] {
    if (points.length < 3) return points;
    
    // Ensure epsilon is at least 1 pixel
    epsilon = Math.max(1, epsilon);
    
    let maxDistance = 0;
    let maxIndex = 0;
    
    const start = points[0];
    const end = points[points.length - 1];
    
    // Check if contour is closed (start and end are close)
    const isClosed = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    ) < 5;
    
    // For closed contours, find point farthest from line connecting first to last
    // For open contours, use standard algorithm
    const searchEnd = isClosed ? points.length : points.length - 1;
    
    for (let i = 1; i < searchEnd; i++) {
      const distance = this.perpendicularDistance(points[i], start, end);
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    if (maxDistance > epsilon) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
      const right = this.douglasPeucker(points.slice(maxIndex), epsilon);
      
      // Remove duplicate point at junction
      return [...left.slice(0, -1), ...right];
    }
    
    // For closed contours, we need at least 3 points to form a shape
    // For open contours, return start and end
    if (isClosed) {
      // If the contour is closed, we need to return enough points
      // Check if we can get more points from the original
      if (points.length <= 3) {
        return points; // Return all points if very few
      }
      // Return first, middle, and last point for closed contour
      const mid = Math.floor(points.length / 2);
      return [points[0], points[mid], points[points.length - 1]];
    }
    return [start, end];
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    const numerator = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
    const denominator = Math.sqrt(dx * dx + dy * dy);
    
    return numerator / denominator;
  }

  /**
   * Calculate contour area using Shoelace formula
   */
  private calculateContourArea(contour: Contour): number {
    const points = contour.points;
    if (points.length < 3) return 0;
    
    let area = 0;
    
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    // Return absolute value (handles both clockwise and counterclockwise)
    const calculatedArea = Math.abs(area / 2);
    
    // Ensure minimum area (at least a few pixels)
    return Math.max(calculatedArea, points.length * 0.5);
  }

  /**
   * Calculate contour perimeter
   */
  private calculatePerimeter(contour: Contour): number {
    const points = contour.points;
    let perimeter = 0;
    
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    return perimeter;
  }

  /**
   * Calculate bounding box
   */
  private calculateBoundingBox(contour: Contour): BoundingBox {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    for (const point of contour.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Calculate center point
   */
  private calculateCenter(contour: Contour): Point {
    let sumX = 0;
    let sumY = 0;
    
    for (const point of contour.points) {
      sumX += point.x;
      sumY += point.y;
    }
    
    return {
      x: sumX / contour.points.length,
      y: sumY / contour.points.length
    };
  }

  /**
   * Check if a polygon is likely a triangle (one vertex very close to another, or has triangle-like angles)
   */
  private isLikelyTriangle(vertices: Point[]): boolean {
    if (vertices.length < 4 || vertices.length > 5) return false;
    
    // Check if any two vertices are very close (within 10 pixels) - indicates collapsed edge
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const dist = Math.sqrt(
          Math.pow(vertices[i].x - vertices[j].x, 2) + 
          Math.pow(vertices[i].y - vertices[j].y, 2)
        );
        if (dist < 10) return true;
      }
    }
    
    // Check if angles suggest a triangle (one angle close to 180 degrees suggests collapsed edge)
    if (vertices.length === 4) {
      for (let i = 0; i < vertices.length; i++) {
        const prev = vertices[(i - 1 + vertices.length) % vertices.length];
        const curr = vertices[i];
        const next = vertices[(i + 1) % vertices.length];
        const angle = this.calculateAngle(prev, curr, next);
        // If any angle is very close to 180, it's likely a triangle with a collapsed edge
        if (angle > 170) return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate confidence score for polygon
   */
  private calculatePolygonConfidence(vertices: Point[], expectedVertices: number): number {
    // More lenient - allow 1 vertex difference
    if (Math.abs(vertices.length - expectedVertices) > 1) {
      return 0.5;
    }
    
    // Check angle regularity for better confidence
    const angles: number[] = [];
    
    for (let i = 0; i < vertices.length; i++) {
      const prev = vertices[(i - 1 + vertices.length) % vertices.length];
      const curr = vertices[i];
      const next = vertices[(i + 1) % vertices.length];
      
      const angle = this.calculateAngle(prev, curr, next);
      angles.push(angle);
    }
    
    // Calculate variance in angles
    const avgAngle = angles.reduce((a, b) => a + b, 0) / angles.length;
    const variance = angles.reduce((sum, angle) => sum + Math.pow(angle - avgAngle, 2), 0) / angles.length;
    
    // Lower variance = higher confidence - more lenient
    const confidence = Math.max(0.5, 1 - (variance / 2000));
    
    return confidence;
  }

  /**
   * Calculate angle at vertex
   */
  private calculateAngle(p1: Point, p2: Point, p3: Point): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
    
    return angle;
  }

  /**
   * Remove duplicate detections using IoU
   */
  private removeDuplicates(shapes: Shape[]): Shape[] {
    const filtered: Shape[] = [];
    
    for (const shape of shapes) {
      let isDuplicate = false;
      
      for (const existing of filtered) {
        const iou = this.calculateIoU(shape.boundingBox, existing.boundingBox);
        
        if (iou > 0.5) {
          isDuplicate = true;
          
          // Keep the one with higher confidence
          if (shape.confidence > existing.confidence) {
            const index = filtered.indexOf(existing);
            filtered[index] = shape;
          }
          break;
        }
      }
      
      if (!isDuplicate) {
        filtered.push(shape);
      }
    }
    
    return filtered;
  }

  /**
   * Calculate Intersection over Union (IoU)
   */
  private calculateIoU(box1: BoundingBox, box2: BoundingBox): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    
    if (x2 < x1 || y2 < y1) return 0;
    
    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;
    
    return intersection / union;
  }
}

// Export the class for testing
export { ShapeDetector };

// Initialize and export detector instance
export const detector = new ShapeDetector();