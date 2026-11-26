// Preserved extension stock: 16 own Sumdokus, 54 book variants, 3 own pyramids.
// Data, models and historical IDs remain available to restore saved records.
import {sumdokuType} from './sumdoku-view.js?v=0.14.0-release-2';
import {kenkenType} from './kenken-view.js?v=0.14.0-release-4';
import {numberLogicTypes} from './number-logic-view.js?v=0.14.0-release-2';
import {polyType,mazeType} from './geometry-logic-view.js?v=0.14.0-release-2';
export const extensionTypes=[sumdokuType,...numberLogicTypes.slice(0,3),polyType,...numberLogicTypes.slice(3,6),mazeType,numberLogicTypes[6],kenkenType];
