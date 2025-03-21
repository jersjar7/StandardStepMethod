import { ChannelParams, FlowDepthPoint } from '../features/calculator/types';

/**
 * Service for exporting calculation results in various formats
 */
export class ExportService {
  /**
   * Export calculation results to CSV format
   * @param results Calculation results
   * @param params Channel parameters
   * @returns CSV string
   */
  static exportToCSV(results: FlowDepthPoint[], _params: ChannelParams): string {
    // Create header row
    const headers = [
      'Station (m)',
      'Depth (m)',
      'Velocity (m/s)',
      'Top Width (m)',
      'Energy (m)',
      'Froude Number',
      'Critical Depth (m)',
      'Normal Depth (m)'
    ];
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    // Add result rows
    results.forEach(result => {
      const row = [
        result.x.toFixed(2),                    // Station
        result.y.toFixed(3),                    // Depth
        result.velocity.toFixed(3),             // Velocity
        (result.topWidth || 0).toFixed(3),      // Top Width
        result.specificEnergy.toFixed(3),       // Energy
        result.froudeNumber.toFixed(3),         // Froude Number
        result.criticalDepth.toFixed(3),        // Critical Depth
        result.normalDepth.toFixed(3)           // Normal Depth
      ];
      
      csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
  }
  
  /**
   * Create a download of the CSV file
   * @param csvContent CSV content as string
   * @param filename Filename for the download
   */
  static downloadCSV(csvContent: string, filename: string = 'water-surface-profile.csv'): void {
    // Create a blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Add link to document, trigger download, then remove link
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  /**
   * Export calculation results to JSON format
   * @param results Calculation results
   * @param params Channel parameters
   * @returns JSON string
   */
  static exportToJSON(results: FlowDepthPoint[], params: ChannelParams): string {
    const exportData = {
      channelParams: params,
      results: results.map(point => ({
        station: point.x,
        depth: point.y,
        velocity: point.velocity,
        froudeNumber: point.froudeNumber,
        specificEnergy: point.specificEnergy,
        criticalDepth: point.criticalDepth,
        normalDepth: point.normalDepth,
        topWidth: point.topWidth || 0
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * Create a download of the JSON file
   * @param jsonContent JSON content as string
   * @param filename Filename for the download
   */
  static downloadJSON(jsonContent: string, filename: string = 'water-surface-profile.json'): void {
    // Create a blob with the JSON content
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    
    // Create a download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Add link to document, trigger download, then remove link
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  /**
   * Generate a summary report of the calculation
   * @param results Calculation results
   * @param params Channel parameters
   * @returns HTML string with the report
   */
  static generateReport(results: FlowDepthPoint[], params: ChannelParams): string {
    // Extract key results
    const criticalDepth = results[0].criticalDepth;
    const normalDepth = results[0].normalDepth;
    const channelType = normalDepth > criticalDepth ? 'Mild Slope' : 
                         normalDepth < criticalDepth ? 'Steep Slope' : 'Critical Slope';
    
    // Calculate statistics
    const minDepth = Math.min(...results.map(r => r.y));
    const maxDepth = Math.max(...results.map(r => r.y));
    const minVelocity = Math.min(...results.map(r => r.velocity));
    const maxVelocity = Math.max(...results.map(r => r.velocity));
    const minFroude = Math.min(...results.map(r => r.froudeNumber));
    const maxFroude = Math.max(...results.map(r => r.froudeNumber));
    
    // Create HTML report
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Water Surface Profile Calculation Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { color: #0284c7; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; }
          .summary-item { flex: 1; min-width: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .summary-title { font-weight: bold; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <h1>Water Surface Profile Calculation Report</h1>
        
        <h2>Channel Parameters</h2>
        <table>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Channel Type</td>
            <td>${params.channelType}</td>
          </tr>
          <tr>
            <td>Bottom Width</td>
            <td>${params.bottomWidth} m</td>
          </tr>
          ${params.sideSlope ? `<tr>
            <td>Side Slope (H:V)</td>
            <td>${params.sideSlope}</td>
          </tr>` : ''}
          <tr>
            <td>Manning's Roughness</td>
            <td>${params.manningN}</td>
          </tr>
          <tr>
            <td>Channel Slope</td>
            <td>${params.channelSlope}</td>
          </tr>
          <tr>
            <td>Discharge</td>
            <td>${params.discharge} m³/s</td>
          </tr>
          <tr>
            <td>Channel Length</td>
            <td>${params.length} m</td>
          </tr>
        </table>
        
        <h2>Results Summary</h2>
        <div class="summary">
          <div class="summary-item">
            <div class="summary-title">Channel Classification</div>
            <div>${channelType}</div>
          </div>
          <div class="summary-item">
            <div class="summary-title">Critical Depth</div>
            <div>${criticalDepth.toFixed(3)} m</div>
          </div>
          <div class="summary-item">
            <div class="summary-title">Normal Depth</div>
            <div>${normalDepth.toFixed(3)} m</div>
          </div>
          <div class="summary-item">
            <div class="summary-title">Flow Regime</div>
            <div>${minFroude < 1 && maxFroude < 1 ? 'Subcritical' : 
                  minFroude > 1 && maxFroude > 1 ? 'Supercritical' : 
                  'Mixed Flow'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-title">Depth Range</div>
            <div>${minDepth.toFixed(3)} - ${maxDepth.toFixed(3)} m</div>
          </div>
          <div class="summary-item">
            <div class="summary-title">Velocity Range</div>
            <div>${minVelocity.toFixed(3)} - ${maxVelocity.toFixed(3)} m/s</div>
          </div>
        </div>
        
        <h2>Detailed Results</h2>
        <table>
          <tr>
            <th>Station (m)</th>
            <th>Depth (m)</th>
            <th>Velocity (m/s)</th>
            <th>Froude Number</th>
            <th>Energy (m)</th>
            <th>Top Width (m)</th>
          </tr>
          ${results.filter((_, i) => i % 5 === 0).map(point => `
            <tr>
              <td>${point.x.toFixed(2)}</td>
              <td>${point.y.toFixed(3)}</td>
              <td>${point.velocity.toFixed(3)}</td>
              <td>${point.froudeNumber.toFixed(3)}</td>
              <td>${point.specificEnergy.toFixed(3)}</td>
              <td>${(point.topWidth || 0).toFixed(3)}</td>
            </tr>
          `).join('')}
        </table>
        
        <p>Report generated on ${new Date().toLocaleString()}</p>
      </body>
      </html>
    `;
  }
  
  /**
   * Create a download of the HTML report
   * @param htmlContent HTML content as string
   * @param filename Filename for the download
   */
  static downloadReport(htmlContent: string, filename: string = 'water-surface-profile-report.html'): void {
    // Create a blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    
    // Create a download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Add link to document, trigger download, then remove link
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}