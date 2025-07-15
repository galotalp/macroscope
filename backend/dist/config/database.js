"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.isDemoMode = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Check if we have Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
exports.isDemoMode = !supabaseUrl || !supabaseKey;
// Initialize Supabase client only if we have credentials
exports.supabase = exports.isDemoMode ? null : (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
console.log(exports.isDemoMode ?
    '🔧 Running in demo mode - no Supabase credentials found' :
    '🗄️  Connected to Supabase database');
//# sourceMappingURL=database.js.map