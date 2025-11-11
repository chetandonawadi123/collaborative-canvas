// src/app.ts - Main UI Initialization
import { detector } from './main';
import { TestUtils } from './test-utils';
import { testImages, getAllTestImageNames } from './test-images-data';
import { EvaluationManager } from './evaluation-manager';
import { SelectionManager } from './ui-utils';

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  // Initialize components
  const imageInput = document.getElementById('imageInput') as HTMLInputElement;
  const originalCanvas = document.getElementById('originalCanvas') as HTMLCanvasElement;
  const resultsDiv = document.getElementById('results') as HTMLDivElement;
  const testImagesDiv = document.getElementById('testImages') as HTMLDivElement;
  const evaluateButton = document.getElementById('evaluateButton') as HTMLButtonElement;
  const evaluationResultsDiv = document.getElementById('evaluationResults') as HTMLDivElement;

  // Initialize selection manager
  const selectionManager = new SelectionManager();
  
  // Initialize evaluation manager
  const evaluationManager = new EvaluationManager(
    detector,
    evaluateButton,
    evaluationResultsDiv
  );

  // Setup file upload
  setupFileUpload(imageInput, originalCanvas, resultsDiv);

  // Load test images
  loadTestImages(testImagesDiv, selectionManager, originalCanvas, resultsDiv);

  // Setup evaluation button
  evaluateButton.addEventListener('click', async () => {
    const selected = selectionManager.getSelectedImages();
    if (selected.length > 0) {
      await evaluationManager.runSelectedEvaluation(selected);
    } else {
      evaluationResultsDiv.innerHTML = '<p style="color: #f87171;">Please select at least one test image first.</p>';
    }
  });

  // Add debug toggle button
  addDebugToggle();
}

function setupFileUpload(
  imageInput: HTMLInputElement,
  canvas: HTMLCanvasElement,
  resultsDiv: HTMLDivElement
) {
  // Create upload button
  const uploadSection = document.createElement('div');
  uploadSection.className = 'upload-section';
  uploadSection.innerHTML = `
    <h3>Upload Your Image</h3>
    <button id="uploadBtn" class="upload-button">
      <span class="upload-icon">📁</span>
      <span>Choose Image</span>
    </button>
    <p class="upload-hint">Click to upload an image for shape detection</p>
  `;
  
  const app = document.getElementById('app');
  if (app) {
    const displaySection = app.querySelector('.display-section');
    if (displaySection) {
      displaySection.parentNode?.insertBefore(uploadSection, displaySection);
    }
  }

  const uploadBtn = document.getElementById('uploadBtn');
  uploadBtn?.addEventListener('click', () => imageInput.click());

  imageInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      await processImage(file, canvas, resultsDiv);
    }
  });
}

async function processImage(
  file: File,
  canvas: HTMLCanvasElement,
  resultsDiv: HTMLDivElement
) {
  try {
    resultsDiv.innerHTML = '<p class="loading">Processing image...</p>';
    
    const imageData = await TestUtils.loadImageFromFile(file);
    
    // Draw original image
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    // Detect shapes
    const result = await detector.detectShapes(imageData);
    
    // Display results
    displayResults(result, canvas, resultsDiv);
  } catch (error) {
    resultsDiv.innerHTML = `<p class="error">Error processing image: ${error}</p>`;
    console.error('Image processing error:', error);
  }
}

