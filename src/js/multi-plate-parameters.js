// Multi-Plate 4PL Parameters
// Each plate has its own calibration curve - this is standard MSD practice

export const PLATE_PARAMETERS = {
  'Plate_2BOANACS77': {
    name: '2BOANACS77',
    description: 'Training Plate (E3 P4)',
    cytokines: {
      'GM-CSF': { Top: 2905098, Bottom: 108.9687, MidPoint: 2356.392, HillSlope: 0.998426 },
      'IFN-γ': { Top: 592000000, Bottom: 154.7288, MidPoint: 9062275, HillSlope: 1.014541 },
      'IL-10': { Top: 1686965, Bottom: 121.6305, MidPoint: 1978.757, HillSlope: 0.975056 },
      'IL-1β': { Top: 4328971, Bottom: 176.4038, MidPoint: 4958.583, HillSlope: 0.97629 },
      'IL-2': { Top: 173000000, Bottom: 170.6768, MidPoint: 667294.5, HillSlope: 1.015529 },
      'IL-4': { Top: 4213744, Bottom: 93.20236, MidPoint: 1537.592, HillSlope: 0.987318 },
      'IL-5': { Top: 5666698, Bottom: 138.8998, MidPoint: 11912.52, HillSlope: 0.982633 },
      'IL-6': { Top: 154000000, Bottom: 150.2258, MidPoint: 182734.8, HillSlope: 1.069812 },
      'MCP-1': { Top: 1488603, Bottom: 127.2709, MidPoint: 1848.83, HillSlope: 1.105226 },
      'TNF-α': { Top: 6051234, Bottom: 187.0038, MidPoint: 6841.159, HillSlope: 1.01245 }
    }
  },
  'Plate_E3P6': {
    name: 'E3 P6',
    description: 'Validation Plate',
    cytokines: {
      'GM-CSF': { Top: 2872985, Bottom: 111.8709, MidPoint: 2272.195, HillSlope: 1.006125 },
      'IFN-γ': { Top: 782000000, Bottom: 152.4633, MidPoint: 11000000, HillSlope: 1.020429 },
      'IL-10': { Top: 1722572, Bottom: 112.3031, MidPoint: 1879.847, HillSlope: 0.984193 },
      'IL-1β': { Top: 4297377, Bottom: 183.074, MidPoint: 4882.571, HillSlope: 0.979152 },
      'IL-2': { Top: 86800000, Bottom: 148.676, MidPoint: 327051.2, HillSlope: 1.011874 },
      'IL-4': { Top: 3451522, Bottom: 92.66713, MidPoint: 1137.36, HillSlope: 1.000719 },
      'IL-5': { Top: 5371094, Bottom: 161.4381, MidPoint: 10834.29, HillSlope: 0.988987 },
      'IL-6': { Top: 154000000, Bottom: 150.2258, MidPoint: 182734.8, HillSlope: 1.069812 },
      'MCP-1': { Top: 1597547, Bottom: 152.3343, MidPoint: 1852.515, HillSlope: 1.117328 },
      'TNF-α': { Top: 6002699, Bottom: 220.8896, MidPoint: 6743.01, HillSlope: 1.011124 }
    }
  }
};

// Helper function to calculate concentration using 4PL inverse
export function calculate4PLConcentration(signal, params) {
  const { Top, Bottom, MidPoint, HillSlope } = params;
  
  if (!isFinite(signal) || signal <= 0) return null;
  if (signal <= Bottom) return 0; // Below bottom asymptote
  if (signal >= Top) return null; // At or above top asymptote
  
  const numerator = (Top - Bottom) / (signal - Bottom) - 1;
  if (numerator <= 0) return null;
  
  const exponent = 1 / HillSlope;
  const ratio = Math.pow(numerator, exponent);
  const concentration = MidPoint / ratio;
  
  if (!isFinite(concentration) || concentration < 0) return null;
  
  return concentration;
}

// Auto-detect which plate best fits the standard curve data
export function detectPlateFromStandards(cytokine, standardPoints) {
  // standardPoints = [{concentration, signal}, ...]
  const filteredPoints = standardPoints.filter(p => p.concentration > 0 && p.signal > 0);
  
  if (filteredPoints.length < 3) {
    console.warn('Not enough standard points for plate detection');
    return null;
  }
  
  let bestPlate = null;
  let bestError = Infinity;
  
  for (const [plateId, plateData] of Object.entries(PLATE_PARAMETERS)) {
    const params = plateData.cytokines[cytokine];
    if (!params) continue;
    
    let totalError = 0;
    let count = 0;
    
    for (const point of filteredPoints) {
      const calcConc = calculate4PLConcentration(point.signal, params);
      if (calcConc !== null && calcConc > 0) {
        const error = Math.abs((calcConc - point.concentration) / point.concentration);
        totalError += error;
        count++;
      }
    }
    
    if (count > 0) {
      const avgError = totalError / count;
      if (avgError < bestError) {
        bestError = avgError;
        bestPlate = plateId;
      }
    }
  }
  
  return {
    plateId: bestPlate,
    plateName: bestPlate ? PLATE_PARAMETERS[bestPlate].name : null,
    error: bestError
  };
}

// Get parameters for a specific plate and cytokine
export function getPlateParameters(plateId, cytokine) {
  const plate = PLATE_PARAMETERS[plateId];
  if (!plate) return null;
  return plate.cytokines[cytokine] || null;
}

// Get list of available plates
export function getAvailablePlates() {
  return Object.entries(PLATE_PARAMETERS).map(([id, data]) => ({
    id,
    name: data.name,
    description: data.description
  }));
}