function displayResults(
  result: { shapes: any[]; processingTime: number },
  canvas: HTMLCanvasElement,
  resultsDiv: HTMLDivElement
) {
  const ctx = canvas.getContext('2d')!;
  
  // Draw shapes on canvas
  result.shapes.forEach((shape, index) => {
    const bbox = shape.boundingBox;
    const colors = ['#4ade80', '#60a5fa', '#f87171', '#fbbf24', '#a78bfa'];
    const color = colors[index % colors.length];
    
    // Draw bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
    
    // Draw center point
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(shape.center.x, shape.center.y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw label
    ctx.fillStyle = color;
    ctx.font = 'bold 16px Arial';
    ctx.fillText(
      `${shape.type} (${Math.round(shape.confidence * 100)}%)`,
      bbox.x,
      bbox.y - 10
    );
  });

  // Display results text
  const html = `
    <div class="results-summary">
      <h4>Detection Results</h4>
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">Shapes Found:</span>
          <span class="stat-value">${result.shapes.length}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Processing Time:</span>
          <span class="stat-value">${result.processingTime.toFixed(2)}ms</span>
        </div>
      </div>
      ${result.shapes.length > 0 ? `
        <div class="shapes-list">
          <h5>Detected Shapes:</h5>
          ${result.shapes.map((shape, i) => `
            <div class="shape-item">
              <span class="shape-type">${shape.type}</span>
              <span class="shape-confidence">${Math.round(shape.confidence * 100)}% confidence</span>
              <div class="shape-details">
                <small>Area: ${Math.round(shape.area)}px² | Center: (${Math.round(shape.center.x)}, ${Math.round(shape.center.y)})</small>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p class="no-shapes">No shapes detected in this image.</p>'}
    </div>
  `;
  
  resultsDiv.innerHTML = html;
}

function loadTestImages(
  container: HTMLDivElement,
  selectionManager: SelectionManager,
  canvas: HTMLCanvasElement,
  resultsDiv: HTMLDivElement
) {
  container.innerHTML = '';
  container.className = 'test-images-grid';
  
  const imageNames = getAllTestImageNames();
  
  // Add upload item first
  const uploadItem = document.createElement('div');
  uploadItem.className = 'test-image-item upload-item';
  uploadItem.innerHTML = `
    <div class="upload-icon">📁</div>
    <div class="upload-text">Upload Image</div>
    <div class="upload-subtext">Click to upload</div>
  `;
  uploadItem.addEventListener('click', () => {
    const input = document.getElementById('imageInput') as HTMLInputElement;
    input?.click();
  });
  container.appendChild(uploadItem);
  
  // Add test images
  imageNames.forEach((imageName) => {
    const item = document.createElement('div');
    item.className = 'test-image-item';
    item.dataset.imageName = imageName;
    
    const img = document.createElement('img');
    const dataUrl = testImages[imageName as keyof typeof testImages];
    img.src = dataUrl;
    img.alt = imageName;
    
    const label = document.createElement('div');
    label.textContent = imageName.replace('.png', '');
    
    item.appendChild(img);
    item.appendChild(label);
    
    // Click to select/deselect
    item.addEventListener('click', () => {
      selectionManager.toggleSelection(imageName);
      item.classList.toggle('selected', selectionManager.isSelected(imageName));
      updateSelectionInfo();
    });
    
    // Double click to process
    item.addEventListener('dblclick', async () => {
      await processTestImage(imageName, canvas, resultsDiv);
    });
    
    container.appendChild(item);
  });
  
  function updateSelectionInfo() {
    const selected = selectionManager.getSelectedImages();
    const info = document.querySelector('.selection-info') as HTMLSpanElement;
    if (info) {
      info.textContent = selected.length > 0 
        ? `${selected.length} image${selected.length > 1 ? 's' : ''} selected`
        : '';
    }
  }
  
  // Initial update
  updateSelectionInfo();
}

async function processTestImage(
  imageName: string,
  canvas: HTMLCanvasElement,
  resultsDiv: HTMLDivElement
) {
  try {
    resultsDiv.innerHTML = '<p class="loading">Processing image...</p>';
    
    const dataUrl = testImages[imageName as keyof typeof testImages];
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], imageName, { type: 'image/svg+xml' });
    
    await processImage(file, canvas, resultsDiv);
  } catch (error) {
    resultsDiv.innerHTML = `<p class="error">Error loading test image: ${error}</p>`;
    console.error('Test image processing error:', error);
  }
}

function addDebugToggle() {
  let isDebugEnabled = false;
  const debugToggle = document.createElement('button');
  debugToggle.id = 'debugToggle';
  debugToggle.textContent = '🔍 Enable Debug';
  debugToggle.className = 'debug-toggle';
  debugToggle.addEventListener('click', () => {
    if (isDebugEnabled) {
      detector.disableDebug();
      debugToggle.textContent = '🔍 Enable Debug';
      debugToggle.classList.remove('active');
      isDebugEnabled = false;
    } else {
      detector.enableDebug();
      debugToggle.textContent = '🔍 Disable Debug';
      debugToggle.classList.add('active');
      isDebugEnabled = true;
    }
  });
  
  const evaluationSection = document.querySelector('.evaluation-section');
  if (evaluationSection) {
    evaluationSection.appendChild(debugToggle);
  }
}

